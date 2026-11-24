import { BanknoteArrowDown, ChartColumn, ClockAlert, WalletCards } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader, SectionHeader } from '@/components/navigation';
import { Alert, Card, EmptyState, Screen } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

const reportLinks = [
  {
    title: 'Valores a receber',
    description: 'Saldos pendentes por período',
    icon: WalletCards,
    route: '/reports/receivables' as const,
  },
  {
    title: 'Valores recebidos',
    description: 'Pagamentos confirmados por período',
    icon: BanknoteArrowDown,
    route: '/reports/received' as const,
  },
  {
    title: 'Fiados atrasados',
    description: 'Dívidas vencidas com saldo positivo',
    icon: ClockAlert,
    route: '/reports/overdue' as const,
  },
] as const;

export function ReportsScreen() {
  const router = useRouter();
  const { tokens } = useTheme();

  return (
    <Screen contentContainerStyle={styles.page} safeAreaEdges={['top', 'left', 'right']} scroll>
      <AppHeader subtitle="Indicadores para acompanhar a saúde financeira" title="Relatórios" />
      <Alert
        description="Os indicadores serão calculados somente após a implementação da base local e das regras financeiras."
        title="Dados ainda indisponíveis"
      />
      <View style={styles.section}>
        <SectionHeader
          description="Seleção de datas será habilitada no módulo funcional."
          title="Período de análise"
        />
        <EmptyState
          description="Total a receber, recebido, em atraso e quantidade de fiados aparecerão aqui."
          icon={ChartColumn}
          title="Sem indicadores financeiros"
        />
      </View>
      <View style={styles.section}>
        <SectionHeader
          description="Evolução, distribuição e maiores saldos serão exibidos sem dados inventados."
          title="Análises"
        />
        {reportLinks.map(({ title, description, icon: Icon, route }) => (
          <Card key={route} onPress={() => router.push(route)} variant="outlined">
            <SectionHeader
              action={<Icon color={tokens.colors.primary} size={22} />}
              description={description}
              title={title}
            />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ page: { gap: 24, paddingBottom: 32 }, section: { gap: 12 } });
