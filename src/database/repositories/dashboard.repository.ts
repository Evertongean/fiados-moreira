import type { SqlExecutor } from '@/database/types/executor';
import {
  getCivilMonthRange,
  getLastCivilDaysRange,
  listCivilDates,
} from '@/features/dashboard/domain/dashboardDateUtils';
import type {
  DashboardActivity,
  DashboardActivityType,
  DashboardDailyReceipt,
  DashboardDebt,
  DashboardSnapshot,
  DashboardSummary,
} from '@/features/dashboard/domain/dashboardTypes';
import { getCivilDate } from '@/utils/date';

const UPCOMING_LIMIT = 4;
const OVERDUE_LIMIT = 4;
const ACTIVITY_LIMIT = 6;

const DEBT_BALANCE_CTE = `with debt_balances as (
  select d.id, d.customer_id as customerId, c.name as customerName, d.description,
    d.due_date as dueDate, d.total_cents -
      coalesce(sum(case when r.id is null then p.amount_cents else 0 end), 0) as pendingCents
  from debts d
  inner join customers c on c.workspace_id = d.workspace_id and c.id = d.customer_id
  left join payments p on p.workspace_id = d.workspace_id and p.debt_id = d.id
  left join payment_reversals r
    on r.workspace_id = p.workspace_id and r.payment_id = p.id
  where d.workspace_id = ? and d.canceled_at is null
  group by d.id, d.customer_id, c.name, d.description, d.due_date, d.total_cents
)`;

interface SummaryRow {
  receivableCents: number;
  overdueCents: number;
  dueTodayCents: number;
  debtorCustomerCount: number;
  openDebtCount: number;
  overdueDebtCount: number;
}

interface CashFlowRow {
  grossCents: number;
  reversedCents: number;
}

interface CashFlowEventRow {
  type: 'payment' | 'reversal';
  occurredAt: string;
  amountCents: number;
}

interface ActivityRow {
  id: string;
  type: DashboardActivityType;
  occurredAt: string;
  debtId: string;
  paymentId: string | null;
  customerName: string;
  debtDescription: string;
  amountCents: number | null;
  metadataJson: string | null;
  isReversed: number;
}

interface AuditMetadata {
  totalCents?: unknown;
}

export class DashboardRepository {
  constructor(private readonly executor: SqlExecutor) {}

  async getSnapshot(
    workspaceId: string,
    timezone: string,
    referenceDate = new Date(),
  ): Promise<DashboardSnapshot> {
    const currentCivilDate = getCivilDate(referenceDate, timezone);
    const monthRange = getCivilMonthRange(referenceDate, timezone);
    const weekRange = getLastCivilDaysRange(referenceDate, timezone, 7);
    const [
      baseSummary,
      monthCashFlow,
      dailyReceipts,
      upcomingDebts,
      priorityOverdueDebts,
      recentActivities,
    ] = await Promise.all([
      this.getBaseSummary(workspaceId, currentCivilDate),
      this.getCashFlow(workspaceId, monthRange.startAt, monthRange.endAt),
      this.getDailyReceipts(workspaceId, timezone, weekRange),
      this.listUpcomingDebts(workspaceId, currentCivilDate),
      this.listPriorityOverdueDebts(workspaceId, currentCivilDate),
      this.listRecentActivities(workspaceId),
    ]);

    return {
      summary: {
        ...baseSummary,
        monthGrossReceivedCents: monthCashFlow.grossCents,
        monthReversedCents: monthCashFlow.reversedCents,
        monthNetReceivedCents: monthCashFlow.grossCents - monthCashFlow.reversedCents,
      },
      dailyReceipts,
      upcomingDebts,
      priorityOverdueDebts,
      recentActivities,
      currentCivilDate,
    };
  }

  private async getBaseSummary(
    workspaceId: string,
    currentCivilDate: string,
  ): Promise<
    Omit<
      DashboardSummary,
      'monthGrossReceivedCents' | 'monthReversedCents' | 'monthNetReceivedCents'
    >
  > {
    const row = await this.executor.get<SummaryRow>(
      `${DEBT_BALANCE_CTE}
       select
         coalesce(sum(case when pendingCents > 0 then pendingCents else 0 end), 0)
           as receivableCents,
         coalesce(sum(case when pendingCents > 0 and dueDate < ? then pendingCents else 0 end), 0)
           as overdueCents,
         coalesce(sum(case when pendingCents > 0 and dueDate = ? then pendingCents else 0 end), 0)
           as dueTodayCents,
         count(distinct case when pendingCents > 0 then customerId end) as debtorCustomerCount,
         coalesce(sum(case when pendingCents > 0 then 1 else 0 end), 0) as openDebtCount,
         coalesce(sum(case when pendingCents > 0 and dueDate < ? then 1 else 0 end), 0)
           as overdueDebtCount
       from debt_balances`,
      [workspaceId, currentCivilDate, currentCivilDate, currentCivilDate],
    );
    return {
      receivableCents: row?.receivableCents ?? 0,
      overdueCents: row?.overdueCents ?? 0,
      dueTodayCents: row?.dueTodayCents ?? 0,
      debtorCustomerCount: row?.debtorCustomerCount ?? 0,
      openDebtCount: row?.openDebtCount ?? 0,
      overdueDebtCount: row?.overdueDebtCount ?? 0,
    };
  }

  private async getCashFlow(
    workspaceId: string,
    startAt: string,
    endAt: string,
  ): Promise<CashFlowRow> {
    const row = await this.executor.get<CashFlowRow>(
      `select
        coalesce((select sum(amount_cents) from payments
          where workspace_id = ? and paid_at >= ? and paid_at < ?), 0) as grossCents,
        coalesce((select sum(p.amount_cents)
          from payment_reversals r
          inner join payments p on p.workspace_id = r.workspace_id and p.id = r.payment_id
          where r.workspace_id = ? and r.reversed_at >= ? and r.reversed_at < ?), 0)
          as reversedCents`,
      [workspaceId, startAt, endAt, workspaceId, startAt, endAt],
    );
    return { grossCents: row?.grossCents ?? 0, reversedCents: row?.reversedCents ?? 0 };
  }

  private async getDailyReceipts(
    workspaceId: string,
    timezone: string,
    range: ReturnType<typeof getLastCivilDaysRange>,
  ): Promise<DashboardDailyReceipt[]> {
    const rows = await this.executor.all<CashFlowEventRow>(
      `select 'payment' as type, paid_at as occurredAt, amount_cents as amountCents
       from payments where workspace_id = ? and paid_at >= ? and paid_at < ?
       union all
       select 'reversal' as type, r.reversed_at as occurredAt, p.amount_cents as amountCents
       from payment_reversals r
       inner join payments p on p.workspace_id = r.workspace_id and p.id = r.payment_id
       where r.workspace_id = ? and r.reversed_at >= ? and r.reversed_at < ?`,
      [workspaceId, range.startAt, range.endAt, workspaceId, range.startAt, range.endAt],
    );
    const dates = listCivilDates(range.startCivilDate, range.endCivilDateExclusive);
    const receipts = new Map<string, DashboardDailyReceipt>(
      dates.map((civilDate) => [
        civilDate,
        { civilDate, grossCents: 0, reversedCents: 0, netCents: 0 },
      ]),
    );
    for (const row of rows) {
      const civilDate = getCivilDate(new Date(row.occurredAt), timezone);
      const day = receipts.get(civilDate);
      if (!day) continue;
      if (row.type === 'payment') day.grossCents += row.amountCents;
      else day.reversedCents += row.amountCents;
      day.netCents = day.grossCents - day.reversedCents;
    }
    return dates.map((date) => receipts.get(date) as DashboardDailyReceipt);
  }

  private listUpcomingDebts(
    workspaceId: string,
    currentCivilDate: string,
  ): Promise<DashboardDebt[]> {
    return this.executor.all<DashboardDebt>(
      `${DEBT_BALANCE_CTE}
       select id, customerName, description, dueDate, pendingCents from debt_balances
       where pendingCents > 0 and dueDate >= ?
       order by dueDate asc, pendingCents desc, id asc limit ?`,
      [workspaceId, currentCivilDate, UPCOMING_LIMIT],
    );
  }

  private listPriorityOverdueDebts(
    workspaceId: string,
    currentCivilDate: string,
  ): Promise<DashboardDebt[]> {
    return this.executor.all<DashboardDebt>(
      `${DEBT_BALANCE_CTE}
       select id, customerName, description, dueDate, pendingCents from debt_balances
       where pendingCents > 0 and dueDate < ?
       order by dueDate asc, pendingCents desc, id asc limit ?`,
      [workspaceId, currentCivilDate, OVERDUE_LIMIT],
    );
  }

  private async listRecentActivities(workspaceId: string): Promise<DashboardActivity[]> {
    const rows = await this.executor.all<ActivityRow>(
      `select * from (
        select 'audit:' || a.id as id,
          case a.action when 'create' then 'debt_created'
            when 'update' then 'debt_updated' else 'debt_canceled' end as type,
          a.created_at as occurredAt, d.id as debtId, null as paymentId,
          c.name as customerName, d.description as debtDescription,
          null as amountCents, a.metadata_json as metadataJson, 0 as isReversed
        from audit_logs a
        inner join debts d
          on d.workspace_id = a.workspace_id and a.entity_type = 'debt' and d.id = a.entity_id
        inner join customers c
          on c.workspace_id = d.workspace_id and c.id = d.customer_id
        where a.workspace_id = ? and a.action in ('create','update','cancel')

        union all

        select 'payment:' || p.id, 'payment_registered', p.paid_at, d.id, p.id,
          c.name, d.description, p.amount_cents, null,
          case when r.id is null then 0 else 1 end
        from payments p
        inner join debts d on d.workspace_id = p.workspace_id and d.id = p.debt_id
        inner join customers c on c.workspace_id = d.workspace_id and c.id = d.customer_id
        left join payment_reversals r
          on r.workspace_id = p.workspace_id and r.payment_id = p.id
        where p.workspace_id = ?

        union all

        select 'reversal:' || r.id, 'payment_reversed', r.reversed_at, d.id, p.id,
          c.name, d.description, p.amount_cents, null, 1
        from payment_reversals r
        inner join payments p on p.workspace_id = r.workspace_id and p.id = r.payment_id
        inner join debts d on d.workspace_id = p.workspace_id and d.id = p.debt_id
        inner join customers c on c.workspace_id = d.workspace_id and c.id = d.customer_id
        where r.workspace_id = ?
      ) activity
      order by datetime(activity.occurredAt) desc, activity.id desc limit ?`,
      [workspaceId, workspaceId, workspaceId, ACTIVITY_LIMIT],
    );
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      occurredAt: normalizeSqliteInstant(row.occurredAt),
      debtId: row.debtId,
      paymentId: row.paymentId,
      customerName: row.customerName,
      debtDescription: row.debtDescription,
      amountCents: row.amountCents ?? readAuditAmount(row.metadataJson),
      isReversed: Boolean(row.isReversed),
    }));
  }
}

function readAuditAmount(value: string | null): number | null {
  if (!value) return null;
  try {
    const metadata = JSON.parse(value) as AuditMetadata;
    return Number.isSafeInteger(metadata.totalCents) && (metadata.totalCents as number) >= 0
      ? (metadata.totalCents as number)
      : null;
  } catch {
    return null;
  }
}

function normalizeSqliteInstant(value: string): string {
  return value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
}
