export function normalizeCustomerName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

export function normalizeSearchText(value: string): string {
  return normalizeCustomerName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

export function normalizeOptionalSingleLine(value: string | null | undefined): string | null {
  const normalized = value?.normalize('NFKC').trim().replace(/\s+/g, ' ') ?? '';
  return normalized || null;
}

export function normalizeOptionalMultiline(value: string | null | undefined): string | null {
  const normalized = value?.normalize('NFKC').trim() ?? '';
  return normalized || null;
}
