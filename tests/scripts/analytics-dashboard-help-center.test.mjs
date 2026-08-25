import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const doc = fs.readFileSync(path.join(root, 'docs/ANALYTICS_DASHBOARD_HELP_CENTER_V1.md'), 'utf8');
const component = fs.readFileSync(path.join(root, 'apps/web/src/features/analytics/AnalyticsDashboardHelp.tsx'), 'utf8');

test('central documenta todas as superfícies do Dashboard', () => {
  for (const title of ['Visão Geral', 'Comercial', 'Suporte', 'Customer Success', 'Financeiro']) {
    assert.match(doc, new RegExp(`### ${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }
});

test('central registra campos HubSpot e fontes financeiras', () => {
  for (const field of ['pipeline', 'dealstage', 'amount_in_home_currency', 'hs_pipeline', 'hs_pipeline_stage', 'hs_ticket_priority', 'unidades_negocio_contratadas', 'dDtPagamento', 'nValAberto']) {
    assert.match(doc, new RegExp(`\\b${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`));
  }
});

test('central explica coortes, estados honestos e ausência operacional', () => {
  assert.match(doc, /posição atual/);
  assert.match(doc, /awaiting_history/);
  assert.match(doc, /indisponível/);
  assert.match(doc, /dimensão financeira explícita/);
});

test('central inclui recomendação de pertencimento multioperação sem escrita automática', () => {
  assert.match(doc, /mais de\s+uma unidade/);
  assert.match(doc, /task própria/);
  assert.match(doc, /não será criada, preenchida ou usada como\s+fonte efetiva/);
});

test('dashboard oferece acesso contextual à central sem alterar o menu global', () => {
  assert.match(component, /Central de Ajuda interna/);
  assert.match(component, /onClose/);
  assert.match(component, /aria-modal="true"/);
});

test('central gerencia foco inicial, Tab, Escape e restauração do foco', () => {
  assert.match(component, /requestAnimationFrame\(\(\) => closeButtonRef\.current\?\.focus\(\)\)/);
  assert.match(component, /event\.key !== 'Tab'/);
  assert.match(component, /event\.shiftKey/);
  assert.match(component, /previousActiveElement\.focus\(\)/);
  assert.match(component, /event\.key === 'Escape'/);
  assert.match(component, /data-analytics-help-dialog/);
});

test('documento de ajuda acompanha o estado do handoff', () => {
  assert.match(doc, /Status: `READY_FOR_REVIEW`/);
  assert.doesNotMatch(doc, /Status: `IMPLEMENTING`/);
});
