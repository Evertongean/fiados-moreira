import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDirectory = join(process.cwd(), 'supabase', 'migrations');
const schemaSql = readFileSync(
  join(migrationsDirectory, '20261127000100_initial_schema.sql'),
  'utf8',
).toLowerCase();
const securitySql = readFileSync(
  join(migrationsDirectory, '20261127000200_security_and_financial_rpc.sql'),
  'utf8',
).toLowerCase();

const remoteTables = [
  'workspaces',
  'workspace_members',
  'customers',
  'vehicles',
  'debts',
  'payments',
  'payment_reversals',
  'reminders',
  'settings',
  'collection_attempts',
  'audit_logs',
] as const;

describe('Supabase migration contract', () => {
  it('maps persistent domain entities and omits device-only state', () => {
    for (const table of remoteTables) {
      expect(schemaSql).toContain(`create table public.${table}`);
    }
    expect(schemaSql).not.toContain('create table public.sync_queue');
    expect(schemaSql).not.toContain('notification_identifier');
  });

  it('enables RLS and denies anonymous access on every exposed table', () => {
    expect(securitySql).toContain('revoke all on all tables in schema public from anon');
    for (const table of remoteTables) {
      expect(securitySql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(securitySql).not.toMatch(/create policy [\s\S]*?\bto anon\b/);
  });

  it('keeps financial tables read-only outside the audited RPCs', () => {
    expect(securitySql).not.toMatch(/grant (insert|update|delete)[^;]*public\.debts/);
    expect(securitySql).not.toMatch(/grant (insert|update|delete)[^;]*public\.payments/);
    expect(securitySql).not.toMatch(/grant (insert|update|delete)[^;]*public\.payment_reversals/);
    expect(securitySql).not.toMatch(/grant (insert|update|delete)[^;]*public\.audit_logs/);

    for (const rpc of [
      'create_debt',
      'update_debt',
      'cancel_debt',
      'register_payment',
      'reverse_payment',
    ]) {
      expect(securitySql).toContain(`create or replace function public.${rpc}`);
      expect(securitySql).toContain(`grant execute on function public.${rpc}`);
    }
  });

  it('serializes balance-changing operations and enforces idempotency', () => {
    const financialFunctions = securitySql.slice(
      securitySql.indexOf('create or replace function public.update_debt'),
      securitySql.indexOf(
        'revoke execute on function public.create_workspace',
        securitySql.indexOf('create or replace function public.update_debt'),
      ),
    );
    expect(financialFunctions.match(/public\.debts[\s\S]*?for update/g)).toHaveLength(4);
    expect(financialFunctions).toContain("raise exception 'payment_exceeds_balance'");
    expect(financialFunctions).toContain("raise exception 'idempotency_conflict'");
    expect(securitySql).toContain('private.lock_operation');
    expect(securitySql).toContain('pg_advisory_xact_lock');
    expect(schemaSql).toContain('unique (workspace_id, operation_id)');
    expect(schemaSql).toContain('unique (workspace_id, payment_id)');
  });

  it('uses authenticated workspace membership for isolation and server functions', () => {
    expect(securitySql).toContain('private.is_workspace_member');
    expect(securitySql).toContain('private.has_workspace_role');
    expect(securitySql).toContain("raise exception 'workspace_access_denied'");
    expect(securitySql).toContain("raise exception 'workspace_owner_required'");
    expect(securitySql).toContain("set search_path = ''");
    expect(securitySql).toContain('from public, anon');
    expect(securitySql).toContain('to authenticated');
  });

  it('keeps raw idempotency payloads out of audit metadata', () => {
    expect(securitySql).toContain('private.payload_fingerprint');
    expect(securitySql).toContain("'payloadfingerprint'");
    expect(securitySql).not.toContain("jsonb_build_object('payload',");
  });
});
