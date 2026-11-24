export function nowIso(): string {
  return new Date().toISOString();
}

export function getCivilDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  const year = value('year');
  const month = value('month');
  const day = value('day');
  if (!year || !month || !day) throw new RangeError('Não foi possível calcular a data civil.');
  return `${year}-${month}-${day}`;
}
