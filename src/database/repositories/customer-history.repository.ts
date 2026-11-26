import type { SqlExecutor } from '@/database/types/executor';
import type {
  CustomerHistorySummary,
  FinancialHistoryEvent,
  FinancialHistoryEventType,
  FinancialHistoryListOptions,
  FinancialHistoryMovementFilter,
} from '@/features/customers/domain/customerTypes';

interface FinancialHistoryRow {
  eventId: string;
  type: FinancialHistoryEventType;
  occurredAt: string;
  debtId: string;
  paymentId: string | null;
  debtDescription: string;
  vehicleId: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehiclePlate: string | null;
  amountCents: number | null;
  metadataJson: string | null;
  note: string | null;
  status: FinancialHistoryEvent['status'];
}

interface AuditMetadata {
  totalCents?: unknown;
  previousTotalCents?: unknown;
  reason?: unknown;
}

const MOVEMENT_TYPES: Record<
  Exclude<FinancialHistoryMovementFilter, 'all'>,
  readonly FinancialHistoryEventType[]
> = {
  debts: ['debt_created'],
  payments: ['payment_registered'],
  reversals: ['payment_reversed'],
  updates: ['debt_updated'],
  cancellations: ['debt_canceled'],
};

const HISTORY_UNION = `
  select 'audit:' || a.id as eventId,
    case a.action
      when 'create' then 'debt_created'
      when 'update' then 'debt_updated'
      else 'debt_canceled'
    end as type,
    a.created_at as occurredAt, d.id as debtId, null as paymentId,
    d.description as debtDescription, d.vehicle_id as vehicleId,
    v.brand as vehicleBrand, v.model as vehicleModel, v.plate as vehiclePlate,
    null as amountCents, a.metadata_json as metadataJson, null as note,
    case a.action
      when 'create' then 'recorded'
      when 'update' then 'updated'
      else 'canceled'
    end as status
  from debts d
  inner join audit_logs a
    on a.workspace_id = d.workspace_id and a.entity_type = 'debt' and a.entity_id = d.id
  left join vehicles v on v.workspace_id = d.workspace_id and v.id = d.vehicle_id
  where d.workspace_id = ? and d.customer_id = ? and a.action in ('create','update','cancel')

  union all

  select 'payment:' || p.id as eventId, 'payment_registered' as type,
    p.paid_at as occurredAt, d.id as debtId, p.id as paymentId,
    d.description as debtDescription, d.vehicle_id as vehicleId,
    v.brand as vehicleBrand, v.model as vehicleModel, v.plate as vehiclePlate,
    p.amount_cents as amountCents, null as metadataJson, p.notes as note,
    case when r.id is null then 'valid' else 'reversed' end as status
  from debts d
  inner join payments p on p.workspace_id = d.workspace_id and p.debt_id = d.id
  left join payment_reversals r
    on r.workspace_id = p.workspace_id and r.payment_id = p.id
  left join vehicles v on v.workspace_id = d.workspace_id and v.id = d.vehicle_id
  where d.workspace_id = ? and d.customer_id = ?

  union all

  select 'reversal:' || r.id as eventId, 'payment_reversed' as type,
    r.reversed_at as occurredAt, d.id as debtId, p.id as paymentId,
    d.description as debtDescription, d.vehicle_id as vehicleId,
    v.brand as vehicleBrand, v.model as vehicleModel, v.plate as vehiclePlate,
    p.amount_cents as amountCents, null as metadataJson, r.reason as note,
    'reversed' as status
  from debts d
  inner join payments p on p.workspace_id = d.workspace_id and p.debt_id = d.id
  inner join payment_reversals r
    on r.workspace_id = p.workspace_id and r.payment_id = p.id
  left join vehicles v on v.workspace_id = d.workspace_id and v.id = d.vehicle_id
  where d.workspace_id = ? and d.customer_id = ?`;

export class CustomerHistoryRepository {
  constructor(private readonly executor: SqlExecutor) {}

  async getSummary(
    workspaceId: string,
    customerId: string,
    currentCivilDate: string,
  ): Promise<CustomerHistorySummary> {
    const row = await this.executor.get<CustomerHistorySummary>(
      `select
        coalesce(sum(case when canceled_at is null then debt_total else 0 end), 0)
          as totalDebtCents,
        coalesce(sum(case when canceled_at is null then paid_total else 0 end), 0)
          as totalPaidCents,
        coalesce(sum(case when canceled_at is null then debt_total - paid_total else 0 end), 0)
          as outstandingCents,
        coalesce(sum(case when canceled_at is null and debt_total > paid_total then 1 else 0 end), 0)
          as openDebtCount,
        coalesce(sum(case when canceled_at is null and debt_total = paid_total then 1 else 0 end), 0)
          as paidDebtCount,
        coalesce(sum(case when canceled_at is null and due_date is not null and due_date < ?
          and debt_total > paid_total then debt_total - paid_total else 0 end), 0)
          as overdueCents,
        max(case when canceled_at is null then last_valid_payment_at end) as lastValidPaymentAt
       from (
         select d.id, d.total_cents as debt_total, d.due_date, d.canceled_at,
           coalesce(sum(case when r.id is null then p.amount_cents else 0 end), 0) as paid_total,
           max(case when r.id is null then p.paid_at end) as last_valid_payment_at
         from debts d
         left join payments p on p.workspace_id = d.workspace_id and p.debt_id = d.id
         left join payment_reversals r
           on r.workspace_id = p.workspace_id and r.payment_id = p.id
         where d.workspace_id = ? and d.customer_id = ?
         group by d.id, d.total_cents, d.due_date, d.canceled_at
       )`,
      [currentCivilDate, workspaceId, customerId],
    );
    return {
      totalDebtCents: row?.totalDebtCents ?? 0,
      totalPaidCents: row?.totalPaidCents ?? 0,
      outstandingCents: row?.outstandingCents ?? 0,
      openDebtCount: row?.openDebtCount ?? 0,
      paidDebtCount: row?.paidDebtCount ?? 0,
      overdueCents: row?.overdueCents ?? 0,
      lastValidPaymentAt: row?.lastValidPaymentAt ?? null,
    };
  }

  async listEvents(
    workspaceId: string,
    customerId: string,
    options: FinancialHistoryListOptions = {},
  ): Promise<FinancialHistoryEvent[]> {
    const conditions: string[] = [];
    const params: (string | number)[] = [
      workspaceId,
      customerId,
      workspaceId,
      customerId,
      workspaceId,
      customerId,
    ];
    if (options.startAt) {
      conditions.push('julianday(history.occurredAt) >= julianday(?)');
      params.push(options.startAt);
    }
    if (options.endAt) {
      conditions.push('julianday(history.occurredAt) < julianday(?)');
      params.push(options.endAt);
    }
    if (options.vehicleId) {
      conditions.push('history.vehicleId = ?');
      params.push(options.vehicleId);
    }
    const movement = options.movement ?? 'all';
    if (movement !== 'all') {
      const types = MOVEMENT_TYPES[movement];
      conditions.push(`history.type in (${types.map(() => '?').join(',')})`);
      params.push(...types);
    }
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 200);
    const offset = Math.max(options.offset ?? 0, 0);
    params.push(limit, offset);
    const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
    const rows = await this.executor.all<FinancialHistoryRow>(
      `select * from (${HISTORY_UNION}) history
       ${where}
       order by julianday(history.occurredAt) desc,
         case history.type
           when 'payment_reversed' then 1
           when 'payment_registered' then 2
           when 'debt_canceled' then 3
           when 'debt_updated' then 4
           else 5
         end,
         history.eventId desc
       limit ? offset ?`,
      params,
    );
    return rows.map((row) => this.toEvent(row));
  }

  private toEvent(row: FinancialHistoryRow): FinancialHistoryEvent {
    const metadata = parseMetadata(row.metadataJson);
    const amountCents =
      row.type === 'debt_created' || row.type === 'debt_updated'
        ? asCents(metadata.totalCents)
        : row.amountCents;
    return {
      id: row.eventId,
      type: row.type,
      occurredAt: row.occurredAt,
      debtId: row.debtId,
      paymentId: row.paymentId,
      debtDescription: row.debtDescription,
      amountCents,
      previousAmountCents:
        row.type === 'debt_updated' ? asCents(metadata.previousTotalCents) : null,
      note:
        row.type === 'debt_canceled' && typeof metadata.reason === 'string'
          ? metadata.reason
          : row.note,
      vehicleId: row.vehicleId,
      vehicleBrand: row.vehicleBrand,
      vehicleModel: row.vehicleModel,
      vehiclePlate: row.vehiclePlate,
      status: row.status,
    };
  }
}

function parseMetadata(value: string | null): AuditMetadata {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? (parsed as AuditMetadata) : {};
  } catch {
    return {};
  }
}

function asCents(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : null;
}
