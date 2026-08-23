import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  createControlPlaneServer,
  parseQueueMarkdown,
  buildActivityTimeline,
  parseReview,
  readSnapshot,
  REPOSITORY_ROOT,
} from '../../tools/dev-control/server.mjs';
import {
  createQueueCardModel,
  formatWorktreeStatus,
  groupQueueItems,
  normalizeQueueItems,
  toCanonicalQueueState,
  UNRESOLVED_QUEUE_STATE,
} from '../../tools/dev-control/public/queue-state.js';

const readme = await readFile(new URL('../../handoffs/README.md', import.meta.url), 'utf8');

test('fila canônica expõe autorização, dependências e resumo estruturado', () => {
  const queue = parseQueueMarkdown(readme);
  const controlPlane = queue.find((item) => item.task_id === 'DEV-CONTROL-MVP');
  const r11 = queue.find((item) => item.task_id === 'R-11');
  const r14 = queue.find((item) => item.task_id === 'R-14');
  const backlogTask = queue.find((item) => item.task_id === 'CONTROL-PLANE-BACKLOG-2026-08-21');
  const operationScope = queue.find((item) => item.task_id === 'DATA-OPERATION-SCOPE-2026-08-21');

  assert.ok(controlPlane);
  assert.equal(controlPlane.project, 'ConfiOne / Engineering');
  assert.equal(controlPlane.priority, 'P0');
  assert.equal(controlPlane.approval, 'APPROVED');
  assert.equal(controlPlane.dependencies, 'R-03');
  assert.ok(controlPlane.origin);
  assert.ok(controlPlane.summary);
  assert.ok(r11);
  assert.equal(r11?.dependencies, 'DEV-CONTROL-MVP');
  assert.equal(r14?.dependencies, 'R-11');
  assert.equal(backlogTask?.approval, 'APPROVED');
  assert.equal(operationScope?.dependencies, 'CONTROL-PLANE-BACKLOG-2026-08-21');
  assert.ok(queue.some((item) => ['ACTIVE', 'READY', 'DONE'].includes(item.state)));

  // SEN-F05: a asserção anterior era um censo datado (`BACKLOG >= 10`) que
  // passou a falhar assim que a fila foi drenada — media o calendário, não o
  // parser. Trocada por invariantes estruturais, que continuam valendo com a
  // fila cheia ou vazia e são estritamente mais exigentes.
  const CANONICAL_QUEUE_STATES = new Set(['PROPOSED', 'BACKLOG', 'READY', 'ACTIVE', 'BLOCKED', 'DONE']);
  for (const item of queue) {
    assert.ok(item.task_id, 'toda linha da fila precisa de task_id');
    assert.ok(item.project, `linha ${item.task_id} sem project`);
    assert.ok(item.priority, `linha ${item.task_id} sem priority`);
    assert.ok(item.origin, `linha ${item.task_id} sem origin`);
    assert.ok(item.summary, `linha ${item.task_id} sem summary`);
    assert.ok(CANONICAL_QUEUE_STATES.has(item.state), `estado fora do contrato em ${item.task_id}: ${item.state}`);
  }
  assert.equal(new Set(queue.map((item) => item.task_id)).size, queue.length, 'task_id duplicado na fila');
  assert.ok(queue.filter((item) => item.state === 'ACTIVE').length <= 1, 'somente um item pode estar ACTIVE');
});

test('snapshot do control plane lê o checkout real e os handoffs correntes', async () => {
  const snapshot = await readSnapshot();
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPOSITORY_ROOT, encoding: 'utf8' }).trim();

  assert.equal(snapshot.project.name, 'ConfiOne');
  assert.equal(snapshot.project.head, head);
  assert.equal(typeof snapshot.current.status.task, 'string');
  assert.ok(snapshot.current.status.task.length > 0);
  if (snapshot.current.status.state === 'IDLE') {
    assert.equal(snapshot.current.status.task, 'IDLE');
  } else {
    assert.ok(snapshot.queue.some((item) => item.task_id === snapshot.current.status.task));
  }
  assert.ok(['IDLE', 'READY_FOR_IMPLEMENTATION', 'IMPLEMENTING', 'VALIDATING', 'READY_FOR_REVIEW', 'REVIEWING', 'CHANGES_REQUESTED', 'FIXING', 'APPROVED', 'FINALIZING_LOCAL', 'COMPLETED', 'BLOCKED', 'DONE'].includes(snapshot.current.status.state));
  assert.ok(['Forge', 'Sentinel', 'Codex', 'Claude', 'Ede'].includes(snapshot.current.status.owner));
  assert.equal(snapshot.agents.length, 3);
  assert.equal(snapshot.agents.find((agent) => agent.name === 'Sentinel')?.role, 'REVIEWER');
  assert.equal(snapshot.agents.find((agent) => agent.name === 'Forge')?.role, 'EXECUTOR');
  // SEN-F05: a asserção anterior fixava `Codex.observed === true`, ou seja,
  // congelava quem coordenava naquela semana. O invariante real é a coerência
  // entre o STATUS.md e a projeção de agentes, seja quem for o coordenador.
  const coordinator = snapshot.agents.find((agent) => agent.role === 'COORDENADOR');
  assert.ok(coordinator, 'o snapshot precisa projetar um coordenador');
  assert.equal(coordinator.observed, coordinator.name === snapshot.current.status.coordinator);
  assert.equal('documents' in snapshot.current, false);
  const serialized = JSON.stringify(snapshot);
  assert.doesNotMatch(serialized, /#\s+(TASK|IMPLEMENTATION|REVIEW|STATUS)\b/);
  assert.doesNotMatch(serialized, /(?:secret|token|credential)\s*[:=]/i);
  // SEN-F05: a asserção anterior fixava que
  // `ANALYTICS-METRIC-METHODOLOGY-2026-08-21` não tinha arquivo. Ela quebrou
  // silenciosamente quando a task foi arquivada, porque esta suíte não está em
  // nenhum gate em uso. O invariante durável é a procedência: só a task
  // corrente pode ser servida a partir de `handoffs/current/`, e um item sem
  // arquivo não pode inventar review, estado observado ou owner.
  const currentDetails = snapshot.taskDetails.filter((item) => item.isCurrent);
  assert.ok(currentDetails.length <= 1, 'no máximo uma task pode ser a corrente');
  for (const detail of snapshot.taskDetails) {
    if (detail.isCurrent) {
      assert.equal(detail.source, 'handoffs/current/');
      continue;
    }
    assert.notEqual(detail.source, 'handoffs/current/');
    assert.equal(detail.gates, null, `${detail.task_id} não pode declarar gates fora do handoff corrente`);
    if (detail.source === 'handoffs/README.md') {
      assert.equal(detail.review, null, `${detail.task_id} sem arquivo não pode ter review`);
      assert.equal(detail.observedState, null, `${detail.task_id} sem arquivo não pode ter estado observado`);
      assert.equal(detail.owner, null, `${detail.task_id} sem arquivo não pode ter owner`);
    } else {
      assert.match(detail.source, /^handoffs\/archive\//, `procedência inesperada em ${detail.task_id}`);
    }
  }
  assert.ok(snapshot.queue.some((item) => item.task_id === 'R-03' && item.state === 'DONE'));
  const r03 = snapshot.archives.find((item) => item.archive === 'R03-SUPPORT-ERROR-FEEDBACK-2026-08-20');
  assert.ok(r03);
  assert.match(r03.título, /feedback/i);
  assert.equal(r03.state, 'APPROVED');
  const r01 = snapshot.archives.find((item) => item.archive === 'R01-ACCESS-DENIAL-2026-08-20');
  assert.equal(r01?.review.result, 'APPROVED');
  assert.equal(snapshot.current.gates.source, 'handoffs/current/IMPLEMENTATION.md — declarado pelo Codex');
  assert.ok(Array.isArray(snapshot.current.gates.results));
  assert.equal(snapshot.project.gitAvailable, true);
  assert.ok(Array.isArray(snapshot.decisions));
  assert.ok(snapshot.activity.some((event) => event.source === 'Git'));
  assert.ok(snapshot.activity.some((event) => event.source === 'Handoff corrente'));
  const activeCount = snapshot.queue.filter((item) => ['ACTIVE', 'READY'].includes(item.state)).length;
  assert.ok(activeCount <= 1);
  if (snapshot.current.status.state !== 'IDLE') assert.equal(activeCount, 1);
});

test('Kanban preserva item com estado ausente em coluna explícita', () => {
  const normalized = normalizeQueueItems([
    { task_id: 'SEM-ESTADO', state: '', approval: 'APPROVED' },
  ], 'OUTRA-TASK', 'Claude');

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].state, UNRESOLVED_QUEUE_STATE);
  assert.ok(normalized.some((item) => item.state === UNRESOLVED_QUEUE_STATE));
});

test('fila visual normaliza estados canônicos sem perder o estado bruto', () => {
  assert.equal(toCanonicalQueueState('PROPOSED'), 'BACKLOG');
  assert.equal(toCanonicalQueueState('ACTIVE'), 'IMPLEMENTING');
  assert.equal(toCanonicalQueueState('READY_FOR_IMPLEMENTATION'), 'READY');
  assert.equal(toCanonicalQueueState('READY_FOR_REVIEW'), 'READY_FOR_REVIEW');
  assert.equal(toCanonicalQueueState('estado_novo'), 'UNRESOLVED');

  const normalized = normalizeQueueItems([
    { task_id: 'CURRENT', state: 'READY' },
    { task_id: 'LEGACY', state: 'ACTIVE' },
  ], 'CURRENT', 'Forge', 'READY_FOR_IMPLEMENTATION');

  assert.equal(normalized[0].state, 'READY');
  assert.equal(normalized[0].canonicalState, 'READY');
  assert.equal(normalized[1].state, 'ACTIVE');
  assert.equal(normalized[1].canonicalState, 'IMPLEMENTING');
});

test('parseReview reconhece CHANGES_REQUESTED, REQUEST_CHANGES e findings', () => {
  const canonical = parseReview(`- Veredito: CHANGES_REQUESTED\n\n### F-001 — MEDIUM\n\n### F-002 — LOW — RESOLVED`);
  const legacy = parseReview(`Result: REQUEST_CHANGES\n\n### F-003 — HIGH`);

  assert.equal(canonical.result, 'CHANGES_REQUESTED');
  assert.deepEqual(canonical.openFindings, ['F-001 — MEDIUM']);
  assert.deepEqual(canonical.resolvedFindings, ['F-002 — LOW — RESOLVED']);
  assert.equal(legacy.result, 'REQUEST_CHANGES');
  assert.deepEqual(legacy.openFindings, ['F-003 — HIGH']);
});

test('Kanban mantém BLOCKED e absorve estados futuros sem perder a contagem', () => {
  const columns = [
    ['ACTIVE', 'Codex'],
    ['BLOCKED', 'Bloqueado'],
    ['UNRESOLVED', 'Estado indisponível'],
  ];
  const normalized = normalizeQueueItems([
    { task_id: 'ITEM-ATIVO', state: 'ACTIVE' },
    { task_id: 'ITEM-BLOQUEADO', state: 'BLOCKED' },
    { task_id: 'ITEM-FUTURO', state: 'FUTURE_STATE' },
  ], 'ITEM-ATIVO', 'Codex');
  const grouped = groupQueueItems(normalized, columns);
  const renderedCount = Object.values(grouped).reduce((total, items) => total + items.length, 0);

  assert.equal(grouped.BLOCKED[0].task_id, 'ITEM-BLOQUEADO');
  assert.equal(grouped.UNRESOLVED[0].task_id, 'ITEM-FUTURO');
  assert.equal(renderedCount, normalized.length);
});

test('cards preservam o estado cru, a origem e o worktree indisponível', () => {
  const card = createQueueCardModel({
    task_id: 'ITEM-FUTURO',
    state: 'FUTURE_STATE',
    origin: 'Owner queue 2026-08-20',
  });
  const unavailable = formatWorktreeStatus(false, null);
  const clean = formatWorktreeStatus(true, 0);

  assert.equal(card.state, 'FUTURE_STATE');
  assert.equal(card.origin, 'Owner queue 2026-08-20');
  assert.deepEqual(unavailable, { value: 'Indisponível', helper: 'estado do Git desconhecido' });
  assert.deepEqual(clean, { value: '0', helper: 'limpo' });
});

test('timeline combina commits, handoffs correntes, reviews e arquivos arquivados', () => {
  const timeline = buildActivityTimeline(
    [{ subject: 'commit real', sha: 'abc123', date: '2026-08-18T12:00:00-03:00' }],
    [{
      id: 'ARCHIVED-TASK',
      state: 'APPROVED',
      current_sha: 'def456',
      last_review: '2026-08-19 — APPROVED',
      review: { result: 'APPROVED' },
    }],
    {
      status: {
        task: 'CURRENT-TASK',
        state: 'READY_FOR_REVIEW',
        current_sha: 'UNCOMMITTED_WORKTREE',
        updated_at: '2026-08-20',
        last_review: '2026-08-20 — REQUEST_CHANGES',
      },
      review: { result: 'REQUEST_CHANGES' },
    },
  );

  assert.deepEqual(new Set(timeline.map((event) => event.source)), new Set([
    'Git',
    'Review arquivado',
    'Handoff arquivado',
    'Handoff corrente',
    'Review corrente',
  ]));
  assert.equal(timeline[0].subject, 'CURRENT-TASK: READY_FOR_REVIEW');
  assert.equal(timeline.some((event) => event.subject === 'CURRENT-TASK: REQUEST_CHANGES'), true);
  assert.equal(timeline.some((event) => event.subject === 'ARCHIVED-TASK: APPROVED'), true);
});

test('servidor é read-only e expõe somente snapshot GET', async () => {
  const server = createControlPlaneServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const snapshotResponse = await fetch(`${baseUrl}/api/snapshot`);
    assert.equal(snapshotResponse.status, 200);
    assert.equal(snapshotResponse.headers.get('content-type'), 'application/json; charset=utf-8');

    const writeResponse = await fetch(`${baseUrl}/api/snapshot`, { method: 'POST', body: '{}' });
    assert.equal(writeResponse.status, 405);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('control plane permanece isolado do produto e não contém escrita de arquivo', async () => {
  const [serverSource, pageSource, appSource] = await Promise.all([
    readFile(new URL('../../tools/dev-control/server.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../tools/dev-control/public/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../tools/dev-control/public/app.js', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(serverSource, /writeFile|appendFile|rmSync|unlink/);
  assert.doesNotMatch(pageSource, /apps\/web|release-surface|supabase/i);
  assert.doesNotMatch(appSource, /555\/555/);
  assert.match(appSource, /UNRESOLVED/);
});
