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
