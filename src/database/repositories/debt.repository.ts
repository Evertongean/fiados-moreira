import { AppDatabaseError, mapDatabaseError } from '@/database/errors/DatabaseError';
import type { DebtRow } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import {
  calculateDebtSummary,
  calculateDebtSummaryFromTotals,
  type DebtFinancialSummary,
  type PaymentAmount,
} from '@/features/debts/domain/finance';
import type { CreateDebtInput, UpdateDebtInput } from '@/features/debts/domain/debtSchemas';
import type {
  DebtListOptions,
  DebtOverview,
  DebtPaymentDetails,
} from '@/features/debts/domain/debtTypes';
import { normalizeDebtSearch } from '@/features/debts/domain/debtUtils';
import { calculateDebtStatus } from '@/features/debts/domain/status';
import { normalizeBrazilianPlate } from '@/utils/plate';
import { createUuid } from '@/utils/uuid';

const SELECT = `select id, workspace_id as workspaceId, customer_id as customerId,
  vehicle_id as vehicleId, description, total_cents as totalCents, service_date as serviceDate,
  due_date as dueDate, notes, canceled_at as canceledAt,
  cancellation_reason as cancellationReason, created_at as createdAt, updated_at as updatedAt
  from debts`;

interface DebtOverviewRow extends DebtRow {
  customerName: string;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehiclePlate: string | null;
  grossPaidCents: number;
  reversedCents: number;
}

const OVERVIEW_SELECT = `select d.id, d.workspace_id as workspaceId,
  d.customer_id as customerId, d.vehicle_id as vehicleId, d.description,
  d.total_cents as totalCents, d.service_date as serviceDate, d.due_date as dueDate,
  d.notes, d.canceled_at as canceledAt, d.cancellation_reason as cancellationReason,
  d.created_at as createdAt, d.updated_at as updatedAt, c.name as customerName,
  v.brand as vehicleBrand, v.model as vehicleModel, v.plate as vehiclePlate,
  coalesce(sum(p.amount_cents), 0) as grossPaidCents,
  coalesce(sum(case when r.id is not null then p.amount_cents else 0 end), 0) as reversedCents
  from debts d
  inner join customers c on c.workspace_id = d.workspace_id and c.id = d.customer_id
  left join vehicles v on v.workspace_id = d.workspace_id and v.id = d.vehicle_id
  left join payments p on p.workspace_id = d.workspace_id and p.debt_id = d.id
  left join payment_reversals r on r.workspace_id = p.workspace_id and r.payment_id = p.id`;

const OVERVIEW_GROUP = `group by d.id, d.workspace_id, d.customer_id, d.vehicle_id,
  d.description, d.total_cents, d.service_date, d.due_date, d.notes, d.canceled_at,
  d.cancellation_reason, d.created_at, d.updated_at, c.name, v.brand, v.model, v.plate`;

export class DebtRepository {
  constructor(private readonly executor: SqlExecutor) {}

  async insertValidated(workspaceId: string, input: CreateDebtInput): Promise<DebtRow> {
    return this.insertWithId(workspaceId, createUuid(), input);
  }

  async insertWithId(workspaceId: string, id: string, input: CreateDebtInput): Promise<DebtRow> {
    try {
      const now = new Date().toISOString();
      await this.executor.run(
        `insert into debts
         (id, workspace_id, customer_id, vehicle_id, description, total_cents, service_date,
          due_date, notes, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          now,
          now,
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

  async findOverview(
    workspaceId: string,
    id: string,
    timezone: string,
    referenceDate?: Date,
  ): Promise<DebtOverview | null> {
    const row = await this.executor.get<DebtOverviewRow>(
      `${OVERVIEW_SELECT} where d.workspace_id = ? and d.id = ? ${OVERVIEW_GROUP}`,
      [workspaceId, id],
    );
    return row ? this.toOverview(row, timezone, referenceDate) : null;
  }

  async listOverview(workspaceId: string, options: DebtListOptions): Promise<DebtOverview[]> {
    const conditions = ['d.workspace_id = ?'];
    const params: string[] = [workspaceId];
    if (options.customerId) {
      conditions.push('d.customer_id = ?');
      params.push(options.customerId);
    }
    if (options.vehicleId) {
      conditions.push('d.vehicle_id = ?');
      params.push(options.vehicleId);
    }
    const rows = await this.executor.all<DebtOverviewRow>(
      `${OVERVIEW_SELECT} where ${conditions.join(' and ')} ${OVERVIEW_GROUP}
       order by d.service_date desc, d.created_at desc`,
      params,
    );
    const query = normalizeDebtSearch(options.query ?? '');
    const plateQuery = normalizeBrazilianPlate(options.query);
    const filter = options.filter ?? 'all';
    return rows
      .map((row) => this.toOverview(row, options.timezone, options.referenceDate))
      .filter((debt) => {
        if (query) {
          const haystack = normalizeDebtSearch(
            [debt.customerName, debt.description, debt.vehiclePlate ?? ''].join(' '),
          );
          const matchesText = haystack.includes(query);
          const matchesPlate = Boolean(plateQuery && debt.vehiclePlate?.includes(plateQuery));
          if (!matchesText && !matchesPlate) return false;
        }
        if (filter === 'all') return true;
        if (filter === 'overdue') return debt.status.isOverdue;
        return debt.status.financialStatus === filter;
      });
  }

  listByVehicle(
    workspaceId: string,
    vehicleId: string,
    options: Omit<DebtListOptions, 'vehicleId'>,
  ): Promise<DebtOverview[]> {
    return this.listOverview(workspaceId, { ...options, vehicleId });
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

  listPayments(workspaceId: string, debtId: string): Promise<DebtPaymentDetails[]> {
    return this.executor.all<DebtPaymentDetails>(
      `select p.id, p.amount_cents as amountCents, p.payment_method as paymentMethod,
       p.paid_at as paidAt, p.notes, r.reversed_at as reversedAt,
       r.reason as reversalReason
       from payments p left join payment_reversals r
       on r.workspace_id = p.workspace_id and r.payment_id = p.id
       where p.workspace_id = ? and p.debt_id = ? order by p.paid_at desc`,
      [workspaceId, debtId],
    );
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

  private toOverview(row: DebtOverviewRow, timezone: string, referenceDate?: Date): DebtOverview {
    const { grossPaidCents, reversedCents, ...debt } = row;
    const summary = calculateDebtSummaryFromTotals(debt.totalCents, grossPaidCents, reversedCents);
    return {
      ...debt,
      summary,
      status: calculateDebtStatus({
        summary,
        canceledAt: debt.canceledAt,
        dueDate: debt.dueDate,
        timezone,
        referenceDate,
      }),
    };
  }
}
