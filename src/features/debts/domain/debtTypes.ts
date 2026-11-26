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
