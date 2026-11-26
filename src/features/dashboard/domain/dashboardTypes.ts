export interface DashboardSummary {
  receivableCents: number;
  overdueCents: number;
  dueTodayCents: number;
  debtorCustomerCount: number;
  openDebtCount: number;
  overdueDebtCount: number;
  monthGrossReceivedCents: number;
  monthReversedCents: number;
  monthNetReceivedCents: number;
}

export interface DashboardDailyReceipt {
  civilDate: string;
  grossCents: number;
  reversedCents: number;
  netCents: number;
}

export interface DashboardDebt {
  id: string;
  customerName: string;
  description: string;
  dueDate: string;
  pendingCents: number;
}

export type DashboardActivityType =
  'debt_created' | 'debt_updated' | 'debt_canceled' | 'payment_registered' | 'payment_reversed';

export interface DashboardActivity {
  id: string;
  type: DashboardActivityType;
  occurredAt: string;
  debtId: string;
  paymentId: string | null;
  customerName: string;
  debtDescription: string;
  amountCents: number | null;
  isReversed: boolean;
}

export interface DashboardSnapshot {
  summary: DashboardSummary;
  dailyReceipts: DashboardDailyReceipt[];
  upcomingDebts: DashboardDebt[];
  priorityOverdueDebts: DashboardDebt[];
  recentActivities: DashboardActivity[];
  currentCivilDate: string;
}
