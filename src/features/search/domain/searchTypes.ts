import type { PaymentMethod, VehicleType } from '@/database/schema';
import type { DebtListFilter } from '@/features/debts/domain/debtTypes';

export type SearchStatusFilter = 'all' | 'active' | 'archived';
export type CustomerDebtFilter = 'all' | 'with_debt' | 'without_debt' | 'overdue';
export type CustomerSearchSort =
  'name_asc' | 'name_desc' | 'newest' | 'oldest' | 'balance_desc' | 'balance_asc';
export type DebtOverdueFilter = 'all' | 'overdue' | 'not_overdue';
export type DebtDueDateFilter = 'all' | 'with_due_date' | 'without_due_date';
export type DebtDateField = 'created' | 'due';
export type DebtSearchSort =
  'newest' | 'oldest' | 'amount_desc' | 'amount_asc' | 'due_asc' | 'due_desc';
export type PaymentStatusFilter = 'all' | 'confirmed' | 'reversed';

export interface GlobalSearchFilters {
  customers: {
    status: SearchStatusFilter;
    debt: CustomerDebtFilter;
    sort: CustomerSearchSort;
  };
  vehicles: {
    status: SearchStatusFilter;
    type: VehicleType | 'all';
    customerId?: string;
  };
  debts: {
    status: DebtListFilter;
    overdue: DebtOverdueFilter;
    customerId?: string;
    vehicleId?: string;
    dateField: DebtDateField;
    startDate?: string;
    endDate?: string;
    minAmountCents?: number;
    maxAmountCents?: number;
    dueDate: DebtDueDateFilter;
    sort: DebtSearchSort;
  };
  payments: {
    startDate?: string;
    endDate?: string;
    method: PaymentMethod | 'all';
    customerId?: string;
    status: PaymentStatusFilter;
  };
}

export interface CustomerSearchResult {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  archivedAt: string | null;
  createdAt: string;
  outstandingCents: number;
  overdueCents: number;
}

export interface VehicleSearchResult {
  id: string;
  customerId: string;
  customerName: string;
  type: VehicleType;
  brand: string;
  model: string;
  plate: string | null;
  archivedAt: string | null;
}

export interface DebtSearchResult {
  id: string;
  customerId: string;
  customerName: string;
  vehicleId: string | null;
  vehiclePlate: string | null;
  description: string;
  totalCents: number;
  pendingCents: number;
  dueDate: string | null;
  createdAt: string;
  financialStatus: 'pending' | 'partially_paid' | 'paid' | 'canceled';
  isOverdue: boolean;
}

export interface PaymentSearchResult {
  id: string;
  customerId: string;
  customerName: string;
  debtId: string;
  debtDescription: string;
  paymentMethod: PaymentMethod;
  amountCents: number;
  paidAt: string;
  isReversed: boolean;
}

export interface GlobalSearchResults {
  customers: CustomerSearchResult[];
  vehicles: VehicleSearchResult[];
  debts: DebtSearchResult[];
  payments: PaymentSearchResult[];
  total: number;
  limited: boolean;
}

export interface GlobalSearchFilterOptions {
  customers: { id: string; name: string }[];
  vehicles: { id: string; label: string; customerId: string }[];
}

export const DEFAULT_GLOBAL_SEARCH_FILTERS: GlobalSearchFilters = {
  customers: { status: 'all', debt: 'all', sort: 'name_asc' },
  vehicles: { status: 'all', type: 'all' },
  debts: {
    status: 'all',
    overdue: 'all',
    dateField: 'created',
    dueDate: 'all',
    sort: 'newest',
  },
  payments: { method: 'all', status: 'all' },
};

export function countActiveSearchFilters(filters: GlobalSearchFilters): number {
  return [
    filters.customers.status !== 'all',
    filters.customers.debt !== 'all',
    filters.customers.sort !== 'name_asc',
    filters.vehicles.status !== 'all',
    filters.vehicles.type !== 'all',
    Boolean(filters.vehicles.customerId),
    filters.debts.status !== 'all',
    filters.debts.overdue !== 'all',
    Boolean(filters.debts.customerId),
    Boolean(filters.debts.vehicleId),
    filters.debts.dateField !== 'created',
    Boolean(filters.debts.startDate),
    Boolean(filters.debts.endDate),
    filters.debts.minAmountCents !== undefined,
    filters.debts.maxAmountCents !== undefined,
    filters.debts.dueDate !== 'all',
    filters.debts.sort !== 'newest',
    Boolean(filters.payments.startDate),
    Boolean(filters.payments.endDate),
    filters.payments.method !== 'all',
    Boolean(filters.payments.customerId),
    filters.payments.status !== 'all',
  ].filter(Boolean).length;
}
