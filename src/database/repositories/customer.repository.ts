import type { CustomerRow } from '@/database/schema';
import { AppDatabaseError, mapDatabaseError } from '@/database/errors/DatabaseError';
import type { SqlExecutor } from '@/database/types/executor';
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from '@/features/customers/domain/customerSchemas';
import { createUuid } from '@/utils/uuid';

const SELECT = `select id, workspace_id as workspaceId, name, phone, whatsapp, address, notes,
  created_at as createdAt, updated_at as updatedAt, archived_at as archivedAt,
  deleted_at as deletedAt from customers`;

export class CustomerRepository {
  constructor(private readonly executor: SqlExecutor) {}

  async create(workspaceId: string, input: CreateCustomerInput): Promise<CustomerRow> {
    const value = createCustomerSchema.safeParse(input);
    if (!value.success)
      throw new AppDatabaseError('VALIDATION_ERROR', 'Dados do cliente inválidos.');
    const id = createUuid();
    try {
      await this.executor.run(
        `insert into customers (id, workspace_id, name, phone, whatsapp, address, notes)
         values (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          workspaceId,
          value.data.name,
          value.data.phone ?? null,
          value.data.whatsapp ?? null,
          value.data.address ?? null,
          value.data.notes ?? null,
        ],
      );
      return (await this.findById(workspaceId, id)) as CustomerRow;
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  findById(workspaceId: string, id: string): Promise<CustomerRow | null> {
    return this.executor.get<CustomerRow>(`${SELECT} where workspace_id = ? and id = ?`, [
      workspaceId,
      id,
    ]);
  }

  list(workspaceId: string, includeArchived = false): Promise<CustomerRow[]> {
    return this.executor.all<CustomerRow>(
      `${SELECT} where workspace_id = ? and deleted_at is null${includeArchived ? '' : ' and archived_at is null'} order by name collate nocase`,
      [workspaceId],
    );
  }

  search(workspaceId: string, query: string): Promise<CustomerRow[]> {
    const term = `%${query.trim()}%`;
    return this.executor.all<CustomerRow>(
      `${SELECT} where workspace_id = ? and deleted_at is null and archived_at is null
       and (name like ? escape '\\' or phone like ? escape '\\') order by name collate nocase`,
      [workspaceId, term, term],
    );
  }

  async update(workspaceId: string, id: string, input: UpdateCustomerInput): Promise<CustomerRow> {
    const value = updateCustomerSchema.safeParse(input);
    if (!value.success)
      throw new AppDatabaseError('VALIDATION_ERROR', 'Dados do cliente inválidos.');
    const current = await this.findById(workspaceId, id);
    if (!current) throw new AppDatabaseError('RECORD_NOT_FOUND', 'Cliente não encontrado.');
    const next = {
      name: value.data.name ?? current.name,
      phone: value.data.phone === undefined ? current.phone : value.data.phone,
      whatsapp: value.data.whatsapp === undefined ? current.whatsapp : value.data.whatsapp,
      address: value.data.address === undefined ? current.address : value.data.address,
      notes: value.data.notes === undefined ? current.notes : value.data.notes,
    };
    await this.executor.run(
      `update customers set name = ?, phone = ?, whatsapp = ?, address = ?, notes = ?,
       updated_at = ? where workspace_id = ? and id = ?`,
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
    return (await this.findById(workspaceId, id)) as CustomerRow;
  }

  archive(workspaceId: string, id: string, at = new Date().toISOString()): Promise<void> {
    return this.setArchivedAt(workspaceId, id, at);
  }

  restore(workspaceId: string, id: string): Promise<void> {
    return this.setArchivedAt(workspaceId, id, null);
  }

  async hasFinancialHistory(workspaceId: string, id: string): Promise<boolean> {
    const row = await this.executor.get<{ count: number }>(
      `select count(*) as count from debts where workspace_id = ? and customer_id = ?`,
      [workspaceId, id],
    );
    return (row?.count ?? 0) > 0;
  }

  private async setArchivedAt(
    workspaceId: string,
    id: string,
    value: string | null,
  ): Promise<void> {
    const result = await this.executor.run(
      `update customers set archived_at = ?, updated_at = ? where workspace_id = ? and id = ?`,
      [value, new Date().toISOString(), workspaceId, id],
    );
    if (!result.changes) throw new AppDatabaseError('RECORD_NOT_FOUND', 'Cliente não encontrado.');
  }
}
