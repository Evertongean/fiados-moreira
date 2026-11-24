export const MAX_CURRENCY_CENTS = 999_999_999_99;

const integerFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
  useGrouping: true,
});

export function isValidCents(value: number): boolean {
  return Number.isSafeInteger(value) && Math.abs(value) <= MAX_CURRENCY_CENTS;
}

export function formatBRLCents(cents: number): string {
  if (!isValidCents(cents)) {
    throw new RangeError('O valor em centavos deve ser um inteiro seguro dentro do limite aceito.');
  }

  const absoluteCents = Math.abs(cents);
  const wholeReais = Math.floor(absoluteCents / 100);
  const fraction = String(absoluteCents % 100).padStart(2, '0');
  const sign = cents < 0 ? '-' : '';

  return `R$ ${sign}${integerFormatter.format(wholeReais)},${fraction}`;
}

export function parseBRLToCents(input: string): number | null {
  const normalized = input
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '');

  if (normalized === '') {
    return null;
  }

  const match = normalized.match(/^(-)?((?:\d{1,3}(?:\.\d{3})*)|\d+)(?:,(\d{1,2}))?$/);
  if (!match) {
    return null;
  }

  const [, sign, wholePart = '0', decimalPart = ''] = match;
  const wholeDigits = wholePart.replace(/\./g, '');
  const whole = Number(wholeDigits);
  const fraction = Number(decimalPart.padEnd(2, '0'));

  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(fraction)) {
    return null;
  }

  const cents = whole * 100 + fraction;
  const signedCents = sign ? -cents : cents;

  return isValidCents(signedCents) ? signedCents : null;
}

export function parseCurrencyDigits(input: string): number | null {
  const digits = input.replace(/\D/g, '');
  if (digits === '') {
    return null;
  }

  const cents = Number(digits);
  return isValidCents(cents) ? cents : null;
}
