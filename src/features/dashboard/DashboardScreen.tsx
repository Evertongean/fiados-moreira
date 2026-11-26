import { useFocusEffect, useRouter } from 'expo-router';
import {
  BanknoteArrowDown,
  CalendarClock,
  CircleDollarSign,
  ClockAlert,
  HandCoins,
  Plus,
  ReceiptText,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { BalanceCard, StatCard } from '@/components/cards';
import { AppHeader, SectionHeader } from '@/components/navigation';
import { Alert, Button, EmptyState, LoadingState, Screen } from '@/components/ui';
import { DashboardActivityItem } from '@/features/dashboard/components/DashboardActivityItem';
import { DashboardDebtItem } from '@/features/dashboard/components/DashboardDebtItem';
import { ReceiptsChart } from '@/features/dashboard/components/ReceiptsChart';
import { getLastCivilDaysRange } from '@/features/dashboard/domain/dashboardDateUtils';
import type {
  DashboardActivity,
  DashboardSnapshot,
} from '@/features/dashboard/domain/dashboardTypes';
import { useDatabase } from '@/hooks/useDatabase';
import { useTheme } from '@/hooks/useTheme';
import { formatBRLCents } from '@/utils/currency';

export function DashboardScreen() {
  const router = useRouter();
  const { workspace, repositories } = useDatabase();
  const { tokens } = useTheme();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [hidden, setHidden] = useState(false);
  const requestVersion = useRef(0);
  const snapshotRef = useRef<DashboardSnapshot | null>(null);

  const load = useCallback(
    async (asRefresh = false) => {
      const version = ++requestVersion.current;
      if (asRefresh) setRefreshing(true);
      else setStatus((current) => (current === 'ready' ? current : 'loading'));
      try {
        const result = await repositories.dashboard.getSnapshot(workspace.id, workspace.timezone);
        if (requestVersion.current !== version) return;
        snapshotRef.current = result;
        setSnapshot(result);
        setRefreshError(false);
        setStatus('ready');
      } catch {
        if (requestVersion.current !== version) return;
        if (snapshotRef.current) {
          setRefreshError(true);
          setStatus('ready');
        } else {
          setStatus('error');
        }
      } finally {
        if (requestVersion.current === version) setRefreshing(false);
      }
    },
    [repositories.dashboard, workspace.id, workspace.timezone],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestVersion.current += 1;
      };
    }, [load]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void load();
    });
    return () => subscription.remove();
  }, [load]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const scheduleNextCivilDay = () => {
      const nextDayAt = getLastCivilDaysRange(new Date(), workspace.timezone, 1).endAt;
      const delay = Math.max(1_000, new Date(nextDayAt).getTime() - Date.now() + 250);
      timeout = setTimeout(() => {
        void load();
        scheduleNextCivilDay();
      }, delay);
    };
    scheduleNextCivilDay();
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [load, workspace.timezone]);

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState fullScreen label="Consolidando dashboard…" />
      </Screen>
    );
  }

  if (status === 'error' || !snapshot) {
    return (
      <Screen contentContainerStyle={styles.page} safeAreaEdges={['top', 'left', 'right']}>
        <AppHeader
          showBrand
          showSearch
          subtitle="Bem-vindo ao controle da sua oficina"
          title="Fiados Moreira"
        />
        <EmptyState
          action={{ label: 'Tentar novamente', onPress: () => void load() }}
          description="Seus dados continuam armazenados localmente. Tente consultar novamente."
          icon={ReceiptText}
          title="Não foi possível carregar o dashboard."
        />
      </Screen>
    );
  }

  const { summary } = snapshot;
  const hasReceipts = snapshot.dailyReceipts.some(
    ({ grossCents, reversedCents }) => grossCents !== 0 || reversedCents !== 0,
  );
  const money = (valueCents: number) => (hidden ? 'R$ ••••••' : formatBRLCents(valueCents));

  const openActivity = (activity: DashboardActivity) => {
    if (
      activity.paymentId &&
      activity.type !== 'debt_created' &&
      activity.type !== 'debt_updated'
    ) {
      router.push({ pathname: '/payments/[id]', params: { id: activity.paymentId } });
      return;
    }
    router.push({ pathname: '/debts/[id]', params: { id: activity.debtId } });
  };

  return (
    <Screen
      contentContainerStyle={styles.page}
      safeAreaEdges={['top', 'left', 'right']}
      scroll
      scrollViewProps={{
        refreshControl: (
          <RefreshControl
            colors={[tokens.colors.primary]}
            onRefresh={() => void load(true)}
            refreshing={refreshing}
            tintColor={tokens.colors.primary}
          />
        ),
      }}
    >
      <AppHeader
        showBrand
        showSearch
        subtitle="Bem-vindo ao controle da sua oficina"
        title="Fiados Moreira"
      />

      {refreshError ? (
        <Alert
          description="Os últimos valores carregados foram mantidos. Puxe a tela para tentar novamente."
          title="Não foi possível atualizar agora"
          variant="warning"
        />
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          action={
            <Button
              label="Ver fiados"
              onPress={() => router.push({ pathname: '/debts', params: { filter: 'open' } })}
              size="sm"
              variant="link"
            />
          }
          description="Saldo atual de todos os fiados não cancelados."
          title="Resumo financeiro"
        />
        <BalanceCard
          description={`${summary.openDebtCount} ${summary.openDebtCount === 1 ? 'fiado em aberto' : 'fiados em aberto'}`}
          hidden={hidden}
          icon={CircleDollarSign}
          onToggleHidden={() => setHidden((current) => !current)}
          title="Total a receber"
          valueCents={summary.receivableCents}
        />
        <View style={styles.grid}>
          <IndicatorLink
            accessibilityLabel="Abrir fiados atrasados"
            onPress={() => router.push({ pathname: '/debts', params: { filter: 'overdue' } })}
          >
            <StatCard
              description={`${summary.overdueDebtCount} ${summary.overdueDebtCount === 1 ? 'fiado atrasado' : 'fiados atrasados'}`}
              icon={ClockAlert}
              label="Total em atraso"
              value={money(summary.overdueCents)}
              variant="destructive"
            />
          </IndicatorLink>
          <IndicatorLink
            accessibilityLabel="Abrir valores recebidos"
            onPress={() => router.push('/reports/received')}
          >
            <StatCard
              description={
                hidden
                  ? 'Bruto e estornos ocultos'
                  : `Bruto ${formatBRLCents(summary.monthGrossReceivedCents)} · Estornos ${formatBRLCents(summary.monthReversedCents)}`
              }
              icon={BanknoteArrowDown}
              label="Líquido recebido no mês"
              value={money(summary.monthNetReceivedCents)}
              variant={summary.monthNetReceivedCents < 0 ? 'destructive' : 'success'}
            />
          </IndicatorLink>
          <IndicatorLink
            accessibilityLabel="Abrir fiados com vencimento hoje"
            onPress={() => router.push({ pathname: '/debts', params: { filter: 'due_today' } })}
          >
            <StatCard
              description="Saldos que vencem na data civil de hoje"
              icon={CalendarClock}
              label="Vencem hoje"
              value={money(summary.dueTodayCents)}
              variant="warning"
            />
          </IndicatorLink>
          <IndicatorLink
            accessibilityLabel="Abrir clientes"
            onPress={() =>
              router.push({ pathname: '/customers', params: { financial: 'with_debt' } })
            }
          >
            <StatCard
              description="Com pelo menos um saldo pendente"
              icon={Users}
              label="Clientes com dívidas"
              value={String(summary.debtorCustomerCount)}
              variant="info"
            />
          </IndicatorLink>
          <IndicatorLink
            accessibilityLabel="Abrir fiados em aberto"
            onPress={() => router.push({ pathname: '/debts', params: { filter: 'open' } })}
          >
            <StatCard
              description="Pendentes ou parcialmente pagos"
              icon={Wallet}
              label="Fiados em aberto"
              value={String(summary.openDebtCount)}
            />
          </IndicatorLink>
          <IndicatorLink
            accessibilityLabel="Abrir quantidade de fiados atrasados"
            onPress={() => router.push({ pathname: '/debts', params: { filter: 'overdue' } })}
          >
            <StatCard
              description="Vencimento anterior a hoje"
              icon={ClockAlert}
              label="Fiados atrasados"
              value={String(summary.overdueDebtCount)}
              variant="destructive"
            />
          </IndicatorLink>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Ações rápidas" />
        <View style={styles.actions}>
          <Button
            icon={UserPlus}
            label="Novo cliente"
            onPress={() => router.push('/customers/new')}
            size="sm"
            variant="outline"
          />
          <Button
            icon={Plus}
            label="Novo fiado"
            onPress={() => router.push('/debts/new')}
            size="sm"
            variant="outline"
          />
          <Button
            icon={HandCoins}
            label="Registrar pagamento"
            onPress={() =>
              router.push({ pathname: '/debts', params: { filter: 'open', mode: 'payment' } })
            }
            size="sm"
            variant="outline"
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          description="Recebimentos brutos e estornos pela data efetiva de cada evento."
          title="Últimos sete dias"
        />
        {hasReceipts ? (
          <ReceiptsChart data={snapshot.dailyReceipts} hidden={hidden} />
        ) : (
          <EmptyState
            description="Pagamentos e estornos efetivados no período aparecerão aqui."
            icon={BanknoteArrowDown}
            title="Sem movimentações nos últimos sete dias"
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          action={
            <Button
              label="Ver todos"
              onPress={() => router.push({ pathname: '/debts', params: { filter: 'open' } })}
              size="sm"
              variant="link"
            />
          }
          title="Próximos vencimentos"
        />
        {snapshot.upcomingDebts.length ? (
          snapshot.upcomingDebts.map((debt) => (
            <DashboardDebtItem
              key={debt.id}
              debt={debt}
              hidden={hidden}
              onPress={() => router.push({ pathname: '/debts/[id]', params: { id: debt.id } })}
            />
          ))
        ) : (
          <EmptyState
            description="Fiados com saldo e vencimento hoje ou no futuro aparecerão aqui."
            icon={CalendarClock}
            title="Nenhum próximo vencimento"
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          action={
            <Button
              label="Ver atrasados"
              onPress={() => router.push({ pathname: '/debts', params: { filter: 'overdue' } })}
              size="sm"
              variant="link"
            />
          }
          description="Mais antigos primeiro; em empate, maior saldo."
          title="Atrasados prioritários"
        />
        {snapshot.priorityOverdueDebts.length ? (
          snapshot.priorityOverdueDebts.map((debt) => (
            <DashboardDebtItem
              key={debt.id}
              debt={debt}
              hidden={hidden}
              onPress={() => router.push({ pathname: '/debts/[id]', params: { id: debt.id } })}
              overdue
            />
          ))
        ) : (
          <EmptyState
            description="Não há fiados vencidos com saldo pendente."
            icon={ClockAlert}
            title="Nenhum fiado atrasado"
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Atividades financeiras recentes" />
        {snapshot.recentActivities.length ? (
          snapshot.recentActivities.map((activity) => (
            <DashboardActivityItem
              key={activity.id}
              activity={activity}
              hidden={hidden}
              onPress={() => openActivity(activity)}
              timezone={workspace.timezone}
            />
          ))
        ) : (
          <EmptyState
            description="Fiados, pagamentos e estornos confirmados aparecerão aqui."
            icon={ReceiptText}
            title="Nenhuma atividade registrada"
          />
        )}
      </View>
    </Screen>
  );
}

function IndicatorLink({
  accessibilityLabel,
  onPress,
  children,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.gridItem, { opacity: pressed ? 0.78 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { gap: 28, paddingBottom: 32 },
  section: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { flexGrow: 1, flexBasis: 150, minWidth: 150 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
