import { AppDatabaseError, mapDatabaseError } from '@/database/errors/DatabaseError';
import type { CustomerRow } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type NormalizedCustomerInput,
  type UpdateCustomerInput,
} from '@/features/customers/domain/customerSchemas';
import type {
  CustomerFinancialSummary,
  CustomerListEntry,
  CustomerListFilters,
  PotentialDuplicate,
} from '@/features/customers/domain/customerTypes';
import { normalizeSearchText } from '@/features/customers/domain/customerUtils';
import { normalizePhoneSearch, onlyDigits } from '@/utils/phone';
import { getCivilDate } from '@/utils/date';
import { createUuid } from '@/utils/uuid';

const SELECT = `select id, workspace_id as workspaceId, name, phone, whatsapp, address, notes,
  created_at as createdAt, updated_at as updatedAt, archived_at as archivedAt,
  deleted_at as deletedAt from customers`;

function matchesQuery(customer: CustomerRow, query: string): boolean {
  const textQuery = normalizeSearchText(query);
  const phoneQuery = normalizePhoneSearch(query);
  const nameMatches = Boolean(textQuery) && normalizeSearchText(customer.name).includes(textQuery);
  const phoneMatches =
    Boolean(phoneQuery) &&
    [customer.phone, customer.whatsapp].some((value) =>
      normalizePhoneSearch(onlyDigits(value ?? '')).includes(phoneQuery),
    );
  return nameMatches || phoneMatches;
}

function sortCustomerEntries(
  left: CustomerListEntry,
  right: CustomerListEntry,
  sort: CustomerListFilters['sort'] = 'name_asc',
): number {
  if (sort === 'newest' || sort === 'oldest') {
    const result = left.createdAt.localeCompare(right.createdAt);
    if (result !== 0) return sort === 'newest' ? -result : result;
  }
  if (sort === 'balance_desc' || sort === 'balance_asc') {
    const result = left.outstandingCents - right.outstandingCents;
    if (result !== 0) return sort === 'balance_desc' ? -result : result;
  }
  const result = left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' });
  if (result !== 0) return sort === 'name_desc' ? -result : result;
  return left.id.localeCompare(right.id);
}

export class CustomerRepository {
  constructor(private readonly executor: SqlExecutor) {}

  async create(workspaceId: string, input: CreateCustomerInput): Promise<CustomerRow> {
    return this.insertWithId(workspaceId, createUuid(), input);
  }

  async insertWithId(
    workspaceId: string,
    id: string,
    input: CreateCustomerInput | NormalizedCustomerInput,
  ): Promise<CustomerRow> {
    const value = createCustomerSchema.safeParse(input);
    if (!value.success)
      throw new AppDatabaseError('CUSTOMER_VALIDATION_ERROR', 'Dados do cliente inválidos.');
    try {
      const now = new Date().toISOString();
      await this.executor.run(
        `insert into customers
         (id, workspace_id, name, phone, whatsapp, address, notes, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          workspaceId,
          value.data.name,
          value.data.phone,
          value.data.whatsapp,
          value.data.address,
          value.data.notes,
          now,
          now,
        ],
      );
      const created = await this.findById(workspaceId, id);
      if (!created)
        throw new AppDatabaseError(
          'CUSTOMER_CREATION_FAILED',
          'Não foi possível salvar o cliente.',
        );
      return created;
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  findById(workspaceId: string, id: string): Promise<CustomerRow | null> {
    return this.executor.get<CustomerRow>(
      `${SELECT} where workspace_id = ? and id = ? and deleted_at is null`,
      [workspaceId, id],
    );
  }

  async list(workspaceId: string, filters: CustomerListFilters = {}): Promise<CustomerRow[]> {
    const status = filters.status ?? 'active';
    const statusClause =
      status === 'active'
        ? ' and archived_at is null'
        : status === 'archived'
          ? ' and archived_at is not null'
          : '';
    const outstandingClause = filters.outstandingOnly
      ? ` and exists (
          select 1 from debts d
          where d.workspace_id = customers.workspace_id and d.customer_id = customers.id
            and d.canceled_at is null and d.total_cents > coalesce((
              select sum(case when r.id is null then p.amount_cents else 0 end)
              from payments p left join payment_reversals r
                on r.workspace_id = p.workspace_id and r.payment_id = p.id
              where p.workspace_id = d.workspace_id and p.debt_id = d.id
            ), 0)
        )`
      : '';
    const rows = await this.executor.all<CustomerRow>(
      `${SELECT} where workspace_id = ? and deleted_at is null${statusClause}${outstandingClause}`,
      [workspaceId],
    );
    const filtered = filters.query?.trim()
      ? rows.filter((customer) => matchesQuery(customer, filters.query as string))
      : rows;
    const direction = filters.sort === 'name_desc' ? -1 : 1;

    return filtered.sort((left, right) => {
      if (filters.sort === 'newest' || filters.sort === 'oldest') {
        const result = left.createdAt.localeCompare(right.createdAt);
        return filters.sort === 'newest' ? -result : result;
      }
      return direction * left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' });
    });
  }

  async listAdvanced(
    workspaceId: string,
    filters: CustomerListFilters,
    timezone: string,
    referenceDate = new Date(),
  ): Promise<CustomerListEntry[]> {
    const currentCivilDate = getCivilDate(referenceDate, timezone);
    const rows = await this.executor.all<CustomerListEntry>(
      `select c.id, c.workspace_id as workspaceId, c.name, c.phone, c.whatsapp,
        c.address, c.notes, c.created_at as createdAt, c.updated_at as updatedAt,
        c.archived_at as archivedAt, c.deleted_at as deletedAt,
        coalesce(sum(case when balances.pendingCents > 0 then balances.pendingCents else 0 end), 0)
          as outstandingCents,
        coalesce(sum(case when balances.pendingCents > 0 and balances.dueDate < ?
          then balances.pendingCents else 0 end), 0) as overdueCents
       from customers c
       left join (
         select d.id, d.workspace_id as workspaceId, d.customer_id as customerId,
           d.due_date as dueDate, d.total_cents -
             coalesce(sum(case when r.id is null then p.amount_cents else 0 end), 0) as pendingCents
         from debts d
         left join payments p on p.workspace_id = d.workspace_id and p.debt_id = d.id
         left join payment_reversals r
           on r.workspace_id = p.workspace_id and r.payment_id = p.id
         where d.workspace_id = ? and d.canceled_at is null
         group by d.id, d.workspace_id, d.customer_id, d.due_date, d.total_cents
       ) balances on balances.workspaceId = c.workspace_id and balances.customerId = c.id
       where c.workspace_id = ? and c.deleted_at is null
       group by c.id, c.workspace_id, c.name, c.phone, c.whatsapp, c.address, c.notes,
         c.created_at, c.updated_at, c.archived_at, c.deleted_at`,
      [currentCivilDate, workspaceId, workspaceId],
    );
    const status = filters.status ?? 'active';
    const debtFilter = filters.outstandingOnly ? 'with_debt' : (filters.debt ?? 'all');
    const filtered = rows.filter((customer) => {
      if (filters.query?.trim() && !matchesQuery(customer, filters.query)) return false;
      if (status === 'active' && customer.archivedAt) return false;
      if (status === 'archived' && !customer.archivedAt) return false;
      if (debtFilter === 'with_debt' && customer.outstandingCents <= 0) return false;
      if (debtFilter === 'without_debt' && customer.outstandingCents > 0) return false;
      return debtFilter !== 'overdue' || customer.overdueCents > 0;
    });
    return filtered.sort((left, right) => sortCustomerEntries(left, right, filters.sort));
  }

  search(
    workspaceId: string,
    query: string,
    filters: CustomerListFilters = {},
  ): Promise<CustomerRow[]> {
    return this.list(workspaceId, { ...filters, query });
  }

  async update(workspaceId: string, id: string, input: UpdateCustomerInput): Promise<CustomerRow> {
    const value = updateCustomerSchema.safeParse(input);
    if (!value.success)
      throw new AppDatabaseError('CUSTOMER_VALIDATION_ERROR', 'Dados do cliente inválidos.');
    const current = await this.findById(workspaceId, id);
    if (!current) throw new AppDatabaseError('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.');
    const next = {
      name: value.data.name ?? current.name,
      phone: value.data.phone === undefined ? current.phone : value.data.phone,
      whatsapp: value.data.whatsapp === undefined ? current.whatsapp : value.data.whatsapp,
      address: value.data.address === undefined ? current.address : value.data.address,
      notes: value.data.notes === undefined ? current.notes : value.data.notes,
    };
    await this.executor.run(
      `update customers set name = ?, phone = ?, whatsapp = ?, address = ?, notes = ?,
       updated_at = ? where workspace_id = ? and id = ? and deleted_at is null`,
      [
        next.name,
        next.phone,
        next.whatsapp,
        next.address,
        next.notes,
        new Date().toISOString(),
        workspaceId,
        id,
      ],
    );
    const updated = await this.findById(workspaceId, id);
    if (!updated)
      throw new AppDatabaseError('CUSTOMER_UPDATE_FAILED', 'Não foi possível atualizar o cliente.');
    return updated;
  }

  archive(workspaceId: string, id: string, at = new Date().toISOString()): Promise<void> {
    return this.setArchivedAt(workspaceId, id, at);
  }

  restore(workspaceId: string, id: string): Promise<void> {
    return this.setArchivedAt(workspaceId, id, null);
  }

  async countActive(workspaceId: string): Promise<number> {
    return this.count(workspaceId, 'archived_at is null');
  }

  async countArchived(workspaceId: string): Promise<number> {
    return this.count(workspaceId, 'archived_at is not null');
  }

  async findPotentialDuplicates(
    workspaceId: string,
    input: Pick<NormalizedCustomerInput, 'name' | 'phone' | 'whatsapp'>,
    excludeId?: string,
  ): Promise<PotentialDuplicate[]> {
    const rows = await this.list(workspaceId, { status: 'all' });
    const normalizedName = normalizeSearchText(input.name);
    return rows.flatMap((customer) => {
      if (customer.id === excludeId) return [];
      const reasons: PotentialDuplicate['reasons'] = [];
      if (normalizeSearchText(customer.name) === normalizedName) reasons.push('name');
      if (input.phone && customer.phone === input.phone) reasons.push('phone');
      if (
        input.whatsapp &&
        (customer.whatsapp === input.whatsapp || customer.phone === input.whatsapp)
      )
        reasons.push('whatsapp');
      if (input.phone && customer.whatsapp === input.phone && !reasons.includes('phone'))
        reasons.push('phone');
      return reasons.length ? [{ customer, reasons }] : [];
    });
  }

  async getFinancialSummary(
    workspaceId: string,
    customerId: string,
  ): Promise<CustomerFinancialSummary> {
    const row = await this.executor.get<CustomerFinancialSummary>(
      `select
        coalesce(sum(debt_total), 0) as totalDebtCents,
        coalesce(sum(paid_total), 0) as totalPaidCents,
        coalesce(sum(debt_total - paid_total), 0) as outstandingCents,
        coalesce(sum(case when debt_total > paid_total then 1 else 0 end), 0) as openDebtCount
       from (
         select d.id, d.total_cents as debt_total,
           coalesce(sum(case when r.id is null then p.amount_cents else 0 end), 0) as paid_total
         from debts d
         left join payments p on p.workspace_id = d.workspace_id and p.debt_id = d.id
         left join payment_reversals r on r.workspace_id = p.workspace_id and r.payment_id = p.id
         where d.workspace_id = ? and d.customer_id = ? and d.canceled_at is null
         group by d.id, d.total_cents
       )`,
      [workspaceId, customerId],
    );
    return {
      totalDebtCents: row?.totalDebtCents ?? 0,
      totalPaidCents: row?.totalPaidCents ?? 0,
      outstandingCents: row?.outstandingCents ?? 0,
      openDebtCount: row?.openDebtCount ?? 0,
    };
  }

  async hasOutstandingDebt(workspaceId: string, id: string): Promise<boolean> {
    return (await this.getFinancialSummary(workspaceId, id)).outstandingCents > 0;
  }

  async hasFinancialHistory(workspaceId: string, id: string): Promise<boolean> {
    const row = await this.executor.get<{ count: number }>(
      `select count(*) as count from debts where workspace_id = ? and customer_id = ?`,
      [workspaceId, id],
    );
    return (row?.count ?? 0) > 0;
  }

  private async count(workspaceId: string, condition: string): Promise<number> {
    const row = await this.executor.get<{ count: number }>(
      `select count(*) as count from customers where workspace_id = ? and deleted_at is null and ${condition}`,
      [workspaceId],
    );
    return row?.count ?? 0;
  }

  private async setArchivedAt(
    workspaceId: string,
    id: string,
    value: string | null,
  ): Promise<void> {
    const result = await this.executor.run(
      `update customers set archived_at = ?, updated_at = ?
       where workspace_id = ? and id = ? and deleted_at is null`,
      [value, new Date().toISOString(), workspaceId, id],
    );
    if (!result.changes)
      throw new AppDatabaseError('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.');
  }
}
