import { useLocalSearchParams } from 'expo-router';

import { RouteState } from '@/components/layouts/RouteState';
import { CustomerFormScreen } from '@/features/customers/CustomerFormScreen';
import { getRouteId } from '@/utils/routes';

export default function EditCustomerRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const customerId = getRouteId(id);
  if (!customerId) {
    return (
      <RouteState
        description="O identificador recebido não é válido."
        kind="invalid"
        title="Cliente inválido"
      />
    );
  }
  return <CustomerFormScreen customerId={customerId} mode="edit" />;
}
