import type { CustomerRow } from '@/database/schema';

export type CustomerStatusFilter = 'active' | 'archived' | 'all';
export type CustomerSortOrder = 'name_asc' | 'name_desc' | 'newest' | 'oldest';

export interface CustomerListFilters {
  query?: string;
  status?: CustomerStatusFilter;
  sort?: CustomerSortOrder;
  outstandingOnly?: boolean;
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
