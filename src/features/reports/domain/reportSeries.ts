import type { ReportDailyReceipt } from '@/features/reports/domain/reportTypes';

export interface ReportReceiptBucket {
  key: string;
  label: string;
  grossCents: number;
  reversedCents: number;
  netCents: number;
}

export function bucketReceiptSeries(
  values: ReportDailyReceipt[],
  maximumBuckets = 12,
): ReportReceiptBucket[] {
  if (!values.length) return [];
  const size = Math.max(1, Math.ceil(values.length / maximumBuckets));
  const buckets: ReportReceiptBucket[] = [];
  for (let index = 0; index < values.length; index += size) {
    const group = values.slice(index, index + size);
    const first = group[0];
    const last = group[group.length - 1];
    if (!first || !last) continue;
    const grossCents = group.reduce((total, day) => total + day.grossCents, 0);
    const reversedCents = group.reduce((total, day) => total + day.reversedCents, 0);
    buckets.push({
      key: `${first.civilDate}:${last.civilDate}`,
      label:
        first.civilDate === last.civilDate
          ? formatShortDate(first.civilDate)
          : `${formatShortDate(first.civilDate)}–${formatShortDate(last.civilDate)}`,
      grossCents,
      reversedCents,
      netCents: grossCents - reversedCents,
    });
  }
  return buckets;
}

function formatShortDate(value: string): string {
  const [, month = '', day = ''] = value.split('-');
  return `${day}/${month}`;
}
