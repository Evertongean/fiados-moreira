import {
  addCivilDays,
  getCivilMonthRange,
  getCivilRange,
  getLastCivilDaysRange,
} from '@/features/dashboard/domain/dashboardDateUtils';
import type {
  ReportDateRange,
  ReportFilters,
  ReportPeriodPreset,
} from '@/features/reports/domain/reportTypes';
import { paymentMethods } from '@/database/schema';
import { formatCivilDate, getCivilDate } from '@/utils/date';

export const REPORT_PERIOD_LABELS: Record<ReportPeriodPreset, string> = {
  today: 'Hoje',
  last_7_days: 'Últimos 7 dias',
  last_30_days: 'Últimos 30 dias',
  this_month: 'Este mês',
  previous_month: 'Mês anterior',
  this_year: 'Este ano',
  custom: 'Personalizado',
};

export function resolveReportDateRange(
  filters: ReportFilters,
  timezone: string,
  referenceDate = new Date(),
): ReportDateRange {
  let range;
  if (filters.period === 'today') {
    range = getLastCivilDaysRange(referenceDate, timezone, 1);
  } else if (filters.period === 'last_7_days') {
    range = getLastCivilDaysRange(referenceDate, timezone, 7);
  } else if (filters.period === 'last_30_days') {
    range = getLastCivilDaysRange(referenceDate, timezone, 30);
  } else if (filters.period === 'this_month') {
    range = getCivilMonthRange(referenceDate, timezone);
  } else if (filters.period === 'previous_month') {
    const current = getCivilMonthRange(referenceDate, timezone);
    const [year = 0, month = 0] = current.startCivilDate.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
    range = getCivilRange(start, current.startCivilDate, timezone);
  } else if (filters.period === 'this_year') {
    const today = getCivilDate(referenceDate, timezone);
    const year = today.slice(0, 4);
    range = getCivilRange(`${year}-01-01`, `${Number(year) + 1}-01-01`, timezone);
  } else {
    const start = filters.customStartDate;
    const end = filters.customEndDate;
    if (!start || !end || !isCivilDate(start) || !isCivilDate(end) || start > end) {
      throw new RangeError('Informe um período personalizado válido.');
    }
    range = getCivilRange(start, addCivilDays(end, 1), timezone);
  }
  return {
    ...range,
    label: formatRangeLabel(range.startCivilDate, addCivilDays(range.endCivilDateExclusive, -1)),
  };
}

export function reportFiltersToParams(filters: ReportFilters): Record<string, string> {
  const params: Record<string, string> = { period: filters.period };
  if (filters.customStartDate) params.start = filters.customStartDate;
  if (filters.customEndDate) params.end = filters.customEndDate;
  if (filters.customerId) params.customerId = filters.customerId;
  if (filters.paymentMethod !== 'all') params.method = filters.paymentMethod;
  if (filters.financialStatus !== 'all') params.status = filters.financialStatus;
  return params;
}

export function reportFiltersFromParams(
  params: Record<string, string | string[] | undefined>,
): ReportFilters {
  const single = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const periodValue = single(params.period);
  const allowedPeriods = Object.keys(REPORT_PERIOD_LABELS) as ReportPeriodPreset[];
  const methodValue = single(params.method);
  const statusValue = single(params.status);
  return {
    period: allowedPeriods.includes(periodValue as ReportPeriodPreset)
      ? (periodValue as ReportPeriodPreset)
      : 'this_month',
    customStartDate: single(params.start),
    customEndDate: single(params.end),
    customerId: single(params.customerId),
    paymentMethod: paymentMethods.includes(methodValue as (typeof paymentMethods)[number])
      ? (methodValue as (typeof paymentMethods)[number])
      : 'all',
    financialStatus:
      statusValue === 'pending' || statusValue === 'partially_paid' ? statusValue : 'all',
  };
}

export function formatRangeLabel(start: string, end: string): string {
  if (start === end) return formatCivilDate(start) ?? start;
  return `${formatCivilDate(start) ?? start} a ${formatCivilDate(end) ?? end}`;
}

function isCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
