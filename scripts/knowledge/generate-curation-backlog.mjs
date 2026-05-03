import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, relative } from 'node:path';

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hashText(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function cleanBody(rawTitle, rawText) {
  const normalized = String(rawText || '').replace(/\r\n/g, '\n').trim();
  const lines = normalized.split('\n').map((line) => line.trim());

  while (lines[0] && normalizeKey(lines[0]) === normalizeKey(rawTitle)) {
    lines.shift();
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function summarizeBody(body) {
  const firstParagraph = body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find(Boolean);

  return firstParagraph ? firstParagraph.slice(0, 240) : null;
}

function walkArticleDirs(root, results = []) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (!entry.isDirectory()) {
      continue;
    }

    if (existsSync(join(full, 'article.json'))) {
      results.push(full);
      continue;
    }

    walkArticleDirs(full, results);
  }

  return results;
}

function detectFlags(row) {
  const text = [
    row.title,
    row.rootCategory,
    row.sectionCategory,
    row.body,
  ]
    .filter(Boolean)
    .join('\n');
  const normalized = normalizeKey(text);
  const flags = [];
  const tests = [
    ['integracoes', /(integrac|api|shopify|vtex|tray|nuvemshop|webhook|token|app key|endpoint|hub|erp|bling|linx|oracle|tiny)/],
    ['credenciais', /(senha|token|secret|credencial|oauth|bearer|appkey|apptoken|chave)/],
    ['permissoes', /(permiss|acesso|usuario|perfil|admin|autoriz)/],
    ['estorno', /(estorno|reembolso|cancelamento financeiro)/],
    ['pix', /\bpix\b/],
    ['correios', /correios|sro|etiqueta|sigep/],
    ['endpoints_api', /(endpoint|api|webservice|payload|callback|request|response)/],
    ['erros_internos', /(erro|falha|interno|timeout|stack|log|debug|exception|nao autorizado|autorizacao)/],
  ];

  for (const [name, pattern] of tests) {
    if (pattern.test(normalized)) {
      flags.push(name);
    }
  }

  return flags;
}

function classifyRow(row) {
  const title = normalizeKey(row.title);
  const reasons = [];
  let suggested = 'internal';

  if (row.duplicateCount > 1) {
    suggested = 'duplicate';
    reasons.push('source_hash duplicado com outro artigo do corpus');
  }

  if (
    /octadesk|atualizar os dados de integra|valor manual para estorno automatico/.test(
      title,
    )
  ) {
    if (suggested !== 'duplicate') {
      suggested = 'obsolete';
    }
    reasons.push('sinal de naming ou fluxo legado com chance alta de obsolescencia');
  }

  if (suggested === 'internal' && row.flags.length === 0) {
    suggested = 'public';
    reasons.push('sem sinal heuristico de segredo, integracao ou troubleshooting interno');
  }

  if (
    ['credenciais', 'pix', 'correios', 'endpoints_api'].some((flag) =>
      row.flags.includes(flag),
    )
  ) {
    if (suggested !== 'duplicate' && suggested !== 'obsolete') {
      suggested = 'restricted';
    }
    reasons.push(`contem sinal sensivel: ${row.flags.join(', ')}`);
  } else if (suggested === 'internal' && row.flags.length > 0) {
    reasons.push(`exige reescrita e revisao humana: ${row.flags.join(', ')}`);
  }

  if (reasons.length === 0) {
    reasons.push('mantido interno por conservadorismo editorial');
  }

  const action =
    suggested === 'public'
      ? 'reescrever em padrao B2B tecnico e enviar para review'
      : suggested === 'internal'
        ? 'manter em draft e reescrever antes de qualquer exposicao'
        : suggested === 'restricted'
          ? 'manter restrito e revisar com produto/engenharia antes de qualquer uso'
          : suggested === 'obsolete'
            ? 'revalidar com operacao e considerar arquivamento editorial'
            : 'consolidar com artigo canonico e arquivar duplicado';

  const suggestedVisibility =
    suggested === 'public'
      ? 'public'
      : suggested === 'internal' || suggested === 'obsolete'
        ? 'internal'
        : 'restricted';

  return {
    ...row,
    suggestedVisibility,
    suggestedClassification: suggested,
    classificationReason: reasons.join('; '),
    reviewStatus: 'pending',
    recommendedAction: action,
    duplicateGroupKey: row.duplicateCount > 1 ? row.sourceHash : null,
  };
}

function buildRows(root) {
  const rows = walkArticleDirs(root).map((dir) => {
    const article = JSON.parse(readFileSync(join(dir, 'article.json'), 'utf8'));
    const rawContent = existsSync(join(dir, 'content.txt'))
      ? readFileSync(join(dir, 'content.txt'), 'utf8')
      : article.plainText || '';
    const body = cleanBody(article.title, rawContent);

    return {
      sourcePath: relative(process.cwd(), dir).replace(/\\/g, '/'),
      sourceHash: hashText(rawContent.trim()),
      title: article.title,
      rootCategory: article.categoryTitle || 'Sem categoria',
      sectionCategory: article.sectionTitle || null,
      summary: summarizeBody(body),
      articleUrl: article.url || basename(dir),
      body,
    };
  });

  const duplicateCounts = new Map();
  for (const row of rows) {
    duplicateCounts.set(row.sourceHash, (duplicateCounts.get(row.sourceHash) ?? 0) + 1);
  }

  return rows.map((row) =>
    classifyRow({
      ...row,
      duplicateCount: duplicateCounts.get(row.sourceHash) ?? 1,
      flags: detectFlags(row),
    }),
  );
}

function writeBacklog(rows, outputPath) {
  const groups = {
    public: rows.filter((row) => row.suggestedClassification === 'public').length,
    internal: rows.filter((row) => row.suggestedClassification === 'internal').length,
    restricted: rows.filter((row) => row.suggestedClassification === 'restricted').length,
    obsolete: rows.filter((row) => row.suggestedClassification === 'obsolete').length,
    duplicate: rows.filter((row) => row.suggestedClassification === 'duplicate').length,
  };

  const lines = [
    '# KNOWLEDGE_LEGACY_CURATION_BACKLOG.md',
    '',
    '## Objetivo',
    'Transformar o corpus legado do Octadesk em backlog versionado de curadoria para operacao no Admin Console, sem publicar conteudo automaticamente.',
    '',
    '## Regras desta fase',
    '- backlog derivado do corpus bruto e do dry-run oficial do import',
    '- classificacao ainda e sugestao editorial inicial',
    '- nenhum item deste backlog implica publicacao automatica',
    '- status de revisao inicial de todos os itens: `pending`',
    '',
    '## Resumo',
    `- total de artigos: \`${rows.length}\``,
    `- sugeridos como \`public\`: \`${groups.public}\``,
    `- sugeridos como \`internal\`: \`${groups.internal}\``,
    `- sugeridos como \`restricted\`: \`${groups.restricted}\``,
    `- sugeridos como \`obsolete\`: \`${groups.obsolete}\``,
    `- sugeridos como \`duplicate\`: \`${groups.duplicate}\``,
    '',
    '## Itens',
    '',
  ];

  rows
    .slice()
    .sort((left, right) =>
      left.sourcePath.localeCompare(right.sourcePath, 'pt-BR'),
    )
    .forEach((row, index) => {
      const category = row.sectionCategory
        ? `${row.rootCategory} / ${row.sectionCategory}`
        : row.rootCategory;

      lines.push(`### ${index + 1}. ${row.title}`);
      lines.push(`- source_path: \`${row.sourcePath}\``);
      lines.push(`- source_hash: \`${row.sourceHash}\``);
      lines.push(`- titulo original: ${row.title}`);
      lines.push(`- categoria original: ${category}`);
      lines.push(`- classificacao sugerida: \`${row.suggestedClassification}\``);
      lines.push(`- motivo da classificacao: ${row.classificationReason}`);
      lines.push(`- status de revisao: \`${row.reviewStatus}\``);
      lines.push(`- acao recomendada: ${row.recommendedAction}`);
      lines.push('');
    });

  writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  const root = join(
    process.cwd(),
    'raw_knowledge',
    'octadesk_export',
    'latest',
    'articles',
  );
  const reportsRoot = join(process.cwd(), 'docs', 'reports');
  const backlogPath = join(reportsRoot, 'KNOWLEDGE_LEGACY_CURATION_BACKLOG.md');
  const backlogJsonPath = join(
    reportsRoot,
    'KNOWLEDGE_LEGACY_CURATION_BACKLOG.json',
  );
  const tempRoot = join(process.cwd(), '.tmp');
  const auditPath = join(tempRoot, 'knowledge-curation-audit.json');

  mkdirSync(reportsRoot, { recursive: true });
  mkdirSync(tempRoot, { recursive: true });

  const rows = buildRows(root);

  writeBacklog(rows, backlogPath);
  writeFileSync(
    backlogJsonPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total: rows.length,
        rows: rows.map((row) => ({
          sourcePath: row.sourcePath,
          sourceHash: row.sourceHash,
          title: row.title,
          rootCategory: row.rootCategory,
          sectionCategory: row.sectionCategory,
          summary: row.summary,
          articleUrl: row.articleUrl,
          suggestedVisibility: row.suggestedVisibility,
          suggestedClassification: row.suggestedClassification,
          classificationReason: row.classificationReason,
          riskFlags: row.flags,
          duplicateGroupKey: row.duplicateGroupKey,
          duplicateCount: row.duplicateCount,
          reviewStatus: row.reviewStatus,
          recommendedAction: row.recommendedAction,
        })),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  writeFileSync(
    auditPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total: rows.length,
        rows,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const summary = {
    backlogPath: relative(process.cwd(), backlogPath).replace(/\\/g, '/'),
    backlogJsonPath: relative(process.cwd(), backlogJsonPath).replace(/\\/g, '/'),
    auditPath: relative(process.cwd(), auditPath).replace(/\\/g, '/'),
    total: rows.length,
    public: rows.filter((row) => row.suggestedClassification === 'public').length,
    internal: rows.filter((row) => row.suggestedClassification === 'internal').length,
    restricted: rows.filter((row) => row.suggestedClassification === 'restricted').length,
    obsolete: rows.filter((row) => row.suggestedClassification === 'obsolete').length,
    duplicate: rows.filter((row) => row.suggestedClassification === 'duplicate').length,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
