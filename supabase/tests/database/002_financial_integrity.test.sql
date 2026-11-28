begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;
select plan(12);

insert into auth.users (id, email, aud, role)
values
  ('10000000-0000-4000-8000-000000000001', 'owner@example.test', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000002', 'outsider@example.test', 'authenticated', 'authenticated');
insert into public.workspaces (id, created_by, name, timezone)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Oficina A', 'America/Fortaleza'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Oficina B', 'America/Fortaleza');
insert into public.workspace_members (workspace_id, user_id, role, created_by)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'owner', '10000000-0000-4000-8000-000000000002');
insert into public.customers (id, workspace_id, name)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Cliente A'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Cliente B');
insert into public.debts (id, workspace_id, customer_id, description, total_cents, service_date)
values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Serviço A', 10000, '2026-11-27'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Serviço B', 5000, '2026-11-27');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.register_payment('20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 4000, 'pix', '2026-11-27T12:00:00Z', null)$$,
  'a partial payment is accepted'
);
select is((select amount_cents from public.payments where id = '50000000-0000-4000-8000-000000000001'), 4000::bigint, 'payment stores integer cents');
select lives_ok(
  $$select public.register_payment('20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 4000, 'pix', '2026-11-27T12:00:00Z', null)$$,
  'replaying the same operation is idempotent'
);
select is((select count(*) from public.payments where debt_id = '40000000-0000-4000-8000-000000000001'), 1::bigint, 'idempotent replay does not duplicate payments');
select throws_ok(
  $$select public.register_payment('20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000009',
    '60000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000001', 7000, 'cash', '2026-11-27T13:00:00Z', null)$$,
  '23514', null, 'a payment cannot exceed the current balance'
);
select throws_ok(
  $$select public.register_payment('20000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000008',
    '60000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000002', 1000, 'cash', '2026-11-27T13:00:00Z', null)$$,
  '42501', null, 'financial RPCs reject another workspace'
);
select throws_ok(
  $$select public.cancel_debt('20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000007', 'Cancelamento inválido', '2026-11-27T14:00:00Z')$$,
  '23514', null, 'a debt with valid payments cannot be canceled'
);
select lives_ok(
  $$select public.reverse_payment('20000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', 'Pagamento lançado por engano', '2026-11-27T15:00:00Z')$$,
  'a persisted payment can be reversed once'
);
select throws_ok(
  $$select public.reverse_payment('20000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000009',
    '60000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001', 'Novo estorno', '2026-11-27T16:00:00Z')$$,
  '23505', null, 'a payment cannot be reversed twice'
);
select lives_ok(
  $$select public.cancel_debt('20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000004', 'Serviço cancelado', '2026-11-27T17:00:00Z')$$,
  'a debt can be canceled after all payments are reversed'
);
select is((select count(*) from public.audit_logs where workspace_id = '20000000-0000-4000-8000-000000000001'), 3::bigint, 'financial mutations are audited exactly once');
select ok(
  position(
    'for update' in lower(
      pg_get_functiondef('public.register_payment(uuid,uuid,uuid,uuid,bigint,text,timestamptz,text)'::regprocedure)
    )
  ) > 0,
  'payment registration locks the debt row for concurrent balance validation'
);

reset role;
select * from finish();
rollback;
