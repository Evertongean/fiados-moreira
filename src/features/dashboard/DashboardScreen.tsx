import {
  CircleDollarSign,
  Clock3,
  Plus,
  ReceiptText,
  TrendingUp,
  UserPlus,
  Wallet,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BalanceCard, StatCard } from '@/components/cards';
import { AppHeader, SectionHeader } from '@/components/navigation';
import { Button, Card, EmptyState, Screen } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

export function DashboardScreen() {
  const router = useRouter();
  const { tokens } = useTheme();

  return (
    <Screen contentContainerStyle={styles.page} safeAreaEdges={['top', 'left', 'right']} scroll>
      <AppHeader showBrand subtitle="Bem-vindo ao controle da sua oficina" title="Fiados Moreira" />

      <View style={styles.section}>
        <SectionHeader
          description="Os valores aparecerão após a implementação do banco de dados."
          title="Resumo financeiro"
        />
        <BalanceCard
          description="Ainda sem registros financeiros"
          icon={CircleDollarSign}
          title="Total a receber"
          valueCents={null}
        />
        <View style={styles.grid}>
          <StatCard
            description="Dados ainda não disponíveis"
            icon={TrendingUp}
            label="Recebido"
            style={styles.gridItem}
            value="Indisponível"
            variant="success"
          />
          <StatCard
            description="Dados ainda não disponíveis"
            icon={Clock3}
            label="Em atraso"
            style={styles.gridItem}
            value="Indisponível"
            variant="destructive"
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Ações rápidas" />
        <View style={styles.actionGrid}>
          <Card style={styles.actionCard} variant="outlined">
            <UserPlus color={tokens.colors.primary} size={24} />
            <Button
              icon={Plus}
              label="Novo cliente"
              onPress={() => router.push('/customers/new')}
              size="sm"
              variant="ghost"
            />
          </Card>
          <Card style={styles.actionCard} variant="outlined">
            <Wallet color={tokens.colors.primary} size={24} />
            <Button
              icon={Plus}
              label="Novo fiado"
              onPress={() => router.push('/debts/new')}
              size="sm"
              variant="ghost"
            />
          </Card>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Atividades recentes" />
        <EmptyState
          description="Os registros financeiros aparecerão aqui após a implementação do banco de dados."
          icon={ReceiptText}
          title="Nenhuma atividade registrada"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 28, paddingBottom: 32 },
  section: { gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { flex: 1, minWidth: 150 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { flex: 1, minWidth: 150, alignItems: 'center' },
});
