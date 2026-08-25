import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const report = await readFile(
  new URL('../../docs/reports/ANALYTICS_COMMERCIAL_MEETINGS_PREDICTION_CONTRACT_2026-08-25.md', import.meta.url),
  'utf8',
);

test('relatório mantém reuniões e Predição fail-closed sem contrato publicado', () => {
  assert.match(report, /MEETING_EVENT/);
  assert.match(report, /hs_meeting_outcome/);
  assert.match(report, /NÃO COMPROVADO/);
  assert.match(report, /NÃO CONSTRUIR UI AINDA/);
  assert.match(report, /Nenhuma escrita no HubSpot/);
});

test('relatório separa coortes e exige cálculo backend', () => {
  assert.match(report, /taxa_de_conversao/);
  assert.match(report, /lead_time/);
  assert.match(report, /observed_at/);
  assert.match(report, /não calcular no frontend/);
});
