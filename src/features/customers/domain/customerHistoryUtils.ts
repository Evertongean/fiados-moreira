import type {
  FinancialHistoryEventType,
  FinancialHistoryPeriodFilter,
} from '@/features/customers/domain/customerTypes';

export const FINANCIAL_HISTORY_TYPE_LABELS: Record<FinancialHistoryEventType, string> = {
  debt_created: 'Novo fiado',
  payment_registered: 'Pagamento',
  payment_reversed: 'Estorno',
  debt_updated: 'Alteração do fiado',
  debt_canceled: 'Cancelamento',
};

export function getFinancialHistoryPeriod(
  period: FinancialHistoryPeriodFilter,
  referenceDate = new Date(),
): { startAt?: string; endAt?: string } {
  if (period === 'all') return {};
  const days = period === 'last_30_days' ? 30 : 90;
  return {
    startAt: new Date(referenceDate.getTime() - days * 24 * 60 * 60 * 1000).toISOString(),
    endAt: referenceDate.toISOString(),
  };
}
