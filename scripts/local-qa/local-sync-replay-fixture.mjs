import { createHash } from 'node:crypto';

export const FIXTURE_NAMESPACE = 'local-sync-replay-20260824';
export const COMMERCIAL_PIPELINE_ID = 'qa-local-commercial';
export const SUPPORT_PIPELINE_ID = 'qa-local-cs';
export const OMIE_SOURCE_KEY = `${FIXTURE_NAMESPACE}-omie`;

export const REQUIRED_LOCAL_USERS = [
  { key: 'admin', email: 'qa.local.admin@confi-one.local' },
  { key: 'dashboardViewer', email: 'qa.local.dashboard-viewer@confi-one.local' },
  { key: 'client', email: 'qa.local.client@confi-one.local' },
];

function stableUuid(value) {
  const bytes = createHash('sha1').update(`${FIXTURE_NAMESPACE}:${value}`).digest('hex').slice(0, 32).split('');
  bytes[12] = '5';
  bytes[16] = ((Number.parseInt(bytes[16], 16) & 0x3) | 0x8).toString(16);
  const hex = bytes.join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function buildFixture(users) {
  const admin = users.admin?.id;
  const viewer = users.dashboardViewer?.id;
  const client = users.client?.id;
  if (![admin, viewer, client].every((id) => /^[0-9a-f-]{36}$/i.test(String(id ?? '')))) {
    throw new Error('LOCAL_SYNC_REPLAY_USERS_INVALID: usuários locais existentes são necessários.');
  }

  const tenantAurora = stableUuid('tenant:aurora');
  const tenantHorizonte = stableUuid('tenant:horizonte');
  const companyAurora = `${FIXTURE_NAMESPACE}-company-aurora`;
  const companyHorizonte = `${FIXTURE_NAMESPACE}-company-horizonte`;
  const dealAurora = `${FIXTURE_NAMESPACE}-deal-aurora`;
  const ticketHorizonte = `${FIXTURE_NAMESPACE}-ticket-horizonte`;
  const omieRecord = `${FIXTURE_NAMESPACE}-receivable-001`;

  return {
    namespace: FIXTURE_NAMESPACE,
    users: { admin, viewer, client },
    tenants: [
      { id: tenantAurora, slug: `${FIXTURE_NAMESPACE}-aurora`, displayName: '[LOCAL SYNC REPLAY] Aurora', legalName: '[LOCAL SYNC REPLAY] Aurora Comércio' },
      { id: tenantHorizonte, slug: `${FIXTURE_NAMESPACE}-horizonte`, displayName: '[LOCAL SYNC REPLAY] Horizonte', legalName: '[LOCAL SYNC REPLAY] Horizonte Digital' },
    ],
    memberships: [
      { tenantId: tenantAurora, userId: viewer, role: 'tenant_viewer' },
      { tenantId: tenantAurora, userId: client, role: 'tenant_requester' },
      { tenantId: tenantHorizonte, userId: viewer, role: 'tenant_viewer' },
    ],
    hubspot: {
      companies: [
        { companyId: companyAurora, name: '[LOCAL SYNC REPLAY] Aurora', domain: 'local-sync-replay-aurora.invalid', taxId: 'LOCAL-SYNC-0001' },
        { companyId: companyHorizonte, name: '[LOCAL SYNC REPLAY] Horizonte', domain: 'local-sync-replay-horizonte.invalid', taxId: 'LOCAL-SYNC-0002' },
      ],
      deals: [{ dealId: dealAurora, pipelineId: COMMERCIAL_PIPELINE_ID, stageId: 'qa-stage-open', name: '[LOCAL SYNC REPLAY] Deal Aurora' }],
      tickets: [{ ticketId: ticketHorizonte, pipelineId: SUPPORT_PIPELINE_ID, stageId: 'qa-stage-new' }],
    },
    omie: [{ sourceKey: OMIE_SOURCE_KEY, sourceRecordId: omieRecord, documentNumber: `${FIXTURE_NAMESPACE}-NF-001`, clientName: '[LOCAL SYNC REPLAY] Aurora' }],
  };
}

function sqlEscape(value) {
  return String(value ?? '').replaceAll("'", "''");
}

function sql(value) {
  return `'${sqlEscape(value)}'`;
}

export function buildReplaySql(fixture) {
  const actor = fixture.users.admin;
  const tenantRows = fixture.tenants.map((tenant) => `(${sql(tenant.id)}::uuid,${sql(tenant.slug)},${sql(tenant.legalName)},${sql(tenant.displayName)},'active'::public.tenant_status,'sa-east-1',${sql(actor)}::uuid,${sql(actor)}::uuid)`).join(',\n');
  const membershipRows = fixture.memberships.map((membership) => `(${sql(membership.tenantId)}::uuid,${sql(membership.userId)}::uuid,${sql(membership.role)}::public.tenant_role,'active'::public.membership_status,${sql(actor)}::uuid,${sql(actor)}::uuid,${sql(actor)}::uuid)`).join(',\n');
  const companyRows = fixture.hubspot.companies.map((company) => `(${sql(company.companyId)},${sql(company.name)},${sql(company.domain)},${sql(company.taxId)},'active','active',jsonb_build_object('fixture_namespace',${sql(fixture.namespace)},'source','hubspot_local_payload'))`).join(',\n');
  const dealRows = fixture.hubspot.deals.map((deal) => `(${sql(deal.dealId)},${sql(deal.pipelineId)},${sql(deal.stageId)},null,1000,'newbusiness',${sql(deal.name)},timestamptz '2026-08-24 12:00:00+00',null,jsonb_build_object('fixture_namespace',${sql(fixture.namespace)},'source','hubspot_local_payload'))`).join(',\n');
  const ticketRows = fixture.hubspot.tickets.map((ticket) => `(${sql(ticket.ticketId)},${sql(ticket.pipelineId)},${sql(ticket.stageId)},'portal','normal',timestamptz '2026-08-24 12:00:00+00',null,jsonb_build_object('fixture_namespace',${sql(fixture.namespace)},'source','hubspot_local_payload'))`).join(',\n');
  const omieRows = fixture.omie.map((row) => `(${sql(row.sourceKey)},${sql(row.sourceRecordId)},'omie-v3','A vencer','a_vencer',${sql(row.documentNumber)},${sql(row.clientName)},1000,0,1000,date '2026-09-01',jsonb_build_object('fixture_namespace',${sql(fixture.namespace)},'source','omie_local_payload'),true)`).join(',\n');

  return `begin;
insert into public.tenants (id,slug,legal_name,display_name,status,data_region,created_by_user_id,updated_by_user_id)
values ${tenantRows}
on conflict (id) do update set slug=excluded.slug,legal_name=excluded.legal_name,display_name=excluded.display_name,status=excluded.status,updated_by_user_id=excluded.updated_by_user_id,updated_at=timezone('utc',now());
insert into public.tenant_memberships (tenant_id,user_id,role,status,invited_by_user_id,created_by_user_id,updated_by_user_id)
values ${membershipRows}
on conflict (tenant_id,user_id) do update set role=excluded.role,status=excluded.status,updated_by_user_id=excluded.updated_by_user_id,updated_at=timezone('utc',now());
insert into public.hubspot_companies (company_id,name,domain,tax_id,client_status,contract_status,raw)
values ${companyRows}
on conflict (company_id) do update set name=excluded.name,domain=excluded.domain,tax_id=excluded.tax_id,client_status=excluded.client_status,contract_status=excluded.contract_status,raw=excluded.raw,synced_at=timezone('utc',now());
insert into public.hubspot_deals (deal_id,pipeline_id,dealstage,owner_id,amount_home,dealtype,deal_name,hs_created_at,hs_closed_at,raw)
values ${dealRows}
on conflict (deal_id) do update set pipeline_id=excluded.pipeline_id,dealstage=excluded.dealstage,deal_name=excluded.deal_name,amount_home=excluded.amount_home,raw=excluded.raw,synced_at=timezone('utc',now());
insert into public.hubspot_tickets (ticket_id,pipeline_id,pipeline_stage,source_type,priority,hs_created_at,hs_closed_at,raw)
values ${ticketRows}
on conflict (ticket_id) do update set pipeline_id=excluded.pipeline_id,pipeline_stage=excluded.pipeline_stage,source_type=excluded.source_type,priority=excluded.priority,raw=excluded.raw,synced_at=timezone('utc',now());
insert into public.analytics_finance_receivables (source_key,source_record_id,identity_version,status_original,aging_bucket,document_number,client_name,net_amount,received_amount,balance,due_date,raw_payload,is_current)
values ${omieRows}
on conflict (source_key,source_record_id) do update set identity_version=excluded.identity_version,status_original=excluded.status_original,aging_bucket=excluded.aging_bucket,document_number=excluded.document_number,client_name=excluded.client_name,net_amount=excluded.net_amount,received_amount=excluded.received_amount,balance=excluded.balance,due_date=excluded.due_date,raw_payload=excluded.raw_payload,is_current=excluded.is_current,updated_at=timezone('utc',now());
commit;`;
}

export function buildVerificationSql(fixture, adminId) {
  const dealId = fixture.hubspot.deals[0].dealId;
  const ticketId = fixture.hubspot.tickets[0].ticketId;
  return `with claims as (
  select set_config('request.jwt.claims',jsonb_build_object('sub',${sql(adminId)},'role','authenticated')::text,true) as configured
), eligibility as (
  select
    app_private.analytics_pipeline_operation_eligible('deal',${sql(COMMERCIAL_PIPELINE_ID)},null,'commercial') as commercial_eligible,
    app_private.analytics_pipeline_operation_eligible('ticket',${sql(SUPPORT_PIPELINE_ID)},null,'support') as support_eligible
), snapshots as (
  select
    public.rpc_analytics_commercial_snapshot_by_operation(null,null,null,null,'{}'::text[],null) as commercial,
    public.rpc_analytics_cs_snapshot_by_operation(null,null,null,null,'{}'::text[],null) as support
  from claims
)
select
  (select commercial_eligible from eligibility) as commercial_eligible,
  (select support_eligible from eligibility) as support_eligible,
  (select count(*)::int from public.hubspot_deals where deal_id=${sql(dealId)}) as deal_rows,
  (select count(*)::int from public.hubspot_tickets where ticket_id=${sql(ticketId)}) as ticket_rows,
  (select (commercial->'by_pipeline')::text from snapshots) like '%' || ${sql(fixture.namespace)} || '%' as commercial_fixture_visible,
  (select (support->'by_pipeline')::text from snapshots) like '%' || ${sql(fixture.namespace)} || '%' as support_fixture_visible;`;
}
