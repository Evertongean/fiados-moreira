import type { PaymentMethod } from '@/database/schema';
import type { CivilDateRange } from '@/features/dashboard/domain/dashboardDateUtils';

export type ReportPeriodPreset =
  | 'today'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'previous_month'
  | 'this_year'
  | 'custom';

export type ReportFinancialStatus = 'all' | 'pending' | 'partially_paid';
export type ReportKind = 'summary' | 'receivables' | 'received' | 'overdue';

export interface ReportFilters {
  period: ReportPeriodPreset;
  customStartDate?: string;
  customEndDate?: string;
  customerId?: string;
  paymentMethod: PaymentMethod | 'all';
  financialStatus: ReportFinancialStatus;
}

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  period: 'this_month',
  paymentMethod: 'all',
  financialStatus: 'all',
};

export interface ReportDateRange extends CivilDateRange {
  label: string;
}

export interface ReportReceivable {
  debtId: string;
  customerId: string;
  customerName: string;
  description: string;
  dueDate: string | null;
  originalCents: number;
  paidCents: number;
  pendingCents: number;
  financialStatus: Exclude<ReportFinancialStatus, 'all'>;
}

export interface ReportMovement {
  id: string;
  type: 'payment' | 'reversal';
  occurredAt: string;
  amountCents: number;
  paymentMethod: PaymentMethod;
  paymentId: string;
  debtId: string;
  customerId: string;
  customerName: string;
  debtDescription: string;
}

export interface ReportMethodBreakdown {
  paymentMethod: PaymentMethod;
  grossCents: number;
  reversedCents: number;
  netCents: number;
}

export interface ReportCustomerRanking {
  customerId: string;
  customerName: string;
  pendingCents: number;
  overdueCents: number;
  openDebtCount: number;
}

export interface ReportSummary {
  currentReceivableCents: number;
  currentOverdueCents: number;
  currentOpenDebtCount: number;
  grossReceivedCents: number;
  reversedCents: number;
  netReceivedCents: number;
  paymentCount: number;
  reversalCount: number;
}

export interface ReportDailyReceipt {
  civilDate: string;
  grossCents: number;
  reversedCents: number;
  netCents: number;
}

export interface FinancialReportSnapshot {
  range: ReportDateRange;
  currentCivilDate: string;
  summary: ReportSummary;
  dailyReceipts: ReportDailyReceipt[];
  methodBreakdown: ReportMethodBreakdown[];
  customerRanking: ReportCustomerRanking[];
  receivables: ReportReceivable[];
  overdueDebts: ReportReceivable[];
  movements: ReportMovement[];
}

export interface ReportFilterOption {
  id: string;
  name: string;
}
