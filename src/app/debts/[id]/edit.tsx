import { useLocalSearchParams } from 'expo-router';

import { RouteState } from '@/components/layouts/RouteState';
import { DebtFormScreen } from '@/features/debts/DebtFormScreen';
import { getRouteId } from '@/utils/routes';

export default function EditDebtRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  if (!getRouteId(id)) {
    return (
      <RouteState
        description="O identificador recebido não é válido."
        kind="invalid"
        title="Fiado inválido"
      />
    );
  }
  return <DebtFormScreen mode="edit" />;
}
