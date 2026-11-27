import { paymentMethods, type PaymentMethod } from '@/database/schema';
import type { SqlExecutor, SqlParams } from '@/database/types/executor';
import { listCivilDates } from '@/features/dashboard/domain/dashboardDateUtils';
import { resolveReportDateRange } from '@/features/reports/domain/reportPeriods';
import type {
  FinancialReportSnapshot,
  ReportCustomerRanking,
  ReportDailyReceipt,
  ReportFilterOption,
  ReportFilters,
  ReportMethodBreakdown,
  ReportMovement,
  ReportReceivable,
} from '@/features/reports/domain/reportTypes';
import { getCivilDate } from '@/utils/date';

type BalanceRow = ReportReceivable;

const BALANCES_CTE = `with debt_balances as (
  select d.id as debtId, d.customer_id as customerId, c.name as customerName,
    d.description, d.due_date as dueDate, d.total_cents as originalCents,
    coalesce(sum(case when r.id is null then p.amount_cents else 0 end), 0) as paidCents,
    d.total_cents - coalesce(sum(case when r.id is null then p.amount_cents else 0 end), 0)
      as pendingCents
  from debts d
  inner join customers c on c.workspace_id = d.workspace_id and c.id = d.customer_id
  left join payments p on p.workspace_id = d.workspace_id and p.debt_id = d.id
  left join payment_reversals r
    on r.workspace_id = p.workspace_id and r.payment_id = p.id
  where d.workspace_id = ? and d.canceled_at is null
  group by d.id, d.customer_id, c.name, d.description, d.due_date, d.total_cents
)`;

export class ReportRepository {
  constructor(private readonly executor: SqlExecutor) {}

  async getSnapshot(
    workspaceId: string,
    timezone: string,
    filters: ReportFilters,
    referenceDate = new Date(),
  ): Promise<FinancialReportSnapshot> {
    const range = resolveReportDateRange(filters, timezone, referenceDate);
    const currentCivilDate = getCivilDate(referenceDate, timezone);
    const [receivables, movements] = await Promise.all([
      this.listCurrentReceivables(workspaceId, filters),
      this.listMovements(workspaceId, range.startAt, range.endAt, filters),
    ]);
    const overdueDebts = receivables.filter(
      (item) => item.dueDate !== null && item.dueDate < currentCivilDate,
    );
    const dailyReceipts = buildDailyReceipts(
      movements,
      timezone,
      range.startCivilDate,
      range.endCivilDateExclusive,
    );
    const methodBreakdown = buildMethodBreakdown(movements);
    const customerRanking = buildCustomerRanking(receivables, currentCivilDate);
    const grossReceivedCents = movements
      .filter(({ type }) => type === 'payment')
      .reduce((total, item) => total + item.amountCents, 0);
    const reversedCents = movements
      .filter(({ type }) => type === 'reversal')
      .reduce((total, item) => total + item.amountCents, 0);
    return {
      range,
      currentCivilDate,
      summary: {
        currentReceivableCents: receivables.reduce((total, item) => total + item.pendingCents, 0),
        currentOverdueCents: overdueDebts.reduce((total, item) => total + item.pendingCents, 0),
        currentOpenDebtCount: receivables.length,
        grossReceivedCents,
        reversedCents,
        netReceivedCents: grossReceivedCents - reversedCents,
        paymentCount: movements.filter(({ type }) => type === 'payment').length,
        reversalCount: movements.filter(({ type }) => type === 'reversal').length,
      },
      dailyReceipts,
      methodBreakdown,
      customerRanking,
      receivables,
      overdueDebts,
      movements,
    };
  }

  listFilterOptions(workspaceId: string): Promise<ReportFilterOption[]> {
    return this.executor.all<ReportFilterOption>(
      `select id, name from customers
       where workspace_id = ? and deleted_at is null order by name collate nocase, id`,
      [workspaceId],
    );
  }

  private listCurrentReceivables(
    workspaceId: string,
    filters: ReportFilters,
  ): Promise<BalanceRow[]> {
    const conditions = ['pendingCents > 0'];
    const params: string[] = [workspaceId];
    if (filters.customerId) {
      conditions.push('customerId = ?');
      params.push(filters.customerId);
    }
    if (filters.financialStatus === 'pending') conditions.push('paidCents = 0');
    if (filters.financialStatus === 'partially_paid') conditions.push('paidCents > 0');
    return this.executor.all<BalanceRow>(
      `${BALANCES_CTE}
       select debtId, customerId, customerName, description, dueDate, originalCents,
         paidCents, pendingCents,
         case when paidCents > 0 then 'partially_paid' else 'pending' end as financialStatus
       from debt_balances where ${conditions.join(' and ')}
       order by pendingCents desc, dueDate is null, dueDate, debtId`,
      params,
    );
  }

  private listMovements(
    workspaceId: string,
    startAt: string,
    endAt: string,
    filters: ReportFilters,
  ): Promise<ReportMovement[]> {
    const paymentConditions = ['p.workspace_id = ?', 'p.paid_at >= ?', 'p.paid_at < ?'];
    const reversalConditions = ['r.workspace_id = ?', 'r.reversed_at >= ?', 'r.reversed_at < ?'];
    const paymentParams: SqlParams[number][] = [workspaceId, startAt, endAt];
    const reversalParams: SqlParams[number][] = [workspaceId, startAt, endAt];
    if (filters.customerId) {
      paymentConditions.push('d.customer_id = ?');
      reversalConditions.push('d.customer_id = ?');
      paymentParams.push(filters.customerId);
      reversalParams.push(filters.customerId);
    }
    if (filters.paymentMethod !== 'all') {
      paymentConditions.push('p.payment_method = ?');
      reversalConditions.push('p.payment_method = ?');
      paymentParams.push(filters.paymentMethod);
      reversalParams.push(filters.paymentMethod);
    }
    return this.executor.all<ReportMovement>(
      `select * from (
        select 'payment:' || p.id as id, 'payment' as type, p.paid_at as occurredAt,
          p.amount_cents as amountCents, p.payment_method as paymentMethod,
          p.id as paymentId, d.id as debtId, d.customer_id as customerId,
          c.name as customerName, d.description as debtDescription
        from payments p
        inner join debts d on d.workspace_id = p.workspace_id and d.id = p.debt_id
        inner join customers c on c.workspace_id = d.workspace_id and c.id = d.customer_id
        where ${paymentConditions.join(' and ')}
        union all
        select 'reversal:' || r.id, 'reversal', r.reversed_at, p.amount_cents,
          p.payment_method, p.id, d.id, d.customer_id, c.name, d.description
        from payment_reversals r
        inner join payments p on p.workspace_id = r.workspace_id and p.id = r.payment_id
        inner join debts d on d.workspace_id = p.workspace_id and d.id = p.debt_id
        inner join customers c on c.workspace_id = d.workspace_id and c.id = d.customer_id
        where ${reversalConditions.join(' and ')}
      ) movements order by occurredAt desc, id desc`,
      [...paymentParams, ...reversalParams],
    );
  }
}

function buildDailyReceipts(
  movements: ReportMovement[],
  timezone: string,
  startCivilDate: string,
  endCivilDateExclusive: string,
): ReportDailyReceipt[] {
  const dates = listCivilDates(startCivilDate, endCivilDateExclusive);
  const values = new Map<string, ReportDailyReceipt>(
    dates.map((civilDate) => [
      civilDate,
      { civilDate, grossCents: 0, reversedCents: 0, netCents: 0 },
    ]),
  );
  for (const movement of movements) {
    const day = values.get(getCivilDate(new Date(movement.occurredAt), timezone));
    if (!day) continue;
    if (movement.type === 'payment') day.grossCents += movement.amountCents;
    else day.reversedCents += movement.amountCents;
    day.netCents = day.grossCents - day.reversedCents;
  }
  return dates.map((date) => values.get(date) as ReportDailyReceipt);
}

function buildMethodBreakdown(movements: ReportMovement[]): ReportMethodBreakdown[] {
  const values = new Map<PaymentMethod, ReportMethodBreakdown>(
    paymentMethods.map((paymentMethod) => [
      paymentMethod,
      { paymentMethod, grossCents: 0, reversedCents: 0, netCents: 0 },
    ]),
  );
  for (const movement of movements) {
    const item = values.get(movement.paymentMethod);
    if (!item) continue;
    if (movement.type === 'payment') item.grossCents += movement.amountCents;
    else item.reversedCents += movement.amountCents;
    item.netCents = item.grossCents - item.reversedCents;
  }
  return [...values.values()].filter(
    ({ grossCents, reversedCents }) => grossCents !== 0 || reversedCents !== 0,
  );
}

function buildCustomerRanking(
  receivables: ReportReceivable[],
  currentCivilDate: string,
): ReportCustomerRanking[] {
  const values = new Map<string, ReportCustomerRanking>();
  for (const debt of receivables) {
    const current = values.get(debt.customerId) ?? {
      customerId: debt.customerId,
      customerName: debt.customerName,
      pendingCents: 0,
      overdueCents: 0,
      openDebtCount: 0,
    };
    current.pendingCents += debt.pendingCents;
    current.openDebtCount += 1;
    if (debt.dueDate && debt.dueDate < currentCivilDate) {
      current.overdueCents += debt.pendingCents;
    }
    values.set(debt.customerId, current);
  }
  return [...values.values()].sort(
    (left, right) =>
      right.pendingCents - left.pendingCents ||
      left.customerName.localeCompare(right.customerName, 'pt-BR'),
  );
}
