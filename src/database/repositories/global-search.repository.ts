import type { PaymentMethod } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import { CustomerRepository } from '@/database/repositories/customer.repository';
import { DebtRepository } from '@/database/repositories/debt.repository';
import { normalizeSearchText } from '@/features/customers/domain/customerUtils';
import type { DebtOverview } from '@/features/debts/domain/debtTypes';
import { PAYMENT_METHOD_LABELS } from '@/features/payments/domain/paymentUtils';
import type {
  DebtSearchResult,
  GlobalSearchFilters,
  GlobalSearchFilterOptions,
  GlobalSearchResults,
  PaymentSearchResult,
  VehicleSearchResult,
} from '@/features/search/domain/searchTypes';
import { getCivilDate } from '@/utils/date';
import { normalizeBrazilianPlate } from '@/utils/plate';

const RESULT_LIMIT = 20;

interface PaymentSearchRow extends PaymentSearchResult {
  reversalId: string | null;
}

export class GlobalSearchRepository {
  constructor(private readonly executor: SqlExecutor) {}

  async search(
    workspaceId: string,
    query: string,
    filters: GlobalSearchFilters,
    timezone: string,
    referenceDate = new Date(),
  ): Promise<GlobalSearchResults> {
    const [customerRows, vehicleRows, debtRows, paymentRows] = await Promise.all([
      new CustomerRepository(this.executor).listAdvanced(
        workspaceId,
        {
          query,
          status: filters.customers.status,
          debt: filters.customers.debt,
          sort: filters.customers.sort,
        },
        timezone,
        referenceDate,
      ),
      this.listVehicles(workspaceId),
      new DebtRepository(this.executor).listOverview(workspaceId, {
        query,
        filter: filters.debts.status,
        timezone,
        referenceDate,
        customerId: filters.debts.customerId,
        vehicleId: filters.debts.vehicleId,
        overdue: filters.debts.overdue,
        dateField: filters.debts.dateField,
        startDate: filters.debts.startDate,
        endDate: filters.debts.endDate,
        minAmountCents: filters.debts.minAmountCents,
        maxAmountCents: filters.debts.maxAmountCents,
        dueDate: filters.debts.dueDate,
        sort: filters.debts.sort,
      }),
      this.listPayments(workspaceId),
    ]);

    const allCustomers = customerRows.map(
      ({ id, name, phone, whatsapp, archivedAt, createdAt, outstandingCents, overdueCents }) => ({
        id,
        name,
        phone,
        whatsapp,
        archivedAt,
        createdAt,
        outstandingCents,
        overdueCents,
      }),
    );
    const allVehicles = filterVehicles(vehicleRows, query, filters);
    const allDebts = debtRows.map(toDebtSearchResult);
    const allPayments = filterPayments(paymentRows, query, filters, timezone);
    const total = allCustomers.length + allVehicles.length + allDebts.length + allPayments.length;
    return {
      customers: allCustomers.slice(0, RESULT_LIMIT),
      vehicles: allVehicles.slice(0, RESULT_LIMIT),
      debts: allDebts.slice(0, RESULT_LIMIT),
      payments: allPayments.slice(0, RESULT_LIMIT),
      total,
      limited: [allCustomers, allVehicles, allDebts, allPayments].some(
        (rows) => rows.length > RESULT_LIMIT,
      ),
    };
  }

  async listFilterOptions(workspaceId: string): Promise<GlobalSearchFilterOptions> {
    const [customers, vehicles] = await Promise.all([
      this.executor.all<{ id: string; name: string }>(
        `select id, name from customers
         where workspace_id = ? and deleted_at is null order by name collate nocase`,
        [workspaceId],
      ),
      this.executor.all<{ id: string; label: string; customerId: string }>(
        `select id, brand || ' ' || model ||
          case when plate is null then '' else ' · ' || plate end as label,
          customer_id as customerId
         from vehicles where workspace_id = ? and deleted_at is null
         order by brand collate nocase, model collate nocase`,
        [workspaceId],
      ),
    ]);
    return { customers, vehicles };
  }

  private listVehicles(workspaceId: string): Promise<VehicleSearchResult[]> {
    return this.executor.all<VehicleSearchResult>(
      `select v.id, v.customer_id as customerId, c.name as customerName, v.type,
        v.brand, v.model, v.plate, v.archived_at as archivedAt
       from vehicles v inner join customers c
         on c.workspace_id = v.workspace_id and c.id = v.customer_id
       where v.workspace_id = ? and v.deleted_at is null`,
      [workspaceId],
    );
  }

  private async listPayments(workspaceId: string): Promise<PaymentSearchResult[]> {
    const rows = await this.executor.all<PaymentSearchRow>(
      `select p.id, d.customer_id as customerId, c.name as customerName,
        p.debt_id as debtId, d.description as debtDescription,
        p.payment_method as paymentMethod, p.amount_cents as amountCents,
        p.paid_at as paidAt, r.id as reversalId
       from payments p
       inner join debts d on d.workspace_id = p.workspace_id and d.id = p.debt_id
       inner join customers c on c.workspace_id = d.workspace_id and c.id = d.customer_id
       left join payment_reversals r
         on r.workspace_id = p.workspace_id and r.payment_id = p.id
       where p.workspace_id = ?`,
      [workspaceId],
    );
    return rows.map(({ reversalId, ...row }) => ({ ...row, isReversed: reversalId !== null }));
  }
}

function filterVehicles(
  rows: VehicleSearchResult[],
  query: string,
  filters: GlobalSearchFilters,
): VehicleSearchResult[] {
  const text = normalizeSearchText(query);
  const plate = normalizeBrazilianPlate(query);
  return rows
    .filter((row) => {
      const matchesQuery =
        !text ||
        normalizeSearchText(`${row.brand} ${row.model}`).includes(text) ||
        Boolean(plate && row.plate?.includes(plate));
      if (!matchesQuery) return false;
      if (filters.vehicles.status === 'active' && row.archivedAt) return false;
      if (filters.vehicles.status === 'archived' && !row.archivedAt) return false;
      if (filters.vehicles.type !== 'all' && row.type !== filters.vehicles.type) return false;
      return !filters.vehicles.customerId || row.customerId === filters.vehicles.customerId;
    })
    .sort((left, right) => {
      const result = `${left.brand} ${left.model}`.localeCompare(
        `${right.brand} ${right.model}`,
        'pt-BR',
        {
          sensitivity: 'base',
        },
      );
      return result || left.id.localeCompare(right.id);
    });
}

function toDebtSearchResult(row: DebtOverview): DebtSearchResult {
  return {
    id: row.id,
    customerId: row.customerId,
    customerName: row.customerName,
    vehicleId: row.vehicleId,
    vehiclePlate: row.vehiclePlate,
    description: row.description,
    totalCents: row.totalCents,
    pendingCents: row.summary.pendingCents,
    dueDate: row.dueDate,
    createdAt: row.createdAt,
    financialStatus: row.status.financialStatus,
    isOverdue: row.status.isOverdue,
  };
}

function filterPayments(
  rows: PaymentSearchResult[],
  query: string,
  filters: GlobalSearchFilters,
  timezone: string,
): PaymentSearchResult[] {
  const text = normalizeSearchText(query);
  return rows
    .filter((row) => {
      const method = PAYMENT_METHOD_LABELS[row.paymentMethod as PaymentMethod];
      if (
        text &&
        !normalizeSearchText(`${row.customerName} ${row.debtDescription} ${method}`).includes(text)
      )
        return false;
      if (filters.payments.method !== 'all' && row.paymentMethod !== filters.payments.method) {
        return false;
      }
      if (filters.payments.customerId && row.customerId !== filters.payments.customerId) {
        return false;
      }
      if (filters.payments.status === 'confirmed' && row.isReversed) return false;
      if (filters.payments.status === 'reversed' && !row.isReversed) return false;
      const date = getCivilDate(new Date(row.paidAt), timezone);
      if (filters.payments.startDate && date < filters.payments.startDate) return false;
      return !filters.payments.endDate || date <= filters.payments.endDate;
    })
    .sort(
      (left, right) => right.paidAt.localeCompare(left.paidAt) || left.id.localeCompare(right.id),
    );
}
