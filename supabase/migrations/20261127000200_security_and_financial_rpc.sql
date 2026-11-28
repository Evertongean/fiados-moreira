revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

create or replace function private.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.workspace_members member
      where member.workspace_id = p_workspace_id
        and member.user_id = (select auth.uid())
    );
$$;

create or replace function private.has_workspace_role(p_workspace_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.workspace_members member
      where member.workspace_id = p_workspace_id
        and member.user_id = (select auth.uid())
        and member.role = any(p_roles)
    );
$$;

create or replace function private.assert_workspace_member(p_workspace_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_workspace_member(p_workspace_id) then
    raise exception 'WORKSPACE_ACCESS_DENIED' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.payload_fingerprint(p_payload jsonb)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select encode(extensions.digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function private.lock_operation(p_workspace_id uuid, p_operation_id uuid)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if p_workspace_id is null or p_operation_id is null then
    raise exception 'INVALID_OPERATION_ID' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(
    hashtextextended(p_workspace_id::text || ':' || p_operation_id::text, 0)
  );
end;
$$;

revoke all on function private.is_workspace_member(uuid) from public, anon;
revoke all on function private.has_workspace_role(uuid, text[]) from public, anon;
revoke all on function private.assert_workspace_member(uuid) from public, anon;
revoke all on function private.payload_fingerprint(jsonb) from public, anon, authenticated;
revoke all on function private.lock_operation(uuid, uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.has_workspace_role(uuid, text[]) to authenticated;
grant execute on function private.assert_workspace_member(uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.debts enable row level security;
alter table public.payments enable row level security;
alter table public.payment_reversals enable row level security;
alter table public.reminders enable row level security;
alter table public.settings enable row level security;
alter table public.collection_attempts enable row level security;
alter table public.audit_logs enable row level security;

create policy workspaces_select_member on public.workspaces
for select to authenticated
using ((select private.is_workspace_member(id)));

create policy workspaces_update_manager on public.workspaces
for update to authenticated
using ((select private.has_workspace_role(id, array['owner', 'admin'])))
with check ((select private.has_workspace_role(id, array['owner', 'admin'])));

create policy workspace_members_select_member on public.workspace_members
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy customers_select_member on public.customers
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
create policy customers_insert_member on public.customers
for insert to authenticated
with check ((select private.is_workspace_member(workspace_id)));
create policy customers_update_member on public.customers
for update to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));

create policy vehicles_select_member on public.vehicles
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
create policy vehicles_insert_member on public.vehicles
for insert to authenticated
with check ((select private.is_workspace_member(workspace_id)));
create policy vehicles_update_member on public.vehicles
for update to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));

create policy debts_select_member on public.debts
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
create policy payments_select_member on public.payments
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
create policy payment_reversals_select_member on public.payment_reversals
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy reminders_select_member on public.reminders
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
create policy reminders_insert_member on public.reminders
for insert to authenticated
with check ((select private.is_workspace_member(workspace_id)));
create policy reminders_update_member on public.reminders
for update to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));

create policy settings_select_member on public.settings
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
create policy settings_insert_manager on public.settings
for insert to authenticated
with check ((select private.has_workspace_role(workspace_id, array['owner', 'admin'])));
create policy settings_update_manager on public.settings
for update to authenticated
using ((select private.has_workspace_role(workspace_id, array['owner', 'admin'])))
with check ((select private.has_workspace_role(workspace_id, array['owner', 'admin'])));

create policy collection_attempts_select_member on public.collection_attempts
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
create policy collection_attempts_insert_member on public.collection_attempts
for insert to authenticated
with check ((select private.is_workspace_member(workspace_id)));

create policy audit_logs_select_member on public.audit_logs
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));

grant select on public.workspaces, public.workspace_members, public.customers,
  public.vehicles, public.debts, public.payments, public.payment_reversals,
  public.reminders, public.settings, public.collection_attempts, public.audit_logs
to authenticated;

grant insert on public.customers, public.vehicles, public.reminders,
  public.settings, public.collection_attempts
to authenticated;

grant update (name, timezone, currency) on public.workspaces to authenticated;
grant update (name, phone, whatsapp, address, notes, archived_at, deleted_at)
  on public.customers to authenticated;
grant update (type, brand, model, year, plate, color, notes, archived_at, deleted_at)
  on public.vehicles to authenticated;
grant update (type, scheduled_at, status, delivered_at, read_at)
  on public.reminders to authenticated;
grant update (value_json) on public.settings to authenticated;

create or replace function public.create_workspace(
  p_workspace_id uuid,
  p_operation_id uuid,
  p_name text,
  p_timezone text,
  p_currency text default 'BRL'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_audit public.audit_logs;
  v_payload jsonb;
begin
  if v_actor is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;
  perform private.lock_operation(p_workspace_id, p_operation_id);
  v_payload := jsonb_build_object(
    'workspaceId', p_workspace_id,
    'name', trim(p_name),
    'timezone', trim(p_timezone),
    'currency', p_currency
  );
  select * into v_audit
  from public.audit_logs
  where workspace_id = p_workspace_id and operation_id = p_operation_id;
  if found then
    if v_audit.entity_type = 'workspace'
      and v_audit.entity_id = p_workspace_id
      and v_audit.action = 'create'
      and v_audit.metadata_json ->> 'payloadFingerprint' = private.payload_fingerprint(v_payload)
    then
      return p_workspace_id;
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '23505';
  end if;
  insert into public.workspaces (id, created_by, name, timezone, currency)
  values (p_workspace_id, v_actor, trim(p_name), trim(p_timezone), p_currency);
  insert into public.workspace_members (workspace_id, user_id, role, created_by)
  values (p_workspace_id, v_actor, 'owner', v_actor);
  insert into public.audit_logs (
    workspace_id, actor_id, entity_type, entity_id, action, operation_id, metadata_json
  ) values (
    p_workspace_id, v_actor, 'workspace', p_workspace_id, 'create', p_operation_id,
    jsonb_build_object('payloadFingerprint', private.payload_fingerprint(v_payload))
  );
  return p_workspace_id;
end;
$$;

create or replace function public.manage_workspace_member(
  p_workspace_id uuid,
  p_operation_id uuid,
  p_user_id uuid,
  p_role text,
  p_remove boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_audit public.audit_logs;
  v_exists boolean;
  v_action text;
  v_payload jsonb;
begin
  if not private.has_workspace_role(p_workspace_id, array['owner']) then
    raise exception 'WORKSPACE_OWNER_REQUIRED' using errcode = '42501';
  end if;
  if p_user_id = v_actor then
    raise exception 'OWNER_SELF_CHANGE_DENIED' using errcode = '42501';
  end if;
  if p_role not in ('owner', 'admin', 'member') then
    raise exception 'INVALID_MEMBER_ROLE' using errcode = '22023';
  end if;
  perform private.lock_operation(p_workspace_id, p_operation_id);
  v_payload := jsonb_build_object('userId', p_user_id, 'role', p_role, 'remove', p_remove);
  select * into v_audit
  from public.audit_logs
  where workspace_id = p_workspace_id and operation_id = p_operation_id;
  if found then
    if v_audit.entity_type = 'workspace_member'
      and v_audit.entity_id = p_user_id
      and v_audit.metadata_json ->> 'payloadFingerprint' = private.payload_fingerprint(v_payload)
    then
      return;
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '23505';
  end if;
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = p_user_id
  ) into v_exists;
  if p_remove then
    if not v_exists then
      raise exception 'WORKSPACE_MEMBER_NOT_FOUND' using errcode = 'P0002';
    end if;
    delete from public.workspace_members
    where workspace_id = p_workspace_id and user_id = p_user_id;
    v_action := 'archive';
  else
    insert into public.workspace_members (workspace_id, user_id, role, created_by)
    values (p_workspace_id, p_user_id, p_role, v_actor)
    on conflict (workspace_id, user_id) do update set role = excluded.role;
    v_action := case when v_exists then 'update' else 'create' end;
  end if;
  insert into public.audit_logs (
    workspace_id, actor_id, entity_type, entity_id, action, operation_id, metadata_json
  ) values (
    p_workspace_id, v_actor, 'workspace_member', p_user_id, v_action, p_operation_id,
    jsonb_build_object('payloadFingerprint', private.payload_fingerprint(v_payload))
  );
end;
$$;

create or replace function public.create_debt(
  p_workspace_id uuid,
  p_debt_id uuid,
  p_operation_id uuid,
  p_customer_id uuid,
  p_vehicle_id uuid,
  p_description text,
  p_total_cents bigint,
  p_service_date date,
  p_due_date date,
  p_notes text
)
returns public.debts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_debt public.debts;
  v_audit public.audit_logs;
  v_payload jsonb;
begin
  perform private.assert_workspace_member(p_workspace_id);
  perform private.lock_operation(p_workspace_id, p_operation_id);
  v_payload := jsonb_build_object(
    'customerId', p_customer_id, 'vehicleId', p_vehicle_id,
    'description', trim(p_description), 'totalCents', p_total_cents,
    'serviceDate', p_service_date, 'dueDate', p_due_date,
    'notes', nullif(trim(p_notes), '')
  );
  select * into v_audit from public.audit_logs
  where workspace_id = p_workspace_id and operation_id = p_operation_id;
  if found then
    if v_audit.entity_type = 'debt' and v_audit.entity_id = p_debt_id
      and v_audit.action = 'create'
      and v_audit.metadata_json ->> 'payloadFingerprint' = private.payload_fingerprint(v_payload)
    then
      select * into strict v_debt from public.debts
      where workspace_id = p_workspace_id and id = p_debt_id;
      return v_debt;
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '23505';
  end if;
  if not exists (
    select 1 from public.customers
    where workspace_id = p_workspace_id and id = p_customer_id
      and archived_at is null and deleted_at is null
  ) then
    raise exception 'CUSTOMER_UNAVAILABLE' using errcode = '23503';
  end if;
  if p_vehicle_id is not null and not exists (
    select 1 from public.vehicles
    where workspace_id = p_workspace_id and id = p_vehicle_id
      and customer_id = p_customer_id and archived_at is null and deleted_at is null
  ) then
    raise exception 'VEHICLE_UNAVAILABLE' using errcode = '23503';
  end if;
  insert into public.debts (
    id, workspace_id, customer_id, vehicle_id, description, total_cents,
    service_date, due_date, notes
  ) values (
    p_debt_id, p_workspace_id, p_customer_id, p_vehicle_id, trim(p_description), p_total_cents,
    p_service_date, p_due_date, nullif(trim(p_notes), '')
  ) returning * into v_debt;
  insert into public.audit_logs (
    workspace_id, actor_id, entity_type, entity_id, action, operation_id, metadata_json
  ) values (
    p_workspace_id, (select auth.uid()), 'debt', p_debt_id, 'create', p_operation_id,
    jsonb_build_object(
      'payloadFingerprint', private.payload_fingerprint(v_payload),
      'totalCents', p_total_cents
    )
  );
  return v_debt;
end;
$$;

create or replace function public.update_debt(
  p_workspace_id uuid,
  p_debt_id uuid,
  p_operation_id uuid,
  p_vehicle_id uuid,
  p_description text,
  p_total_cents bigint,
  p_service_date date,
  p_due_date date,
  p_notes text
)
returns public.debts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_debt public.debts;
  v_audit public.audit_logs;
  v_paid bigint;
  v_payload jsonb;
begin
  perform private.assert_workspace_member(p_workspace_id);
  perform private.lock_operation(p_workspace_id, p_operation_id);
  v_payload := jsonb_build_object(
    'vehicleId', p_vehicle_id, 'description', trim(p_description),
    'totalCents', p_total_cents, 'serviceDate', p_service_date,
    'dueDate', p_due_date, 'notes', nullif(trim(p_notes), '')
  );
  select * into v_audit from public.audit_logs
  where workspace_id = p_workspace_id and operation_id = p_operation_id;
  if found then
    if v_audit.entity_type = 'debt' and v_audit.entity_id = p_debt_id
      and v_audit.action = 'update'
      and v_audit.metadata_json ->> 'payloadFingerprint' = private.payload_fingerprint(v_payload)
    then
      select * into strict v_debt from public.debts
      where workspace_id = p_workspace_id and id = p_debt_id;
      return v_debt;
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '23505';
  end if;
  select * into strict v_debt from public.debts
  where workspace_id = p_workspace_id and id = p_debt_id for update;
  if v_debt.canceled_at is not null then
    raise exception 'DEBT_CANCELED' using errcode = '23514';
  end if;
  select coalesce(sum(payment.amount_cents) filter (where reversal.id is null), 0)
  into v_paid
  from public.payments payment
  left join public.payment_reversals reversal
    on reversal.workspace_id = payment.workspace_id and reversal.payment_id = payment.id
  where payment.workspace_id = p_workspace_id and payment.debt_id = p_debt_id;
  if p_total_cents < v_paid then
    raise exception 'TOTAL_BELOW_PAID' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.customers
    where workspace_id = p_workspace_id and id = v_debt.customer_id
      and (archived_at is not null or deleted_at is not null)
  ) and p_total_cents > v_paid then
    raise exception 'CUSTOMER_ARCHIVED' using errcode = '23514';
  end if;
  if p_vehicle_id is not null and not exists (
    select 1 from public.vehicles
    where workspace_id = p_workspace_id and id = p_vehicle_id
      and customer_id = v_debt.customer_id and archived_at is null and deleted_at is null
  ) then
    raise exception 'VEHICLE_UNAVAILABLE' using errcode = '23503';
  end if;
  update public.debts set
    vehicle_id = p_vehicle_id,
    description = trim(p_description),
    total_cents = p_total_cents,
    service_date = p_service_date,
    due_date = p_due_date,
    notes = nullif(trim(p_notes), '')
  where workspace_id = p_workspace_id and id = p_debt_id
  returning * into v_debt;
  insert into public.audit_logs (
    workspace_id, actor_id, entity_type, entity_id, action, operation_id, metadata_json
  ) values (
    p_workspace_id, (select auth.uid()), 'debt', p_debt_id, 'update', p_operation_id,
    jsonb_build_object('payloadFingerprint', private.payload_fingerprint(v_payload))
  );
  return v_debt;
end;
$$;

create or replace function public.cancel_debt(
  p_workspace_id uuid,
  p_debt_id uuid,
  p_operation_id uuid,
  p_reason text,
  p_canceled_at timestamptz
)
returns public.debts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_debt public.debts;
  v_audit public.audit_logs;
  v_paid bigint;
  v_payload jsonb;
begin
  perform private.assert_workspace_member(p_workspace_id);
  perform private.lock_operation(p_workspace_id, p_operation_id);
  v_payload := jsonb_build_object('reason', trim(p_reason), 'canceledAt', p_canceled_at);
  select * into v_audit from public.audit_logs
  where workspace_id = p_workspace_id and operation_id = p_operation_id;
  if found then
    if v_audit.entity_type = 'debt' and v_audit.entity_id = p_debt_id
      and v_audit.action = 'cancel'
      and v_audit.metadata_json ->> 'payloadFingerprint' = private.payload_fingerprint(v_payload)
    then
      select * into strict v_debt from public.debts
      where workspace_id = p_workspace_id and id = p_debt_id;
      return v_debt;
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '23505';
  end if;
  select * into strict v_debt from public.debts
  where workspace_id = p_workspace_id and id = p_debt_id for update;
  if v_debt.canceled_at is not null then
    raise exception 'DEBT_CANCELED' using errcode = '23514';
  end if;
  select coalesce(sum(payment.amount_cents) filter (where reversal.id is null), 0)
  into v_paid
  from public.payments payment
  left join public.payment_reversals reversal
    on reversal.workspace_id = payment.workspace_id and reversal.payment_id = payment.id
  where payment.workspace_id = p_workspace_id and payment.debt_id = p_debt_id;
  if v_paid > 0 then
    raise exception 'DEBT_HAS_VALID_PAYMENTS' using errcode = '23514';
  end if;
  update public.debts set canceled_at = p_canceled_at, cancellation_reason = trim(p_reason)
  where workspace_id = p_workspace_id and id = p_debt_id
  returning * into v_debt;
  insert into public.audit_logs (
    workspace_id, actor_id, entity_type, entity_id, action, operation_id, metadata_json
  ) values (
    p_workspace_id, (select auth.uid()), 'debt', p_debt_id, 'cancel', p_operation_id,
    jsonb_build_object('payloadFingerprint', private.payload_fingerprint(v_payload))
  );
  return v_debt;
end;
$$;

create or replace function public.register_payment(
  p_workspace_id uuid,
  p_payment_id uuid,
  p_operation_id uuid,
  p_debt_id uuid,
  p_amount_cents bigint,
  p_payment_method text,
  p_paid_at timestamptz,
  p_notes text
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_debt public.debts;
  v_payment public.payments;
  v_audit public.audit_logs;
  v_paid bigint;
  v_remaining bigint;
  v_payload jsonb;
begin
  perform private.assert_workspace_member(p_workspace_id);
  perform private.lock_operation(p_workspace_id, p_operation_id);
  v_payload := jsonb_build_object(
    'paymentId', p_payment_id, 'debtId', p_debt_id, 'amountCents', p_amount_cents,
    'paymentMethod', p_payment_method, 'paidAt', p_paid_at,
    'notes', nullif(trim(p_notes), '')
  );
  select * into v_audit from public.audit_logs
  where workspace_id = p_workspace_id and operation_id = p_operation_id;
  if found then
    if v_audit.entity_type = 'payment' and v_audit.entity_id = p_payment_id
      and v_audit.action = 'payment_registered'
      and v_audit.metadata_json ->> 'payloadFingerprint' = private.payload_fingerprint(v_payload)
    then
      select * into strict v_payment from public.payments
      where workspace_id = p_workspace_id and id = p_payment_id;
      return v_payment;
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '23505';
  end if;
  select * into strict v_debt from public.debts
  where workspace_id = p_workspace_id and id = p_debt_id for update;
  if v_debt.canceled_at is not null then
    raise exception 'DEBT_CANCELED' using errcode = '23514';
  end if;
  select coalesce(sum(payment.amount_cents) filter (where reversal.id is null), 0)
  into v_paid
  from public.payments payment
  left join public.payment_reversals reversal
    on reversal.workspace_id = payment.workspace_id and reversal.payment_id = payment.id
  where payment.workspace_id = p_workspace_id and payment.debt_id = p_debt_id;
  v_remaining := v_debt.total_cents - v_paid;
  if p_amount_cents <= 0 or p_amount_cents > v_remaining then
    raise exception 'PAYMENT_EXCEEDS_BALANCE' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.payments
    where workspace_id = p_workspace_id and id = p_payment_id
  ) then
    raise exception 'PAYMENT_ID_CONFLICT' using errcode = '23505';
  end if;
  insert into public.payments (
    id, workspace_id, debt_id, operation_id, amount_cents, payment_method, paid_at, notes
  ) values (
    p_payment_id, p_workspace_id, p_debt_id, p_operation_id, p_amount_cents,
    p_payment_method, p_paid_at, nullif(trim(p_notes), '')
  ) returning * into v_payment;
  insert into public.audit_logs (
    workspace_id, actor_id, entity_type, entity_id, action, operation_id, metadata_json
  ) values (
    p_workspace_id, (select auth.uid()), 'payment', p_payment_id,
    'payment_registered', p_operation_id,
    jsonb_build_object(
      'payloadFingerprint', private.payload_fingerprint(v_payload),
      'debtId', p_debt_id,
      'amountCents', p_amount_cents,
      'debtTotalAtPaymentCents', v_debt.total_cents,
      'totalPaidAtPaymentCents', v_paid + p_amount_cents,
      'remainingAtPaymentCents', v_remaining - p_amount_cents
    )
  );
  return v_payment;
end;
$$;

create or replace function public.reverse_payment(
  p_workspace_id uuid,
  p_reversal_id uuid,
  p_operation_id uuid,
  p_payment_id uuid,
  p_reason text,
  p_reversed_at timestamptz
)
returns public.payment_reversals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
  v_reversal public.payment_reversals;
  v_audit public.audit_logs;
  v_debt_id uuid;
  v_payload jsonb;
begin
  perform private.assert_workspace_member(p_workspace_id);
  perform private.lock_operation(p_workspace_id, p_operation_id);
  v_payload := jsonb_build_object(
    'reversalId', p_reversal_id, 'paymentId', p_payment_id,
    'reason', trim(p_reason), 'reversedAt', p_reversed_at
  );
  select * into v_audit from public.audit_logs
  where workspace_id = p_workspace_id and operation_id = p_operation_id;
  if found then
    if v_audit.entity_type = 'payment' and v_audit.entity_id = p_payment_id
      and v_audit.action = 'payment_reversed'
      and v_audit.metadata_json ->> 'payloadFingerprint' = private.payload_fingerprint(v_payload)
    then
      select * into strict v_reversal from public.payment_reversals
      where workspace_id = p_workspace_id and id = p_reversal_id;
      return v_reversal;
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '23505';
  end if;
  select debt_id into strict v_debt_id from public.payments
  where workspace_id = p_workspace_id and id = p_payment_id;
  perform 1 from public.debts
  where workspace_id = p_workspace_id and id = v_debt_id for update;
  select * into strict v_payment from public.payments
  where workspace_id = p_workspace_id and id = p_payment_id for update;
  if exists (
    select 1 from public.payment_reversals
    where workspace_id = p_workspace_id and payment_id = p_payment_id
  ) then
    raise exception 'PAYMENT_ALREADY_REVERSED' using errcode = '23505';
  end if;
  insert into public.payment_reversals (
    id, workspace_id, payment_id, operation_id, reason, reversed_at
  ) values (
    p_reversal_id, p_workspace_id, p_payment_id, p_operation_id,
    trim(p_reason), p_reversed_at
  ) returning * into v_reversal;
  insert into public.audit_logs (
    workspace_id, actor_id, entity_type, entity_id, action, operation_id, metadata_json
  ) values (
    p_workspace_id, (select auth.uid()), 'payment', p_payment_id,
    'payment_reversed', p_operation_id,
    jsonb_build_object(
      'payloadFingerprint', private.payload_fingerprint(v_payload),
      'debtId', v_payment.debt_id,
      'amountCents', v_payment.amount_cents
    )
  );
  return v_reversal;
end;
$$;

revoke execute on function public.create_workspace(uuid, uuid, text, text, text)
  from public, anon;
revoke execute on function public.manage_workspace_member(uuid, uuid, uuid, text, boolean)
  from public, anon;
revoke execute on function public.create_debt(uuid, uuid, uuid, uuid, uuid, text, bigint, date, date, text)
  from public, anon;
revoke execute on function public.update_debt(uuid, uuid, uuid, uuid, text, bigint, date, date, text)
  from public, anon;
revoke execute on function public.cancel_debt(uuid, uuid, uuid, text, timestamptz)
  from public, anon;
revoke execute on function public.register_payment(uuid, uuid, uuid, uuid, bigint, text, timestamptz, text)
  from public, anon;
revoke execute on function public.reverse_payment(uuid, uuid, uuid, uuid, text, timestamptz)
  from public, anon;

grant execute on function public.create_workspace(uuid, uuid, text, text, text)
  to authenticated;
grant execute on function public.manage_workspace_member(uuid, uuid, uuid, text, boolean)
  to authenticated;
grant execute on function public.create_debt(uuid, uuid, uuid, uuid, uuid, text, bigint, date, date, text)
  to authenticated;
grant execute on function public.update_debt(uuid, uuid, uuid, uuid, text, bigint, date, date, text)
  to authenticated;
grant execute on function public.cancel_debt(uuid, uuid, uuid, text, timestamptz)
  to authenticated;
grant execute on function public.register_payment(uuid, uuid, uuid, uuid, bigint, text, timestamptz, text)
  to authenticated;
grant execute on function public.reverse_payment(uuid, uuid, uuid, uuid, text, timestamptz)
  to authenticated;
