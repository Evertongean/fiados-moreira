import type { VehicleRow, VehicleType } from '@/database/schema';
import { normalizeBrazilianPlate } from '@/utils/plate';

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  motorcycle: 'Motocicleta',
  car: 'Carro',
  truck: 'Caminhão',
  van: 'Van',
  other: 'Outro',
};

export function normalizeVehicleText(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

export function normalizeVehicleSearch(value: string): string {
  return normalizeVehicleText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

export function normalizeOptionalVehicleText(value: string | null | undefined): string | null {
  return value == null ? null : normalizeVehicleText(value) || null;
}

export function normalizeOptionalVehicleNotes(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = value
    .normalize('NFKC')
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .join('\n')
    .trim();
  return normalized || null;
}

export function vehicleMatchesQuery(vehicle: VehicleRow, query: string): boolean {
  const text = normalizeVehicleSearch(query);
  const plate = normalizeBrazilianPlate(query);
  if (!text && !plate) return true;
  return (
    normalizeVehicleSearch(vehicle.brand).includes(text) ||
    normalizeVehicleSearch(vehicle.model).includes(text) ||
    Boolean(plate && vehicle.plate?.includes(plate))
  );
}
