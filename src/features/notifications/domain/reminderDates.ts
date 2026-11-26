import { getCivilDate } from '@/utils/date';

function civilDateToDays(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Math.floor(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) / 86_400_000);
}

export function addCivilDays(value: string, days: number): string {
  return new Date((civilDateToDays(value) + days) * 86_400_000).toISOString().slice(0, 10);
}

export function civilDaysBetween(start: string, end: string): number {
  return civilDateToDays(end) - civilDateToDays(start);
}

function timezoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return (
    Date.UTC(
      read('year'),
      read('month') - 1,
      read('day'),
      read('hour'),
      read('minute'),
      read('second'),
    ) - date.getTime()
  );
}

export function getWorkspaceInstant(
  civilDate: string,
  hour: number,
  minute: number,
  timezone: string,
): Date {
  const [year, month, day] = civilDate.split('-').map(Number);
  const desiredUtc = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, hour, minute);
  let result = new Date(desiredUtc);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    result = new Date(desiredUtc - timezoneOffsetMs(result, timezone));
  }
  return result;
}

export function getNextOverdueDates(
  dueDate: string,
  timezone: string,
  intervalDays: number,
  hour: number,
  minute: number,
  now: Date,
  horizonDays: number,
): Date[] {
  const today = getCivilDate(now, timezone);
  const firstEligibleDate = addCivilDays(dueDate, intervalDays);
  const elapsed = Math.max(0, civilDaysBetween(firstEligibleDate, today));
  const intervalsElapsed = Math.floor(elapsed / intervalDays);
  let civilDate = addCivilDays(firstEligibleDate, intervalsElapsed * intervalDays);
  let instant = getWorkspaceInstant(civilDate, hour, minute, timezone);
  if (instant <= now) {
    civilDate = addCivilDays(civilDate, intervalDays);
    instant = getWorkspaceInstant(civilDate, hour, minute, timezone);
  }
  const horizon = new Date(now.getTime() + horizonDays * 86_400_000);
  const dates: Date[] = [];
  while (instant <= horizon) {
    dates.push(instant);
    civilDate = addCivilDays(civilDate, intervalDays);
    instant = getWorkspaceInstant(civilDate, hour, minute, timezone);
  }
  return dates;
}
