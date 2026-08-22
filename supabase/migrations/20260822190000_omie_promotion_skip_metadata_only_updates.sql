-- Evita reauditar todos os titulos OMIE quando somente a origem da sincronizacao mudou.
-- sync_run_id e proveniencia do lote, mas nao e uma mudanca financeira do titulo.
-- A promocao deve atualizar a proveniencia apenas quando outro campo realmente mudar.

create or replace function public.rpc_service_promote_omie_snapshot(p_sync_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.analytics_finance_sync_runs;
  v_staged integer;
  v_duplicate integer;
  v_promoted integer;
  v_result jsonb;
begin
  set local statement_timeout = '120s';

  if p_sync_run_id is null then raise exception 'sync_run_id obrigatorio'; end if;
  select * into v_run from public.analytics_finance_sync_runs where id = p_sync_run_id for update;
  if not found then raise exception 'Execucao OMIE inexistente'; end if;
  if v_run.status = 'completed' and v_run.promotion_result is not null then return v_run.promotion_result; end if;
  if v_run.status <> 'processing' then raise exception 'Execucao OMIE nao esta em processamento'; end if;
  perform pg_advisory_xact_lock(hashtext('omie_snapshot_promotion'));

  select count(*) into v_staged
  from public.analytics_finance_receivables_staging
  where sync_run_id = p_sync_run_id;
  if v_staged <= 0 then raise exception 'Staging OMIE vazio; promocao rejeitada'; end if;
  if v_run.accepted_rows > 0 and v_run.accepted_rows <> v_staged then raise exception 'Contagem staged diverge da contagem aceita'; end if;

  select count(*) into v_duplicate
  from (
    select source_key, source_record_id
    from public.analytics_finance_receivables_staging
    where sync_run_id = p_sync_run_id
    group by 1, 2
    having count(*) > 1
  ) d;
  if v_duplicate > 0 then raise exception 'Identidades duplicadas no staging OMIE'; end if;
  if exists (select 1 from public.analytics_finance_receivables_staging where sync_run_id = p_sync_run_id and source_key <> 'omie_receivables_api') then raise exception 'source_key OMIE nao autorizado'; end if;
  if exists (select 1 from public.analytics_finance_receivables_staging where sync_run_id = p_sync_run_id and identity_version <> 'omie-v3') then raise exception 'Versao de identidade OMIE nao autorizada'; end if;

  insert into public.analytics_finance_receivables as target (
    source_key, source_record_id, identity_version, status_original, aging_bucket,
    document_number, client_name, client_trade_name, client_tax_id, net_amount,
    received_amount, balance, due_date, issued_date, last_received_date,
    boleto_generated, is_cancelled, is_partial, effective_at, raw_payload,
    sync_run_id, is_current, updated_at
  )
  select source_key, source_record_id, identity_version, status_original, aging_bucket,
    document_number, client_name, client_trade_name, client_tax_id, net_amount,
    received_amount, balance, due_date, issued_date, last_received_date,
    boleto_generated, is_cancelled, is_partial, effective_at, raw_payload,
    sync_run_id, true, timezone('utc', now())
  from public.analytics_finance_receivables_staging
  where sync_run_id = p_sync_run_id
  on conflict (source_key, source_record_id) do update set
    identity_version = excluded.identity_version,
    status_original = excluded.status_original,
    aging_bucket = excluded.aging_bucket,
    document_number = excluded.document_number,
    client_name = excluded.client_name,
    client_trade_name = excluded.client_trade_name,
    client_tax_id = excluded.client_tax_id,
    net_amount = excluded.net_amount,
    received_amount = excluded.received_amount,
    balance = excluded.balance,
    due_date = excluded.due_date,
    issued_date = excluded.issued_date,
    last_received_date = excluded.last_received_date,
    boleto_generated = excluded.boleto_generated,
    is_cancelled = excluded.is_cancelled,
    is_partial = excluded.is_partial,
    effective_at = excluded.effective_at,
    raw_payload = excluded.raw_payload,
    sync_run_id = excluded.sync_run_id,
    is_current = true,
    updated_at = timezone('utc', now())
  where target.identity_version is distinct from excluded.identity_version
     or target.status_original is distinct from excluded.status_original
     or target.aging_bucket is distinct from excluded.aging_bucket
     or target.document_number is distinct from excluded.document_number
     or target.client_name is distinct from excluded.client_name
     or target.client_trade_name is distinct from excluded.client_trade_name
     or target.client_tax_id is distinct from excluded.client_tax_id
     or target.net_amount is distinct from excluded.net_amount
     or target.received_amount is distinct from excluded.received_amount
     or target.balance is distinct from excluded.balance
     or target.due_date is distinct from excluded.due_date
     or target.issued_date is distinct from excluded.issued_date
     or target.last_received_date is distinct from excluded.last_received_date
     or target.boleto_generated is distinct from excluded.boleto_generated
     or target.is_cancelled is distinct from excluded.is_cancelled
     or target.is_partial is distinct from excluded.is_partial
     or target.effective_at is distinct from excluded.effective_at
     or target.raw_payload is distinct from excluded.raw_payload
     or target.is_current is distinct from true;

  update public.analytics_finance_receivables as target
  set is_current = false, updated_at = timezone('utc', now())
  where target.source_key = 'omie_receivables_api'
    and coalesce(target.is_current, true)
    and not exists (
      select 1
      from public.analytics_finance_receivables_staging staged
      where staged.sync_run_id = p_sync_run_id
        and staged.source_key = target.source_key
        and staged.source_record_id = target.source_record_id
    );

  v_promoted := v_staged;
  v_result := jsonb_build_object('staged', v_staged, 'promoted', v_promoted);
  update public.analytics_finance_sync_runs
  set status = 'completed', staged_rows = v_staged, promoted_rows = v_promoted,
      total_rows = coalesce(total_rows, v_staged), accepted_rows = v_staged,
      finished_at = timezone('utc', now()), promotion_result = v_result
  where id = p_sync_run_id;
  delete from public.analytics_finance_receivables_staging where sync_run_id = p_sync_run_id;
  return v_result;
end;
$$;

revoke all on function public.rpc_service_promote_omie_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.rpc_service_promote_omie_snapshot(uuid) to service_role;
