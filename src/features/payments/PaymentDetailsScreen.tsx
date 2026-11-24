import { FileText, ReceiptText } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { RouteState } from '@/components/layouts/RouteState';
import { PageHeader } from '@/components/navigation';
import { Alert, Button, EmptyState, Screen } from '@/components/ui';
import { getRouteId } from '@/utils/routes';

export function PaymentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const paymentId = getRouteId(id);
  const router = useRouter();

  if (!paymentId) {
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
      <PageHeader fallbackRoute="/debts" title="Detalhes do pagamento" />
      <Alert
        description="Transações financeiras serão implementadas no Prompt 08."
        title="Pagamento indisponível"
      />
      <EmptyState
        description="Valor, data, método, situação e vínculo com o fiado aparecerão aqui."
        icon={ReceiptText}
        title="Dados ainda indisponíveis"
      />
      <Button
        icon={FileText}
        label="Ver comprovante"
        onPress={() =>
          router.push({ pathname: '/payments/[id]/receipt', params: { id: paymentId } })
        }
        variant="outline"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ page: { gap: 20 } });
