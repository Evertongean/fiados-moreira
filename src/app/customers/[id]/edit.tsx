import { useLocalSearchParams } from 'expo-router';

import { RouteState } from '@/components/layouts/RouteState';
import { CustomerFormScreen } from '@/features/customers/CustomerFormScreen';
import { getRouteId } from '@/utils/routes';

export default function EditCustomerRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  if (!getRouteId(id)) {
    return (
      <RouteState
        description="O identificador recebido não é válido."
        kind="invalid"
        title="Cliente inválido"
      />
    );
  }
  return <CustomerFormScreen mode="edit" />;
}
