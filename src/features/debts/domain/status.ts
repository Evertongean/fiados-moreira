import type { DebtStatus as DebtBadgeStatus } from '@/components/cards/DebtStatusBadge';
import type { DebtFinancialSummary } from '@/features/debts/domain/finance';
import { getCivilDate } from '@/utils/date';

export type DebtFinancialStatus = 'pending' | 'partially_paid' | 'paid' | 'canceled';

export interface DebtStatusResult {
  financialStatus: DebtFinancialStatus;
  isOverdue: boolean;
}

export function calculateDebtStatus(input: {
  summary: DebtFinancialSummary;
  canceledAt: string | null;
  dueDate: string | null;
  timezone: string;
  referenceDate?: Date;
}): DebtStatusResult {
  const { summary, canceledAt, dueDate, timezone, referenceDate = new Date() } = input;
  const financialStatus: DebtFinancialStatus = canceledAt
    ? 'canceled'
    : summary.isPaid
      ? 'paid'
      : summary.netPaidCents > 0
        ? 'partially_paid'
        : 'pending';
  const isOverdue =
    financialStatus !== 'canceled' &&
    financialStatus !== 'paid' &&
    dueDate !== null &&
    dueDate < getCivilDate(referenceDate, timezone);
  return { financialStatus, isOverdue };
}

export function toDebtBadgeStatus(status: DebtStatusResult): DebtBadgeStatus {
  if (status.isOverdue) return 'overdue';
  if (status.financialStatus === 'partially_paid') return 'partial';
  if (status.financialStatus === 'paid') return 'paid';
  return 'pending';
}
