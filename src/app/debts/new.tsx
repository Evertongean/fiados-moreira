import { DebtFormScreen } from '@/features/debts/DebtFormScreen';
import { useLocalSearchParams } from 'expo-router';
import { getRouteId } from '@/utils/routes';

export default function NewDebtRoute() {
  const { customerId, vehicleId } = useLocalSearchParams<{
    customerId?: string | string[];
    vehicleId?: string | string[];
  }>();
  return (
    <DebtFormScreen
      initialCustomerId={getRouteId(customerId) ?? undefined}
      initialVehicleId={getRouteId(vehicleId) ?? undefined}
      mode="create"
    />
  );
}
