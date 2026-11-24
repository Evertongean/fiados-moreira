import { FileX2 } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { RouteState } from '@/components/layouts/RouteState';
import { PageHeader } from '@/components/navigation';
import { EmptyState, Screen } from '@/components/ui';
import { getRouteId } from '@/utils/routes';

export function PaymentReceiptScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  if (!getRouteId(id)) {
    return (
      <RouteState
        description="O identificador recebido não é válido."
        kind="invalid"
        title="Pagamento inválido"
      />
    );
  }

  return (
    <Screen contentContainerStyle={styles.page}>
      <PageHeader fallbackRoute="/debts" title="Comprovante" />
      <EmptyState
        description="Nenhum comprovante foi gerado. A funcionalidade será implementada no Prompt 15."
        icon={FileX2}
        title="Comprovante indisponível"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ page: { gap: 20 } });
