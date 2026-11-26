const OLD_BRAZILIAN_PLATE = /^[A-Z]{3}\d{4}$/;
const MERCOSUL_PLATE = /^[A-Z]{3}\d[A-Z]\d{2}$/;

export function normalizeBrazilianPlate(value: string | null | undefined): string | null {
  const normalized = value?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() ?? '';
  return normalized || null;
}

export function isValidBrazilianPlate(value: string | null | undefined): boolean {
  const normalized = normalizeBrazilianPlate(value);
  return (
    normalized !== null && (OLD_BRAZILIAN_PLATE.test(normalized) || MERCOSUL_PLATE.test(normalized))
  );
}

export function formatBrazilianPlate(value: string | null | undefined): string | null {
  const normalized = normalizeBrazilianPlate(value);
  if (!normalized) return null;
  return OLD_BRAZILIAN_PLATE.test(normalized)
    ? `${normalized.slice(0, 3)}-${normalized.slice(3)}`
    : normalized;
}
