import { useFocusEffect, useRouter } from 'expo-router';
import {
  Bell,
  CalendarClock,
  CircleDollarSign,
  ClockAlert,
  Eye,
  EyeOff,
  HandCoins,
  MessageCircle,
  Plus,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, RefreshControl, StyleSheet, View } from 'react-native';

import { SectionHeader } from '@/components/navigation';
import {
  Alert,
  AppText,
  Button,
  Card,
  EmptyState,
  IconButton,
  LoadingState,
  Screen,
} from '@/components/ui';
import { DashboardDebtItem } from '@/features/dashboard/components/DashboardDebtItem';
import { getLastCivilDaysRange } from '@/features/dashboard/domain/dashboardDateUtils';
import type { DashboardSnapshot } from '@/features/dashboard/domain/dashboardTypes';
import { useNotifications } from '@/features/notifications/NotificationProvider';
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
        <View style={styles.header}>
          <DashboardHeader />
          <View style={[styles.divider, { backgroundColor: tokens.colors.border }]} />
        </View>
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
      <View style={styles.header}>
        <DashboardHeader />
        <View style={[styles.divider, { backgroundColor: tokens.colors.border }]} />
      </View>

      {refreshError ? (
        <Alert
          description="Os últimos valores carregados foram mantidos. Puxe a tela para tentar novamente."
          title="Não foi possível atualizar agora"
          variant="warning"
        />
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Resumo financeiro" />
        <View style={styles.summaryCards}>
          <DashboardSummaryCard
            countLabel={`${summary.openDebtCount} ${summary.openDebtCount === 1 ? 'fiado em aberto' : 'fiados em aberto'}`}
            hidden={hidden}
            icon={CircleDollarSign}
            onToggleHidden={() => setHidden((current) => !current)}
            title="Total a receber"
            valueCents={summary.receivableCents}
          />
          <DashboardSummaryCard
            accessibilityLabel="Abrir fiados atrasados"
            countLabel={`${summary.overdueDebtCount} ${summary.overdueDebtCount === 1 ? 'fiado atrasado' : 'fiados atrasados'}`}
            hidden={hidden}
            icon={ClockAlert}
            onPress={() => router.push({ pathname: '/debts', params: { filter: 'overdue' } })}
            title="Total em atraso"
            valueCents={summary.overdueCents}
            variant="overdue"
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Ações rápidas" />
        <View style={styles.actionRow}>
          <View style={styles.halfAction}>
            <Button
              accessibilityLabel="Novo fiado"
              fullWidth
              icon={Plus}
              label="Novo fiado"
              onPress={() => router.push('/debts/new')}
              variant="primary"
            />
          </View>
          <View style={styles.halfAction}>
            <Button
              accessibilityLabel="Registrar pagamento"
              fullWidth
              icon={HandCoins}
              label="Registrar pagamento"
              onPress={() =>
                router.push({ pathname: '/debts', params: { filter: 'open', mode: 'payment' } })
              }
              variant="primaryOutline"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          action={
            <Button
              accessibilityLabel="Ver todos os próximos vencimentos"
              label="Ver todos"
              onPress={() => router.push({ pathname: '/debts', params: { filter: 'open' } })}
              size="sm"
              variant="ghost"
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
          <DashboardEmptyState
            description="Você não possui vencimentos próximos."
            icon={CalendarClock}
            title="Nenhum próximo vencimento"
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          action={
            <Button
              accessibilityLabel="Ver todos os fiados atrasados"
              label="Ver atrasados"
              onPress={() => router.push({ pathname: '/debts', params: { filter: 'overdue' } })}
              size="sm"
              variant="ghost"
            />
          }
          title="Atrasados prioritários"
        />
        {snapshot.priorityOverdueDebts.length ? (
          snapshot.priorityOverdueDebts.map((debt) => (
            <View key={debt.id} style={styles.overdueItem}>
              <DashboardDebtItem
                debt={debt}
                hidden={hidden}
                onPress={() => router.push({ pathname: '/debts/[id]', params: { id: debt.id } })}
                overdue
              />
              <Button
                icon={MessageCircle}
                label="Cobrar pelo WhatsApp"
                onPress={() =>
                  router.push({
                    pathname: '/collections/compose',
                    params: { scope: 'debt', id: debt.id },
                  } as never)
                }
                size="sm"
                variant="outline"
              />
            </View>
          ))
        ) : (
          <DashboardEmptyState
            description="Não há dívidas vencidas."
            icon={ClockAlert}
            title="Nenhum fiado atrasado"
          />
        )}
      </View>
    </Screen>
  );
}

function DashboardSummaryCard({
  accessibilityLabel,
  countLabel,
  hidden,
  icon: Icon,
  onPress,
  onToggleHidden,
  title,
  valueCents,
  variant = 'receivable',
}: {
  accessibilityLabel?: string;
  countLabel: string;
  hidden: boolean;
  icon: LucideIcon;
  onPress?: () => void;
  onToggleHidden?: () => void;
  title: string;
  valueCents: number;
  variant?: 'receivable' | 'overdue';
}) {
  const { tokens } = useTheme();
  const overdue = variant === 'overdue';
  const color = overdue ? tokens.colors.destructive : tokens.colors.primary;

  return (
    <Card
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        styles.summaryCard,
        {
          backgroundColor: overdue ? `${tokens.colors.destructive}12` : tokens.colors.secondary,
          borderColor: overdue ? `${tokens.colors.destructive}40` : tokens.colors.accent,
        },
      ]}
      variant="outlined"
    >
      <View style={styles.summaryContent}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryTitle}>
            <Icon color={color} size={18} />
            <AppText color={overdue ? 'destructive' : 'primary'} variant="bodySmall">
              {title}
            </AppText>
          </View>
          {onToggleHidden ? (
            <View style={styles.summaryToggle}>
              <IconButton
                accessibilityLabel={hidden ? 'Mostrar valor' : 'Ocultar valor'}
                icon={hidden ? EyeOff : Eye}
                onPress={onToggleHidden}
                size="sm"
                variant="ghost"
              />
            </View>
          ) : null}
        </View>
        <AppText color={overdue ? 'destructive' : 'primary'} variant="h3">
          {hidden ? 'R$ ••••••' : formatBRLCents(valueCents)}
        </AppText>
        <AppText color="textSecondary" variant="caption">
          {countLabel}
        </AppText>
      </View>
    </Card>
  );
}

function DashboardHeader() {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const { tokens } = useTheme();

  return (
    <View style={styles.dashboardHeader}>
      <View style={styles.headerCopy}>
        <AppText accessibilityRole="header" variant="h4">
          Fiados Moreira
        </AppText>
        <AppText color="textSecondary" variant="bodySmall">
          Bem-vindo ao controle da sua oficina
        </AppText>
      </View>
      <View style={styles.headerActions}>
        <View style={styles.notificationAction}>
          <IconButton
            accessibilityLabel={
              unreadCount ? `Abrir notificações, ${unreadCount} não lidas` : 'Abrir notificações'
            }
            icon={Bell}
            onPress={() => router.push('/notifications')}
            size="sm"
            variant="ghost"
          />
          {unreadCount ? (
            <View
              style={[styles.notificationBadge, { backgroundColor: tokens.colors.destructive }]}
            >
              <AppText color="primaryForeground" style={styles.notificationBadgeText} weight="bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function DashboardEmptyState({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  const { tokens } = useTheme();

  return (
    <Card variant="outlined">
      <View style={styles.emptyRow}>
        <Icon color={tokens.colors.textMuted} size={22} />
        <View style={styles.emptyCopy}>
          <AppText variant="label">{title}</AppText>
          <AppText color="textSecondary" variant="caption">
            {description}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  page: { gap: 16, paddingBottom: 24 },
  header: { gap: 8 },
  dashboardHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: { flex: 1, gap: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  notificationAction: { position: 'relative' },
  notificationBadge: {
    position: 'absolute',
    right: -2,
    top: -1,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: { fontSize: 9, lineHeight: 11 },
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
  section: { gap: 10 },
  summaryCards: { gap: 10 },
  summaryCard: { minHeight: 104 },
  summaryContent: { position: 'relative', gap: 2 },
  summaryHeader: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 36,
  },
  summaryToggle: { position: 'absolute', right: -8, top: -10, zIndex: 1 },
  summaryTitle: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  actionRow: { flexDirection: 'row', gap: 8 },
  halfAction: { flex: 1, minWidth: 0 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyCopy: { flex: 1, gap: 1 },
  overdueItem: { gap: 8 },
});
