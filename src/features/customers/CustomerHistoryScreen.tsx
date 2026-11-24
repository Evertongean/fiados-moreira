import { History } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { RouteState } from '@/components/layouts/RouteState';
import { PageHeader } from '@/components/navigation';
import { EmptyState, Screen } from '@/components/ui';
import { getRouteId } from '@/utils/routes';

export function CustomerHistoryScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  if (!getRouteId(id)) {
    return (
      <RouteState
        description="Não foi possível identificar o cliente."
        kind="invalid"
        title="Parâmetro inválido"
      />
    );
  }

  return (
    <Screen contentContainerStyle={styles.page}>
      <PageHeader fallbackRoute="/customers" title="Histórico do cliente" />
      <EmptyState
        description="Os registros cronológicos de fiados, pagamentos e estornos aparecerão aqui no Prompt 09."
        icon={History}
        title="Histórico ainda indisponível"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ page: { gap: 20 } });
