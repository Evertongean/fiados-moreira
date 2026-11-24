import { useLocalSearchParams } from 'expo-router';

import { RouteState } from '@/components/layouts/RouteState';
import { VehicleFormScreen } from '@/features/vehicles/VehicleFormScreen';
import { getRouteId } from '@/utils/routes';

export default function EditVehicleRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  if (!getRouteId(id)) {
    return (
      <RouteState
        description="O identificador recebido não é válido."
        kind="invalid"
        title="Veículo inválido"
      />
    );
  }
  return <VehicleFormScreen mode="edit" />;
}
