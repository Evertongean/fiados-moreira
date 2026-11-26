import type { CustomerRow } from '@/database/schema';

export type CustomerStatusFilter = 'active' | 'archived' | 'all';
export type CustomerDebtFilter = 'all' | 'with_debt' | 'without_debt' | 'overdue';
export type CustomerSortOrder =
  'name_asc' | 'name_desc' | 'newest' | 'oldest' | 'balance_desc' | 'balance_asc';

export interface CustomerListFilters {
  query?: string;
  status?: CustomerStatusFilter;
  sort?: CustomerSortOrder;
  outstandingOnly?: boolean;
  debt?: CustomerDebtFilter;
}

export interface CustomerListEntry extends CustomerRow {
  outstandingCents: number;
  overdueCents: number;
}

export type DuplicateMatchReason = 'name' | 'phone' | 'whatsapp';

export interface PotentialDuplicate {
  customer: CustomerRow;
  reasons: DuplicateMatchReason[];
}

export interface CustomerFinancialSummary {
  totalDebtCents: number;
  totalPaidCents: number;
  outstandingCents: number;
  openDebtCount: number;
}

export interface CustomerHistorySummary extends CustomerFinancialSummary {
  overdueCents: number;
  paidDebtCount: number;
  lastValidPaymentAt: string | null;
}

export type FinancialHistoryEventType =
  'debt_created' | 'payment_registered' | 'payment_reversed' | 'debt_updated' | 'debt_canceled';

export type FinancialHistoryMovementFilter =
  'all' | 'debts' | 'payments' | 'reversals' | 'updates' | 'cancellations';

export type FinancialHistoryPeriodFilter = 'all' | 'last_30_days' | 'last_90_days';

export interface FinancialHistoryListOptions {
  movement?: FinancialHistoryMovementFilter;
  vehicleId?: string;
  startAt?: string;
  endAt?: string;
  limit?: number;
  offset?: number;
}

export interface FinancialHistoryEvent {
  id: string;
  type: FinancialHistoryEventType;
  occurredAt: string;
  debtId: string;
  paymentId: string | null;
  debtDescription: string;
  amountCents: number | null;
  previousAmountCents: number | null;
  note: string | null;
  vehicleId: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehiclePlate: string | null;
  status: 'recorded' | 'valid' | 'reversed' | 'updated' | 'canceled';
}
