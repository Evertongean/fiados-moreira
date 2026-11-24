import { Car, Pencil } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { RouteState } from '@/components/layouts/RouteState';
import { PageHeader } from '@/components/navigation';
import { Alert, Button, EmptyState, Screen } from '@/components/ui';
import { getRouteId } from '@/utils/routes';

export function VehicleDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const vehicleId = getRouteId(id);
  const router = useRouter();

  if (!vehicleId) {
    return (
      <RouteState
        description="O identificador recebido não é válido."
        kind="invalid"
        title="Veículo inválido"
      />
    );
  }

  return (
    <Screen contentContainerStyle={styles.page}>
      <PageHeader
        fallbackRoute="/customers"
        rightAction={
          <Button
            icon={Pencil}
            label="Editar"
            onPress={() =>
              router.push({ pathname: '/vehicles/[id]/edit', params: { id: vehicleId } })
            }
            size="sm"
            variant="ghost"
          />
        }
        title="Detalhes do veículo"
      />
      <Alert
        description="O veículo será consultado no banco local no Prompt 06."
        title="Registro indisponível"
      />
      <EmptyState
        description="Marca, modelo, placa, ano, cor e cliente responsável aparecerão aqui."
        icon={Car}
        title="Dados do veículo ainda indisponíveis"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ page: { gap: 20 } });
