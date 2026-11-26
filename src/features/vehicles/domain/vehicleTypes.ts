import type { VehicleRow } from '@/database/schema';

export type VehicleStatusFilter = 'active' | 'archived' | 'all';

export interface VehicleListFilters {
  query?: string;
  status?: VehicleStatusFilter;
}

export interface PotentialVehicleDuplicate {
  vehicle: VehicleRow;
}
