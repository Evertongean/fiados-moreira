import { MessageCircle, Pencil, ReceiptText, WalletCards } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { RouteState } from '@/components/layouts/RouteState';
import { PageHeader, SectionHeader } from '@/components/navigation';
import { Alert, Button, Card, EmptyState, Screen } from '@/components/ui';
import { getRouteId } from '@/utils/routes';

export function DebtDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const debtId = getRouteId(id);
  const router = useRouter();

  if (!debtId) {
    return (
      <RouteState
        description="O identificador recebido não é válido."
        kind="invalid"
        title="Fiado inválido"
      />
    );
  }

  return (
    <Screen contentContainerStyle={styles.page} scroll>
      <PageHeader
        fallbackRoute="/debts"
        rightAction={
          <Button
            icon={Pencil}
            label="Editar"
            onPress={() => router.push({ pathname: '/debts/[id]/edit', params: { id: debtId } })}
            size="sm"
            variant="ghost"
          />
        }
        title="Detalhes do fiado"
      />
      <Alert
        description="Nenhum cálculo ou registro financeiro está ativo nesta etapa."
        title="Dados indisponíveis"
      />
      <Card variant="outlined">
        <SectionHeader
          description="Cliente, veículo e descrição do serviço"
          title="Informações do lançamento"
        />
      </Card>
      <Card variant="outlined">
        <SectionHeader
          description="Valor original, valor pago e saldo pendente"
          title="Resumo financeiro"
        />
      </Card>
      <Card variant="outlined">
        <SectionHeader
          description="Vencimento e situação serão derivados pelas regras de negócio"
          title="Situação da dívida"
        />
      </Card>
      <View style={styles.section}>
        <SectionHeader title="Histórico de pagamentos" />
        <EmptyState
          description="Pagamentos válidos e estornos aparecerão nesta seção."
          icon={ReceiptText}
          title="Sem pagamentos"
        />
      </View>
      <Button
        icon={WalletCards}
        label="Registrar pagamento"
        onPress={() => router.push({ pathname: '/debts/[id]/payment', params: { id: debtId } })}
      />
      <Button
        disabled
        icon={MessageCircle}
        label="Cobrar pelo WhatsApp — indisponível"
        onPress={() => undefined}
        variant="outline"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ page: { gap: 18, paddingBottom: 40 }, section: { gap: 10 } });
