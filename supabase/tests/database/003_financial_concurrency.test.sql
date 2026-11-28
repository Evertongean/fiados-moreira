do $$
declare
  v_password text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if exists (select 1 from pg_roles where rolname = 'prompt16_dblink_test') then
    execute 'drop role prompt16_dblink_test';
  end if;
  execute format('create role prompt16_dblink_test login password %L', v_password);
  execute 'grant authenticated to prompt16_dblink_test';
  perform set_config('prompt16.dblink_password', v_password, false);
end;
$$;

delete from public.audit_logs
where workspace_id = '20000000-0000-4000-8000-000000000010';
delete from public.payment_reversals
where workspace_id = '20000000-0000-4000-8000-000000000010';
delete from public.payments
where workspace_id = '20000000-0000-4000-8000-000000000010';
delete from public.debts
where workspace_id = '20000000-0000-4000-8000-000000000010';
delete from public.customers
where workspace_id = '20000000-0000-4000-8000-000000000010';
delete from public.workspace_members
where workspace_id = '20000000-0000-4000-8000-000000000010';
delete from public.workspaces
where id = '20000000-0000-4000-8000-000000000010';
delete from auth.users
where id = '10000000-0000-4000-8000-000000000010';

insert into auth.users (id, email, aud, role)
values (
  '10000000-0000-4000-8000-000000000010',
  'concurrency-owner@example.test',
  'authenticated',
  'authenticated'
);
insert into public.workspaces (id, created_by, name, timezone)
values (
  '20000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000010',
  'Oficina Concorrente',
  'America/Fortaleza'
);
insert into public.workspace_members (workspace_id, user_id, role, created_by)
values (
  '20000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000010',
  'owner',
  '10000000-0000-4000-8000-000000000010'
);
insert into public.customers (id, workspace_id, name)
values (
  '30000000-0000-4000-8000-000000000010',
  '20000000-0000-4000-8000-000000000010',
  'Cliente Concorrência'
);
insert into public.debts (
  id, workspace_id, customer_id, description, total_cents, service_date
) values (
  '40000000-0000-4000-8000-000000000010',
  '20000000-0000-4000-8000-000000000010',
  '30000000-0000-4000-8000-000000000010',
  'Serviço concorrente',
  10000,
  '2026-11-27'
);

begin;

create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
select plan(7);

select dblink_connect(
  'prompt16_payment_1',
  'host=supabase_db_fiados-moreira port=5432 dbname=' || current_database()
    || ' user=prompt16_dblink_test password=' || current_setting('prompt16.dblink_password')
);
select dblink_connect(
  'prompt16_payment_2',
  'host=supabase_db_fiados-moreira port=5432 dbname=' || current_database()
    || ' user=prompt16_dblink_test password=' || current_setting('prompt16.dblink_password')
);
select dblink_exec(
  'prompt16_payment_1',
  $session$
    begin;
    set local role authenticated;
    set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000010';
  $session$
);
select dblink_exec(
  'prompt16_payment_2',
  $session$
    begin;
    set local role authenticated;
    set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000010';
  $session$
);

select lives_ok(
  $test$
    select * from dblink(
      'prompt16_payment_1',
      $remote$
        select (public.register_payment(
          '20000000-0000-4000-8000-000000000010',
          '50000000-0000-4000-8000-000000000010',
          '60000000-0000-4000-8000-000000000010',
          '40000000-0000-4000-8000-000000000010',
          7000,
          'pix',
          '2026-11-27T12:00:00Z',
          null
        )).id
      $remote$
    ) as result(id uuid)
  $test$,
  'the first concurrent payment acquires the debt lock'
);
select is(
  dblink_send_query(
    'prompt16_payment_2',
    $remote$
      select (public.register_payment(
        '20000000-0000-4000-8000-000000000010',
        '50000000-0000-4000-8000-000000000011',
        '60000000-0000-4000-8000-000000000011',
        '40000000-0000-4000-8000-000000000010',
        7000,
        'cash',
        '2026-11-27T12:01:00Z',
        null
      )).id
    $remote$
  ),
  1,
  'the second payment starts in a separate transaction'
);
select pg_sleep(0.2);
select is(
  dblink_is_busy('prompt16_payment_2'),
  1,
  'the second payment waits for the locked debt row'
);
select dblink_exec('prompt16_payment_1', 'commit');
select is(
  (
    select count(*)::integer
    from dblink_get_result('prompt16_payment_2', false) as result(id uuid)
  ),
  0,
  'the second payment is rejected after the balance is revalidated'
);
select is(
  (
    select count(*)::integer
    from dblink_get_result('prompt16_payment_2', false) as result(id uuid)
  ),
  0,
  'the rejected asynchronous query is fully drained'
);
select dblink_exec('prompt16_payment_2', 'rollback');
select is(
  (
    select count(*)
    from public.payments
    where workspace_id = '20000000-0000-4000-8000-000000000010'
  ),
  1::bigint,
  'concurrent requests persist only one payment'
);
select is(
  (
    select coalesce(sum(amount_cents), 0)::bigint
    from public.payments
    where workspace_id = '20000000-0000-4000-8000-000000000010'
  ),
  7000::bigint,
  'concurrent requests cannot overpay the debt'
);

select dblink_disconnect('prompt16_payment_1');
select dblink_disconnect('prompt16_payment_2');

select * from finish();
rollback;

delete from public.audit_logs
where workspace_id = '20000000-0000-4000-8000-000000000010';
delete from public.payment_reversals
where workspace_id = '20000000-0000-4000-8000-000000000010';
delete from public.payments
where workspace_id = '20000000-0000-4000-8000-000000000010';
delete from public.debts
where workspace_id = '20000000-0000-4000-8000-000000000010';
delete from public.customers
where workspace_id = '20000000-0000-4000-8000-000000000010';
delete from public.workspace_members
where workspace_id = '20000000-0000-4000-8000-000000000010';
delete from public.workspaces
where id = '20000000-0000-4000-8000-000000000010';
delete from auth.users
where id = '10000000-0000-4000-8000-000000000010';
drop role prompt16_dblink_test;
