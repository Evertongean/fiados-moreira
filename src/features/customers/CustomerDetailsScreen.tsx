import { Car, History, Pencil, ReceiptText, UserRound } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PageHeader, SectionHeader } from '@/components/navigation';
import { Alert, Button, Card, EmptyState, Screen } from '@/components/ui';
import { getRouteId } from '@/utils/routes';
import { RouteState } from '@/components/layouts/RouteState';

export function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const customerId = getRouteId(id);
  const router = useRouter();

  if (!customerId) {
    return (
      <RouteState
        description="O identificador do cliente está ausente ou possui formato inválido."
        headerTitle="Cliente"
        kind="invalid"
        title="Cliente inválido"
      />
    );
  }

  return (
    <Screen contentContainerStyle={styles.page} scroll>
      <PageHeader
        fallbackRoute="/customers"
        rightAction={
          <Button
            icon={Pencil}
            label="Editar"
            onPress={() =>
              router.push({ pathname: '/customers/[id]/edit', params: { id: customerId } })
            }
            size="sm"
            variant="ghost"
          />
        }
        title="Detalhes do cliente"
      />
      <Alert
        description="Os dados do cliente serão carregados do banco local no Prompt 05."
        title="Registro ainda indisponível"
      />
      <Card variant="outlined">
        <SectionHeader
          description="Nome, telefone, endereço e observações"
          title="Dados pessoais"
        />
      </Card>
      <Card variant="outlined">
        <SectionHeader
          description="Valor calculado quando o módulo financeiro existir"
          title="Saldo devedor"
        />
      </Card>
      <View style={styles.section}>
        <SectionHeader title="Veículos cadastrados" />
        <EmptyState
          description="Nenhum veículo disponível para este cliente."
          icon={Car}
          title="Sem veículos"
        />
      </View>
      <View style={styles.section}>
        <SectionHeader title="Fiados e pagamentos" />
        <EmptyState
          description="O histórico financeiro será exibido aqui."
          icon={ReceiptText}
          title="Sem registros"
        />
      </View>
      <Button
        icon={History}
        label="Ver histórico financeiro"
        onPress={() =>
          router.push({ pathname: '/customers/[id]/history', params: { id: customerId } })
        }
        variant="outline"
      />
      <Button
        icon={UserRound}
        label="Cadastrar veículo"
        onPress={() => router.push('/vehicles/new')}
        variant="secondary"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ page: { gap: 20, paddingBottom: 40 }, section: { gap: 10 } });
