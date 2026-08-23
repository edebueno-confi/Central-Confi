// Contrato de apresentação dos KPIs do Dashboard.
//
// Este módulo é a única fronteira entre os códigos técnicos devolvidos pelo
// backend e a linguagem gerencial exibida na tela. Nenhum nome de propriedade
// do HubSpot, endpoint do OMIE, identificador interno, payload ou mensagem
// crua de API pode atravessar daqui para a interface.
//
// Ele também garante a regra de produto mais importante do Dashboard: ausência
// de fonte nunca vira zero. Um KPI sem dado confiável é apresentado como
// "Indisponível", "Aguardando histórico" ou "Dados parciais".

const KPI_STATES = new Set(['available', 'partial', 'unavailable', 'awaiting_history']);

/** Texto exibido no lugar do número quando o KPI não tem valor confiável. */
const STATE_PLACEHOLDERS = {
  unavailable: 'Indisponível',
  awaiting_history: 'Aguardando histórico',
};

/**
 * Tradução dos códigos de limitação para linguagem de negócio.
 * Cada frase explica o efeito para o gestor, não a causa técnica.
 */
const REASON_MESSAGES = {
  mrr_source_unresolved:
    'A fonte oficial de receita recorrente ainda não foi definida pela operação.',
  active_customer_rule_unresolved:
    'A regra que define cliente ativo ainda não foi definida pela operação.',
  mrr_partial_coverage:
    'Parte dos clientes ativos ainda não tem receita recorrente registrada.',
  missing_hubspot_omie_mapping:
    'Nem todos os clientes têm cadastro financeiro correspondente, então o valor cobre apenas parte da carteira.',
  omie_customer_identity_missing:
    'Há títulos financeiros sem identificação de cliente suficiente para vinculá-los com segurança à carteira.',
  ticket_close_date_missing:
    'Os atendimentos encerrados não registram a data de encerramento na origem, então não é possível medir o que foi resolvido no período.',
  ticket_history_partial:
    'O histórico dos atendimentos ainda está sendo reconstruído, então este número cobre parte do período.',
  ticket_close_date_partial:
    'Parte dos atendimentos encerrados ainda não tem data de encerramento carregada, então este número cobre parte do período.',
  ticket_first_response_missing:
    'O tempo de primeira resposta não é registrado na origem dos atendimentos.',
  first_response_partial:
    'Nem todos os atendimentos registram o tempo de primeira resposta, então este número cobre parte da base.',
  activity_partial:
    'Parte dos clientes ainda não tem a última interação registrada, então este número cobre parte da carteira.',
  associations_missing:
    'Os atendimentos ainda não estão vinculados às empresas, então não é possível cruzar suporte com carteira.',
  associations_partial:
    'O vínculo entre atendimentos e empresas ainda está sendo carregado, então este número cobre parte da base.',
  activity_dates_missing:
    'A data da última interação com o cliente não é registrada na origem.',
  history_insufficient:
    'Ainda não há histórico suficiente. O acompanhamento começa a partir das medições diárias já iniciadas.',
  // Motivos que dependem de decisão humana, e não de dado que falta. A frase
  // precisa dizer o que fazer, porque aqui existe alguém que pode resolver.
  queue_role_unclassified:
    'Nenhum pipeline teve o papel definido ainda. Enquanto isso, a fila conta todos eles. Defina em Configurações, Governança de dados.',
  ticket_last_activity_missing:
    'Os atendimentos não registram a data da última movimentação, então não é possível separar o que está andando do que está parado.',
  ticket_last_activity_partial:
    'Parte dos atendimentos ainda não tem a data da última movimentação carregada, então este número cobre parte da fila.',
  sla_unavailable: 'Nenhum atendimento do recorte tem prazo acordado registrado.',
  sla_partial_coverage:
    'Apenas parte dos atendimentos tem prazo acordado registrado.',
  stage_probability_missing:
    'As etapas do funil não têm probabilidade definida, então não é possível ponderar o valor.',
  stage_probability_partial:
    'Algumas etapas do funil não têm probabilidade definida, então o valor ponderado cobre parte do funil.',
  no_closed_deals_in_period:
    'Nenhuma negociação foi encerrada no período selecionado.',
  no_data_in_period: 'Não há registros no período selecionado.',
  weighted_pipeline_partial_coverage:
    'O valor ponderado do funil cobre apenas parte das negociações em aberto.',
  reopen_source_missing:
    'A origem não registra reaberturas suficientes para medir essa taxa com segurança.',
  reopen_source_partial:
    'Parte das reaberturas ainda não foi carregada, então a taxa cobre apenas parte da base.',
  cnpj_exato:
    'Candidato encontrado por cadastro fiscal exato; o vínculo ainda depende de confirmação humana.',
  identidade_exata:
    'Candidato encontrado por identidade exata; a decisão permanece registrada para revisão humana.',
  identidade_similar:
    'Candidato encontrado por identidade semelhante; não há aplicação automática do vínculo.',
  confirmada:
    'Vínculo confirmado por decisão humana e preservado no histórico de auditoria.',
  operation_dimension_unavailable:
    'Este recorte de operação ainda não possui dimensão publicada para este domínio; o painel não atribui o consolidado a uma operação.',
  // V-02: este código existia sem tradução e caía no aviso genérico, que
  // afirmava uma limitação de origem inexistente. Falha de carregamento é
  // transitória e tem ação — não é característica do dado.
  operation_load_unavailable:
    'Não foi possível carregar este indicador para a operação selecionada. Atualize para tentar de novo.',
};

/**
 * Aviso para um código de motivo que este painel ainda não sabe traduzir.
 * Nunca vaza o código cru e nunca inventa a causa.
 *
 * V-01: a versão anterior dizia "limitação de origem registrada pela equipe
 * responsável", afirmando um fato que o painel não tem como conhecer. Quando a
 * origem publicava o dado normalmente e a falha era do carregamento, a tela
 * atribuía o problema à equipe de dados e não oferecia nenhuma ação.
 */
const UNKNOWN_REASON_MESSAGE =
  'A origem informou uma ressalva que este painel ainda não sabe traduzir.';

/**
 * Usado quando o indicador nem sequer veio no payload. O painel não sabe se a
 * origem não publica ou se a leitura falhou, então não afirma nenhuma das duas.
 */
const MISSING_ENTRY_MESSAGE =
  'Não foi possível confirmar este indicador nesta leitura. Atualize para tentar de novo.';

/**
 * Lê uma entrada de KPI do payload, normalizando qualquer formato inesperado
 * para o contrato conhecido. Um payload malformado vira "Indisponível", nunca
 * um número inventado.
 */
export function readKpi(payload, key) {
  const kpis = payload && typeof payload === 'object' ? payload.kpis : null;
  const raw = kpis && typeof kpis === 'object' ? kpis[key] : null;
  if (!raw || typeof raw !== 'object') {
    return { state: 'unavailable', value: null, basis: null, reason: null };
  }
  const state = KPI_STATES.has(raw.state) ? raw.state : 'unavailable';
  const numeric = typeof raw.value === 'number'
    ? raw.value
    : typeof raw.value === 'string' && raw.value.trim() !== '' && Number.isFinite(Number(raw.value))
      ? Number(raw.value)
      : null;
  // Coerência defensiva: sem número não existe estado disponível.
  const resolvedState = numeric === null && (state === 'available' || state === 'partial')
    ? 'unavailable'
    : state;
  return {
    state: resolvedState,
    value: resolvedState === 'available' || resolvedState === 'partial' ? numeric : null,
    basis: typeof raw.basis === 'string' ? raw.basis : null,
    reason: typeof raw.reason === 'string' ? raw.reason : null,
  };
}

function formatNumber(value, kind) {
  switch (kind) {
    case 'currency':
      return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      });
    case 'percent':
      return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
    case 'days':
      return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${value === 1 ? 'dia' : 'dias'}`;
    case 'count':
    default:
      return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }
}

/**
 * Formata o valor de um KPI para exibição. Retorna o texto de estado quando
 * não há valor confiável — jamais "0" para representar ausência.
 */
export function formatKpiValue(entry, kind = 'count') {
  if (!entry || entry.value === null || entry.value === undefined) {
    return STATE_PLACEHOLDERS[entry?.state] ?? STATE_PLACEHOLDERS.unavailable;
  }
  return formatNumber(entry.value, kind);
}

/**
 * Frase de apoio exibida junto ao KPI. Vazia quando o indicador está íntegro.
 */
export function describeKpiLimitation(entry) {
  if (!entry) return '';
  if (entry.state === 'available') return '';
  if (!entry.reason) {
    // Sem motivo declarado o painel não sabe a causa. Diz isso, e oferece a
    // única ação que existe, em vez de atribuir o problema a alguém.
    return entry.state === 'awaiting_history'
      ? REASON_MESSAGES.history_insufficient
      : MISSING_ENTRY_MESSAGE;
  }
  return REASON_MESSAGES[entry.reason] ?? UNKNOWN_REASON_MESSAGE;
}

/** Rótulo curto do estado, para o selo ao lado do número. */
export function describeKpiState(entry) {
  switch (entry?.state) {
    case 'available':
      return '';
    case 'partial':
      return 'Dados parciais';
    case 'awaiting_history':
      return 'Aguardando histórico';
    default:
      return 'Indisponível';
  }
}

/**
 * Explica a coorte de data usada pelo KPI, para que dois números do mesmo
 * painel nunca sejam lidos como se cobrissem o mesmo recorte temporal.
 */
const BASIS_MESSAGES = {
  stage_open_now: 'Posição na data de hoje.',
  deal_created_at: 'Considera a data de criação da negociação.',
  deal_closed_at: 'Considera a data de encerramento da negociação.',
  deal_stage_entered_at: 'Considera a entrada na etapa atual.',
  deal_stage_transition: 'Considera a mudança de etapa.',
  ticket_created_at: 'Considera a data de abertura do atendimento.',
  ticket_closed_at: 'Considera a data de encerramento do atendimento.',
  ticket_resolved_at: 'Considera a data em que o atendimento foi resolvido.',
  ticket_state_open_now: 'Atendimentos em aberto na data de hoje.',
  ticket_state_open_at_date: 'Atendimentos em aberto em cada data medida.',
  ticket_first_response_at: 'Considera a primeira resposta ao cliente.',
  ticket_sla_status: 'Considera o prazo acordado registrado no atendimento.',
  ticket_stage_transition: 'Considera a mudança de etapa do atendimento.',
  company_status_now: 'Situação cadastral na data de hoje.',
  company_recurring_revenue_now: 'Receita recorrente na data de hoje.',
  company_tax_id_now: 'Cadastro fiscal na data de hoje.',
  company_last_activity_at: 'Considera a última interação registrada.',
  customer_status_transition: 'Considera a mudança de situação do cliente.',
  title_due_date_now: 'Considera o vencimento em relação à data de hoje.',
  title_paid_at: 'Considera a data de recebimento.',
};

export function describeKpiBasis(entry) {
  if (!entry?.basis) return '';
  return BASIS_MESSAGES[entry.basis] ?? '';
}

/**
 * Converte a lista de códigos de aviso dos metadados em frases gerenciais,
 * sem repetição e sem vazar o código.
 */
export function summarizeWarnings(payload) {
  const meta = payload && typeof payload === 'object' ? payload.meta : null;
  const codes = meta && Array.isArray(meta.warning_codes) ? meta.warning_codes : [];
  const seen = new Set();
  const messages = [];
  for (const code of codes) {
    if (typeof code !== 'string' || seen.has(code)) continue;
    seen.add(code);
    messages.push(REASON_MESSAGES[code] ?? UNKNOWN_REASON_MESSAGE);
  }
  return [...new Set(messages)];
}

/**
 * Lê os metadados de confiabilidade sem expor nomes técnicos ao componente.
 */
export function readKpiMeta(payload) {
  const meta = payload && typeof payload === 'object' && payload.meta && typeof payload.meta === 'object'
    ? payload.meta
    : {};
  const coverage = typeof meta.coverage_percent === 'number' ? meta.coverage_percent : null;
  return {
    freshnessAt: typeof meta.freshness_at === 'string' ? meta.freshness_at : null,
    coveragePercent: coverage,
    isPartial: meta.is_partial === true,
    periodFrom: typeof meta.period_from === 'string' ? meta.period_from : null,
    periodTo: typeof meta.period_to === 'string' ? meta.period_to : null,
    historyDays: typeof meta.history_days === 'number' ? meta.history_days : null,
    warnings: summarizeWarnings(payload),
  };
}

/**
 * Estado de bloco compatível com o selo já usado pelas telas de Analytics.
 */
export function toAnalyticsBlockState(payload, sourceLabel) {
  const meta = readKpiMeta(payload);
  const hasAnyValue = payload && typeof payload === 'object' && payload.kpis
    && Object.keys(payload.kpis).length > 0;
  const status = !hasAnyValue
    ? 'unavailable'
    : meta.isPartial || meta.warnings.length > 0
      ? 'partial'
      : 'fresh';
  return {
    status,
    source: sourceLabel,
    lastSuccessfulSyncAt: meta.freshnessAt,
    coverage: { expected: null, received: null },
  };
}
