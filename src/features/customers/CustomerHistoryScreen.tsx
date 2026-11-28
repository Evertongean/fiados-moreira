import type { CustomerRow, VehicleRow } from '@/database/schema';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { History } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { RouteState } from '@/components/layouts/RouteState';
import { PageHeader, SectionHeader } from '@/components/navigation';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  Screen,
} from '@/components/ui';
import { CustomerFinancialSummary } from '@/features/customers/components/CustomerFinancialSummary';
import { FinancialTimelineItem } from '@/features/customers/components/FinancialTimelineItem';
import { getFinancialHistoryPeriod } from '@/features/customers/domain/customerHistoryUtils';
import type {
  CustomerHistorySummary,
  FinancialHistoryEvent,
  FinancialHistoryMovementFilter,
  FinancialHistoryPeriodFilter,
} from '@/features/customers/domain/customerTypes';
import { formatVehicleLabel } from '@/features/debts/domain/debtUtils';
import { useDatabase } from '@/hooks/useDatabase';
import { getCivilDate } from '@/utils/date';
import { getRouteId } from '@/utils/routes';

const PAGE_SIZE = 40;

const MOVEMENT_FILTERS: readonly {
  value: FinancialHistoryMovementFilter;
  label: string;
}[] = [
  { value: 'all', label: 'Todas' },
  { value: 'debts', label: 'Fiados' },
  { value: 'payments', label: 'Pagamentos' },
  { value: 'reversals', label: 'Estornos' },
  { value: 'updates', label: 'Alterações' },
  { value: 'cancellations', label: 'Cancelamentos' },
];

const PERIOD_FILTERS: readonly { value: FinancialHistoryPeriodFilter; label: string }[] = [
  { value: 'all', label: 'Todo o período' },
  { value: 'last_30_days', label: 'Últimos 30 dias' },
  { value: 'last_90_days', label: 'Últimos 90 dias' },
];

export function CustomerHistoryScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const customerId = getRouteId(id);
  if (!customerId) {
    return (
      <RouteState
        description="Não foi possível identificar o cliente."
        kind="invalid"
        title="Parâmetro inválido"
      />
    );
  }
  return <CustomerHistoryContent customerId={customerId} />;
}

function CustomerHistoryContent({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { workspace, repositories } = useDatabase();
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [summary, setSummary] = useState<CustomerHistorySummary | null>(null);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [events, setEvents] = useState<FinancialHistoryEvent[]>([]);
  const [movement, setMovement] = useState<FinancialHistoryMovementFilter>('all');
  const [period, setPeriod] = useState<FinancialHistoryPeriodFilter>('all');
  const [vehicleId, setVehicleId] = useState('');
  const [contextStatus, setContextStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>(
    'loading',
  );
  const [eventsStatus, setEventsStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const contextVersion = useRef(0);
  const eventsVersion = useRef(0);
  const offset = useRef(0);
  const loadingMoreRef = useRef(false);
  const rangeRef = useRef<{ startAt?: string; endAt?: string }>({});

  const loadContext = useCallback(async () => {
    const version = ++contextVersion.current;
    setContextStatus((current) => (current === 'ready' ? current : 'loading'));
    try {
      const record = await repositories.customers.findById(workspace.id, customerId);
      if (contextVersion.current !== version) return;
      if (!record) {
        setContextStatus('missing');
        return;
      }
      const [financial, customerVehicles] = await Promise.all([
        repositories.customerHistory.getSummary(
          workspace.id,
          customerId,
          getCivilDate(new Date(), workspace.timezone),
        ),
        repositories.vehicles.listByCustomer(workspace.id, customerId, { status: 'all' }),
      ]);
      if (contextVersion.current !== version) return;
      setCustomer(record);
      setSummary(financial);
      setVehicles(customerVehicles);
      setContextStatus('ready');
    } catch {
      if (contextVersion.current === version) setContextStatus('error');
    }
  }, [
    customerId,
    repositories.customerHistory,
    repositories.customers,
    repositories.vehicles,
    workspace.id,
    workspace.timezone,
  ]);

  const loadEvents = useCallback(
    async (append = false) => {
      if (append && loadingMoreRef.current) return;
      const version = append ? eventsVersion.current : ++eventsVersion.current;
      const nextOffset = append ? offset.current : 0;
      if (append) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        loadingMoreRef.current = false;
        setLoadingMore(false);
        setEventsStatus('loading');
        setEvents([]);
        offset.current = 0;
      }
      try {
        const range = append ? rangeRef.current : getFinancialHistoryPeriod(period);
        if (!append) rangeRef.current = range;
        const rows = await repositories.customerHistory.listEvents(workspace.id, customerId, {
          movement,
          vehicleId: vehicleId || undefined,
          ...range,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        if (eventsVersion.current !== version) return;
        setEvents((current) => (append ? [...current, ...rows] : rows));
        offset.current = nextOffset + rows.length;
        setHasMore(rows.length === PAGE_SIZE);
        setEventsStatus('ready');
      } catch {
        if (eventsVersion.current === version) setEventsStatus('error');
      } finally {
        if (eventsVersion.current === version) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    },
    [customerId, movement, period, repositories.customerHistory, vehicleId, workspace.id],
  );

  useFocusEffect(
    useCallback(() => {
      void loadContext();
      return () => {
        contextVersion.current += 1;
      };
    }, [loadContext]),
  );

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
      return () => {
        eventsVersion.current += 1;
      };
    }, [loadEvents]),
  );

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((vehicle) => ({
        id: vehicle.id,
        label:
          formatVehicleLabel({
            brand: vehicle.brand,
            model: vehicle.model,
            plate: vehicle.plate,
          }) ?? `${vehicle.brand} ${vehicle.model}`,
      })),
    [vehicles],
  );

  if (contextStatus === 'loading') {
    return (
      <Screen>
        <LoadingState fullScreen label="Consolidando histórico…" />
      </Screen>
    );
  }
  if (contextStatus === 'missing') {
    return (
      <RouteState
        description="Este cliente não existe ou pertence a outro workspace."
        headerTitle="Histórico"
        kind="notFound"
        title="Cliente não encontrado"
      />
    );
  }
  if (contextStatus === 'error' || !customer || !summary) {
    return (
      <Screen contentContainerStyle={styles.page}>
        <PageHeader fallbackRoute="/debts" title="Histórico financeiro" />
        <EmptyState
          action={{ label: 'Tentar novamente', onPress: () => void loadContext() }}
          description="Não foi possível consultar os dados financeiros locais."
          icon={History}
          title="Não foi possível carregar o histórico."
        />
      </Screen>
    );
  }

  const openEvent = (event: FinancialHistoryEvent) => {
    if (event.paymentId) {
      router.push({ pathname: '/payments/[id]', params: { id: event.paymentId } });
      return;
    }
    router.push({ pathname: '/debts/[id]', params: { id: event.debtId } });
  };

  return (
    <Screen contentContainerStyle={styles.page} safeAreaEdges={['top', 'left', 'right']}>
      <PageHeader fallbackRoute="/debts" title="Histórico financeiro" />
      <View style={styles.listArea}>
        <FlatList
          contentContainerStyle={styles.list}
          data={events}
          keyExtractor={(event) => event.id}
          ListEmptyComponent={
            eventsStatus === 'loading' ? (
              <LoadingState label="Carregando movimentações…" />
            ) : eventsStatus === 'error' ? (
              <EmptyState
                action={{ label: 'Tentar novamente', onPress: () => void loadEvents() }}
                description="Os filtros foram preservados. Tente consultar novamente."
                icon={History}
                title="Não foi possível carregar as movimentações."
              />
            ) : (
              <EmptyState
                action={{
                  label: 'Limpar filtros',
                  onPress: () => {
                    setMovement('all');
                    setPeriod('all');
                    setVehicleId('');
                  },
                }}
                description="Nenhum evento registrado corresponde aos filtros selecionados."
                icon={History}
                title="Nenhuma movimentação encontrada"
              />
            )
          }
          ListFooterComponent={
            loadingMore ? <LoadingState label="Carregando mais movimentações…" /> : undefined
          }
          ListHeaderComponent={
            <View style={styles.headerContent}>
              <Card variant="outlined">
                <View style={styles.customerCard}>
                  <Avatar name={customer.name} size="lg" />
                  <View style={styles.customerCopy}>
                    <AppText variant="h3">{customer.name}</AppText>
                    <Badge
                      label={customer.archivedAt ? 'Cliente arquivado' : 'Cliente ativo'}
                      variant={customer.archivedAt ? 'warning' : 'success'}
                    />
                  </View>
                </View>
              </Card>

              <View style={styles.section}>
                <SectionHeader
                  description="Situação atual, independente dos filtros abaixo."
                  title="Resumo financeiro"
                />
                <CustomerFinancialSummary summary={summary} timezone={workspace.timezone} />
              </View>

              <View style={styles.section}>
                <SectionHeader title="Filtros" />
                <AppText variant="label">Período</AppText>
                <ScrollView
                  contentContainerStyle={styles.filters}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {PERIOD_FILTERS.map((option) => (
                    <Button
                      key={option.value}
                      label={option.label}
                      onPress={() => setPeriod(option.value)}
                      size="sm"
                      variant={period === option.value ? 'secondary' : 'outline'}
                    />
                  ))}
                </ScrollView>
                <AppText variant="label">Tipo de movimentação</AppText>
                <ScrollView
                  contentContainerStyle={styles.filters}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {MOVEMENT_FILTERS.map((option) => (
                    <Button
                      key={option.value}
                      label={option.label}
                      onPress={() => setMovement(option.value)}
                      size="sm"
                      variant={movement === option.value ? 'secondary' : 'outline'}
                    />
                  ))}
                </ScrollView>
                <AppText variant="label">Veículo</AppText>
                <ScrollView
                  contentContainerStyle={styles.filters}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  <Button
                    label="Todos"
                    onPress={() => setVehicleId('')}
                    size="sm"
                    variant={!vehicleId ? 'secondary' : 'outline'}
                  />
                  {vehicleOptions.map((vehicle) => (
                    <Button
                      key={vehicle.id}
                      label={vehicle.label}
                      onPress={() => setVehicleId(vehicle.id)}
                      size="sm"
                      variant={vehicleId === vehicle.id ? 'secondary' : 'outline'}
                    />
                  ))}
                </ScrollView>
              </View>

              <SectionHeader
                description={`${events.length} ${events.length === 1 ? 'movimentação carregada' : 'movimentações carregadas'}`}
                title="Linha do tempo"
              />
            </View>
          }
          onEndReached={() => {
            if (eventsStatus === 'ready' && hasMore && !loadingMore) void loadEvents(true);
          }}
          onEndReachedThreshold={0.35}
          renderItem={({ item }) => (
            <FinancialTimelineItem
              event={item}
              onPress={() => openEvent(item)}
              onReceiptPress={
                item.type === 'payment_registered' && item.paymentId
                  ? () =>
                      router.push({
                        pathname: '/payments/[id]/receipt',
                        params: { id: item.paymentId as string },
                      })
                  : undefined
              }
              timezone={workspace.timezone}
            />
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 12, paddingBottom: 0 },
  listArea: { flex: 1, minHeight: 200 },
  list: { gap: 10, paddingBottom: 32 },
  headerContent: { gap: 20, paddingBottom: 6 },
  customerCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  customerCopy: { flex: 1, alignItems: 'flex-start', gap: 5 },
  section: { gap: 10 },
  filters: { gap: 8 },
});
