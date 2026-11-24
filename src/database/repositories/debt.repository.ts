import { AppDatabaseError, mapDatabaseError } from '@/database/errors/DatabaseError';
import type { DebtRow } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import {
  calculateDebtSummary,
  type DebtFinancialSummary,
  type PaymentAmount,
} from '@/features/debts/domain/finance';
import type { CreateDebtInput, UpdateDebtInput } from '@/features/debts/domain/debtSchemas';
import { createUuid } from '@/utils/uuid';

const SELECT = `select id, workspace_id as workspaceId, customer_id as customerId,
  vehicle_id as vehicleId, description, total_cents as totalCents, service_date as serviceDate,
  due_date as dueDate, notes, canceled_at as canceledAt,
  cancellation_reason as cancellationReason, created_at as createdAt, updated_at as updatedAt
  from debts`;

export class DebtRepository {
  constructor(private readonly executor: SqlExecutor) {}

  async insertValidated(workspaceId: string, input: CreateDebtInput): Promise<DebtRow> {
    const id = createUuid();
    try {
      await this.executor.run(
        `insert into debts
         (id, workspace_id, customer_id, vehicle_id, description, total_cents, service_date, due_date, notes)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          workspaceId,
          input.customerId,
          input.vehicleId ?? null,
          input.description,
          input.totalCents,
          input.serviceDate,
          input.dueDate ?? null,
          input.notes ?? null,
        ],
      );
      return (await this.findById(workspaceId, id)) as DebtRow;
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  findById(workspaceId: string, id: string): Promise<DebtRow | null> {
    return this.executor.get<DebtRow>(`${SELECT} where workspace_id = ? and id = ?`, [
      workspaceId,
      id,
    ]);
  }

  list(workspaceId: string): Promise<DebtRow[]> {
    return this.executor.all<DebtRow>(
      `${SELECT} where workspace_id = ? order by service_date desc`,
      [workspaceId],
    );
  }

  listByCustomer(workspaceId: string, customerId: string): Promise<DebtRow[]> {
    return this.executor.all<DebtRow>(
      `${SELECT} where workspace_id = ? and customer_id = ? order by service_date desc`,
      [workspaceId, customerId],
    );
  }

  async getPaymentAmounts(workspaceId: string, debtId: string): Promise<PaymentAmount[]> {
    const rows = await this.executor.all<{ amountCents: number; reversalId: string | null }>(
      `select p.amount_cents as amountCents, r.id as reversalId
       from payments p left join payment_reversals r
       on r.workspace_id = p.workspace_id and r.payment_id = p.id
       where p.workspace_id = ? and p.debt_id = ? order by p.created_at`,
      [workspaceId, debtId],
    );
    return rows.map((row) => ({ amountCents: row.amountCents, reversed: row.reversalId !== null }));
  }

  async getFinancialSummary(workspaceId: string, debtId: string): Promise<DebtFinancialSummary> {
    const debt = await this.findById(workspaceId, debtId);
    if (!debt) throw new AppDatabaseError('RECORD_NOT_FOUND', 'Fiado não encontrado.');
    return calculateDebtSummary(debt.totalCents, await this.getPaymentAmounts(workspaceId, debtId));
  }

  async updateValidated(
    workspaceId: string,
    id: string,
    current: DebtRow,
    input: UpdateDebtInput,
  ): Promise<DebtRow> {
    const next = {
      vehicleId: input.vehicleId === undefined ? current.vehicleId : input.vehicleId,
      description: input.description ?? current.description,
      totalCents: input.totalCents ?? current.totalCents,
      serviceDate: input.serviceDate ?? current.serviceDate,
      dueDate: input.dueDate === undefined ? current.dueDate : input.dueDate,
      notes: input.notes === undefined ? current.notes : input.notes,
    };
    await this.executor.run(
      `update debts set vehicle_id = ?, description = ?, total_cents = ?, service_date = ?,
       due_date = ?, notes = ?, updated_at = ? where workspace_id = ? and id = ?`,
      [
        next.vehicleId ?? null,
        next.description,
        next.totalCents,
        next.serviceDate,
        next.dueDate ?? null,
        next.notes ?? null,
        new Date().toISOString(),
        workspaceId,
        id,
      ],
    );
    return (await this.findById(workspaceId, id)) as DebtRow;
  }

  async cancelValidated(
    workspaceId: string,
    id: string,
    reason: string,
    canceledAt: string,
  ): Promise<DebtRow> {
    const result = await this.executor.run(
      `update debts set canceled_at = ?, cancellation_reason = ?, updated_at = ?
       where workspace_id = ? and id = ? and canceled_at is null`,
      [canceledAt, reason, canceledAt, workspaceId, id],
    );
    if (!result.changes) throw new AppDatabaseError('RECORD_NOT_FOUND', 'Fiado não encontrado.');
    return (await this.findById(workspaceId, id)) as DebtRow;
  }
}
