const BRAZIL_COUNTRY_CODE = '55';

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeBrazilianPhone(value: string | null | undefined): string | null {
  const digits = onlyDigits(value ?? '');
  if (!digits) return null;

  const national =
    digits.startsWith(BRAZIL_COUNTRY_CODE) && (digits.length === 12 || digits.length === 13)
      ? digits.slice(BRAZIL_COUNTRY_CODE.length)
      : digits;

  if (!/^[1-9]\d(?:[2-5]\d{7}|9\d{8})$/.test(national)) return null;
  return `+${BRAZIL_COUNTRY_CODE}${national}`;
}

export function isValidBrazilianPhone(value: string): boolean {
  return normalizeBrazilianPhone(value) !== null;
}

export function formatBrazilianPhone(value: string | null | undefined): string | null {
  const normalized = normalizeBrazilianPhone(value);
  if (!normalized) return null;
  const national = normalized.slice(3);
  const areaCode = national.slice(0, 2);
  const subscriber = national.slice(2);
  const splitAt = subscriber.length === 9 ? 5 : 4;
  return `(${areaCode}) ${subscriber.slice(0, splitAt)}-${subscriber.slice(splitAt)}`;
}

export function normalizePhoneSearch(value: string): string {
  const digits = onlyDigits(value);
  return digits.startsWith(BRAZIL_COUNTRY_CODE) && digits.length > 11 ? digits.slice(2) : digits;
}
