begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;
select plan(11);

insert into auth.users (id, email, aud, role)
values
  ('10000000-0000-4000-8000-000000000001', 'owner-one@example.test', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000002', 'owner-two@example.test', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000003', 'member@example.test', 'authenticated', 'authenticated');

insert into public.workspaces (id, created_by, name, timezone)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Oficina A', 'America/Fortaleza'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Oficina B', 'America/Fortaleza');
insert into public.workspace_members (workspace_id, user_id, role, created_by)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'member', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'owner', '10000000-0000-4000-8000-000000000002');
insert into public.customers (id, workspace_id, name)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Cliente A'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Cliente B');

select is(
  (select count(*)::integer
   from pg_class
   where relnamespace = 'public'::regnamespace
     and relname = any(array[
       'workspaces', 'workspace_members', 'customers', 'vehicles', 'debts', 'payments',
       'payment_reversals', 'reminders', 'settings', 'collection_attempts', 'audit_logs'
     ])
     and relrowsecurity),
  11,
  'RLS is enabled on every public application table'
);
select ok(not has_table_privilege('anon', 'public.payments', 'select'), 'anonymous users have no access to financial tables');
select ok(not has_table_privilege('authenticated', 'public.payments', 'insert'), 'authenticated users cannot bypass payment RPCs');
select ok(not has_table_privilege('authenticated', 'public.workspace_members', 'insert'), 'members cannot be created directly');
select throws_ok(
  $$insert into public.debts (id, workspace_id, customer_id, description, total_cents, service_date)
    values ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001', 'Inválido', 0, '2026-11-27')$$,
  '23514', null, 'monetary constraints reject zero-valued debts'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.workspaces), 1::bigint, 'an owner sees only their workspace');
select is((select count(*) from public.customers), 1::bigint, 'customer reads are isolated by workspace');
select throws_ok(
  $$insert into public.customers (id, workspace_id, name)
    values ('30000000-0000-4000-8000-000000000099', '20000000-0000-4000-8000-000000000002', 'Acesso indevido')$$,
  '42501', null, 'cross-workspace inserts are rejected by RLS'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.workspaces), 1::bigint, 'a member can read the assigned workspace');
select throws_ok(
  $$update public.workspace_members
    set role = 'owner'
    where workspace_id = '20000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000003'$$,
  '42501', null, 'a member cannot promote themselves through direct table access'
);
select throws_ok(
  $$select public.manage_workspace_member(
    '20000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    'owner',
    false
  )$$,
  '42501', null, 'a member cannot promote themselves through the membership RPC'
);
reset role;

select * from finish();
rollback;
