create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.workspaces (
  id uuid primary key,
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 200),
  timezone text not null check (length(trim(timezone)) between 1 and 100),
  currency text not null default 'BRL' check (currency = 'BRL'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_workspace_idx
  on public.workspace_members (user_id, workspace_id);

create table public.customers (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 200),
  phone text,
  whatsapp text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  unique (workspace_id, id)
);

create index customers_workspace_name_idx on public.customers (workspace_id, name);
create index customers_workspace_phone_idx on public.customers (workspace_id, phone);
create index customers_workspace_archived_idx on public.customers (workspace_id, archived_at);

create table public.vehicles (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  customer_id uuid not null,
  type text not null check (type in ('motorcycle', 'car', 'truck', 'van', 'other')),
  brand text not null check (length(trim(brand)) between 1 and 80),
  model text not null check (length(trim(model)) between 1 and 80),
  year integer check (year is null or year between 1886 and 9999),
  plate text,
  color text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  unique (workspace_id, id),
  unique (workspace_id, customer_id, id),
  constraint vehicles_workspace_customer_fk
    foreign key (workspace_id, customer_id)
    references public.customers(workspace_id, id) on delete restrict
);

create index vehicles_workspace_customer_idx on public.vehicles (workspace_id, customer_id);
create index vehicles_workspace_plate_idx on public.vehicles (workspace_id, plate);

create table public.debts (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  customer_id uuid not null,
  vehicle_id uuid,
  description text not null check (length(trim(description)) between 1 and 500),
  total_cents bigint not null check (total_cents > 0 and total_cents <= 99999999999),
  service_date date not null,
  due_date date,
  notes text,
  canceled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  constraint debts_workspace_customer_fk
    foreign key (workspace_id, customer_id)
    references public.customers(workspace_id, id) on delete restrict,
  constraint debts_workspace_customer_vehicle_fk
    foreign key (workspace_id, customer_id, vehicle_id)
    references public.vehicles(workspace_id, customer_id, id) on delete restrict,
  constraint debts_cancellation_check check (
    (canceled_at is null and cancellation_reason is null)
    or (canceled_at is not null and length(trim(cancellation_reason)) > 0)
  )
);

create index debts_workspace_customer_idx on public.debts (workspace_id, customer_id);
create index debts_workspace_due_date_idx on public.debts (workspace_id, due_date);
create index debts_workspace_service_date_idx on public.debts (workspace_id, service_date);
create index debts_workspace_canceled_idx on public.debts (workspace_id, canceled_at);
create index debts_workspace_vehicle_idx on public.debts (workspace_id, vehicle_id);

create table public.payments (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  debt_id uuid not null,
  operation_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 99999999999),
  payment_method text not null check (
    payment_method in ('cash', 'pix', 'debit_card', 'credit_card', 'bank_transfer', 'other')
  ),
  paid_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, operation_id),
  constraint payments_workspace_debt_fk
    foreign key (workspace_id, debt_id)
    references public.debts(workspace_id, id) on delete restrict
);

create index payments_workspace_debt_idx on public.payments (workspace_id, debt_id);
create index payments_workspace_paid_at_idx on public.payments (workspace_id, paid_at);

create table public.payment_reversals (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  payment_id uuid not null,
  operation_id uuid not null,
  reason text not null check (length(trim(reason)) between 1 and 500),
  reversed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, payment_id),
  unique (workspace_id, operation_id),
  constraint payment_reversals_workspace_payment_fk
    foreign key (workspace_id, payment_id)
    references public.payments(workspace_id, id) on delete restrict
);

create table public.reminders (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  debt_id uuid not null,
  type text not null check (type in ('before_due', 'due_date', 'overdue', 'custom')),
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (
    status in ('pending', 'scheduled', 'delivered', 'canceled', 'failed')
  ),
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, debt_id, type, scheduled_at),
  constraint reminders_workspace_debt_fk
    foreign key (workspace_id, debt_id)
    references public.debts(workspace_id, id) on delete restrict
);

create index reminders_workspace_status_scheduled_idx
  on public.reminders (workspace_id, status, scheduled_at);

create table public.settings (
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  key text not null check (length(trim(key)) between 1 and 120),
  value_json jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, key)
);

create table public.collection_attempts (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  customer_id uuid not null,
  debt_id uuid,
  template_type text not null check (
    template_type in ('before_due', 'due_date', 'overdue', 'no_due')
  ),
  attempted_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint collection_attempts_workspace_customer_fk
    foreign key (workspace_id, customer_id)
    references public.customers(workspace_id, id) on delete restrict,
  constraint collection_attempts_workspace_debt_fk
    foreign key (workspace_id, debt_id)
    references public.debts(workspace_id, id) on delete restrict
);

create index collection_attempts_workspace_customer_attempted_idx
  on public.collection_attempts (workspace_id, customer_id, attempted_at);
create index collection_attempts_workspace_debt_attempted_idx
  on public.collection_attempts (workspace_id, debt_id, attempted_at);

create table public.audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete restrict,
  entity_type text not null check (length(trim(entity_type)) between 1 and 120),
  entity_id uuid not null,
  action text not null check (
    action in ('create', 'update', 'archive', 'cancel', 'payment_registered', 'payment_reversed', 'restore')
  ),
  operation_id uuid,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, operation_id)
);

create index audit_logs_workspace_entity_idx
  on public.audit_logs (workspace_id, entity_type, entity_id);
create index audit_logs_workspace_created_idx
  on public.audit_logs (workspace_id, created_at);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger workspaces_set_updated_at before update on public.workspaces
for each row execute function private.set_updated_at();
create trigger workspace_members_set_updated_at before update on public.workspace_members
for each row execute function private.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
for each row execute function private.set_updated_at();
create trigger vehicles_set_updated_at before update on public.vehicles
for each row execute function private.set_updated_at();
create trigger debts_set_updated_at before update on public.debts
for each row execute function private.set_updated_at();
create trigger reminders_set_updated_at before update on public.reminders
for each row execute function private.set_updated_at();
create trigger settings_set_updated_at before update on public.settings
for each row execute function private.set_updated_at();

revoke execute on function private.set_updated_at() from public, anon, authenticated;
