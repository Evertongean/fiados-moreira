import type { DebtRow } from '@/database/schema';
import type { DebtFinancialSummary } from '@/features/debts/domain/finance';
import type { DebtStatusResult } from '@/features/debts/domain/status';

export type DebtListFilter =
  'all' | 'open' | 'pending' | 'partially_paid' | 'due_today' | 'overdue' | 'paid' | 'canceled';

export interface DebtListOptions {
  query?: string;
  filter?: DebtListFilter;
  timezone: string;
  referenceDate?: Date;
  customerId?: string;
  vehicleId?: string;
  overdue?: 'all' | 'overdue' | 'not_overdue';
  dateField?: 'created' | 'due';
  startDate?: string;
  endDate?: string;
  minAmountCents?: number;
  maxAmountCents?: number;
  dueDate?: 'all' | 'with_due_date' | 'without_due_date';
  sort?: 'newest' | 'oldest' | 'amount_desc' | 'amount_asc' | 'due_asc' | 'due_desc';
}

export interface DebtOverview extends DebtRow {
  customerName: string;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehiclePlate: string | null;
  summary: DebtFinancialSummary;
  status: DebtStatusResult;
}

export interface DebtPaymentDetails {
  id: string;
  amountCents: number;
  paymentMethod: string;
  paidAt: string;
  notes: string | null;
  reversalId: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
}
