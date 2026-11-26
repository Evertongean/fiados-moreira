import { getCivilDate } from '@/utils/date';

export interface CivilDateRange {
  startCivilDate: string;
  endCivilDateExclusive: string;
  startAt: string;
  endAt: string;
}

export function addCivilDays(civilDate: string, days: number): string {
  const date = parseCivilDate(civilDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getCivilMonthRange(referenceDate: Date, timezone: string): CivilDateRange {
  const currentCivilDate = getCivilDate(referenceDate, timezone);
  const [year, month] = currentCivilDate.split('-').map(Number);
  if (!year || !month) throw new RangeError('Data civil inválida.');
  const startCivilDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const endCivilDateExclusive = nextMonth.toISOString().slice(0, 10);
  return getCivilRange(startCivilDate, endCivilDateExclusive, timezone);
}

export function getLastCivilDaysRange(
  referenceDate: Date,
  timezone: string,
  dayCount: number,
): CivilDateRange {
  if (!Number.isSafeInteger(dayCount) || dayCount < 1) {
    throw new RangeError('Quantidade de dias inválida.');
  }
  const currentCivilDate = getCivilDate(referenceDate, timezone);
  const startCivilDate = addCivilDays(currentCivilDate, -(dayCount - 1));
  return getCivilRange(startCivilDate, addCivilDays(currentCivilDate, 1), timezone);
}

export function listCivilDates(startCivilDate: string, endCivilDateExclusive: string): string[] {
  const dates: string[] = [];
  for (let date = startCivilDate; date < endCivilDateExclusive; date = addCivilDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

function getCivilRange(
  startCivilDate: string,
  endCivilDateExclusive: string,
  timezone: string,
): CivilDateRange {
  if (startCivilDate >= endCivilDateExclusive) throw new RangeError('Período civil inválido.');
  return {
    startCivilDate,
    endCivilDateExclusive,
    startAt: findCivilDateStart(startCivilDate, timezone),
    endAt: findCivilDateStart(endCivilDateExclusive, timezone),
  };
}

function findCivilDateStart(civilDate: string, timezone: string): string {
  const target = parseCivilDate(civilDate).getTime();
  let low = target - 36 * 60 * 60 * 1000;
  let high = target + 36 * 60 * 60 * 1000;

  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (getCivilDate(new Date(middle), timezone) >= civilDate) high = middle;
    else low = middle;
  }
  return new Date(high).toISOString();
}

function parseCivilDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Data civil inválida.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError('Data civil inválida.');
  }
  return date;
}
