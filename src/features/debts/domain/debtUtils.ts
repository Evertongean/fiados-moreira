import { formatBrazilianPlate } from '@/utils/plate';
export { formatCivilDate, maskCivilDateInput, parseCivilDate } from '@/utils/date';

export function normalizeDebtSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatVehicleLabel(input: {
  brand: string | null;
  model: string | null;
  plate: string | null;
}): string | null {
  if (!input.brand || !input.model) return null;
  const plate = formatBrazilianPlate(input.plate);
  return plate ? `${input.brand} ${input.model} · ${plate}` : `${input.brand} ${input.model}`;
}
