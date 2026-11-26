import { useLocalSearchParams } from 'expo-router';

import { VehicleFormScreen } from '@/features/vehicles/VehicleFormScreen';
import { getRouteId } from '@/utils/routes';

export default function NewVehicleRoute() {
  const { customerId } = useLocalSearchParams<{ customerId?: string | string[] }>();
  return (
    <VehicleFormScreen initialCustomerId={getRouteId(customerId) ?? undefined} mode="create" />
  );
}
