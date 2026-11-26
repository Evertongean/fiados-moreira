import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, Wallet } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader, FloatingActionButton } from '@/components/navigation';
import {
  Alert,
  AppText,
  Button,
  EmptyState,
  LoadingState,
  Screen,
  SearchInput,
} from '@/components/ui';
import { DebtListItem } from '@/features/debts/components/DebtListItem';
import {
  countDebtAdvancedFilters,
  DebtAdvancedFiltersPanel,
  DEFAULT_DEBT_ADVANCED_FILTERS,
  type DebtAdvancedFilters,
} from '@/features/debts/components/DebtAdvancedFiltersPanel';
import type { DebtListFilter, DebtOverview } from '@/features/debts/domain/debtTypes';
import type { GlobalSearchFilterOptions } from '@/features/search/domain/searchTypes';
import { useDatabase } from '@/hooks/useDatabase';

const FILTERS: readonly { value: DebtListFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Em aberto' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'partially_paid', label: 'Parcialmente pagos' },
  { value: 'due_today', label: 'Vencem hoje' },
  { value: 'overdue', label: 'Atrasados' },
  { value: 'paid', label: 'Quitados' },
  { value: 'canceled', label: 'Cancelados' },
];

const EMPTY_FILTER_LABELS: Record<Exclude<DebtListFilter, 'all'>, string> = {
  open: 'em aberto',
  pending: 'pendente',
  partially_paid: 'parcialmente pago',
  due_today: 'com vencimento hoje',
  overdue: 'atrasado',
  paid: 'quitado',
  canceled: 'cancelado',
};

export function DebtsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string | string[]; mode?: string | string[] }>();
  const initialFilter = getInitialFilter(params.filter);
  const paymentSelection = getSingleParam(params.mode) === 'payment';
  const routeFilter =
    paymentSelection && ['all', 'paid', 'canceled'].includes(initialFilter)
      ? 'open'
      : initialFilter;
  const routeFilterKey = `${paymentSelection ? 'payment' : 'default'}:${routeFilter}`;
  const availableFilters = paymentSelection
    ? FILTERS.filter(({ value }) => !['all', 'paid', 'canceled'].includes(value))
    : FILTERS;
  const { workspace, repositories } = useDatabase();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterSelection, setFilterSelection] = useState<{
    routeKey: string;
    value: DebtListFilter;
  } | null>(null);
  const filter = filterSelection?.routeKey === routeFilterKey ? filterSelection.value : routeFilter;
  const setFilter = (value: DebtListFilter) =>
    setFilterSelection({ routeKey: routeFilterKey, value });
  const [debts, setDebts] = useState<DebtOverview[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<DebtAdvancedFilters>(
    DEFAULT_DEBT_ADVANCED_FILTERS,
  );
  const [filterOptions, setFilterOptions] = useState<GlobalSearchFilterOptions>({
    customers: [],
    vehicles: [],
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const requestVersion = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setStatus((current) => (current === 'ready' ? current : 'loading'));
    try {
      const rows = await repositories.debts.listOverview(workspace.id, {
        query: debouncedSearch,
        filter,
        timezone: workspace.timezone,
        ...advancedFilters,
      });
      if (requestVersion.current !== version) return;
      setDebts(rows);
      setStatus('ready');
    } catch {
      if (requestVersion.current === version) setStatus('error');
    }
  }, [
    advancedFilters,
    debouncedSearch,
    filter,
    repositories.debts,
    workspace.id,
    workspace.timezone,
  ]);

  useFocusEffect(
    useCallback(() => {
      void repositories.globalSearch
        .listFilterOptions(workspace.id)
        .then(setFilterOptions, () => setFilterOptions({ customers: [], vehicles: [] }));
      void load();
      return () => {
        requestVersion.current += 1;
      };
    }, [load, repositories.globalSearch, workspace.id]),
  );

  const activeAdvancedFilters = countDebtAdvancedFilters(advancedFilters);

  const emptyTitle = search.trim()
    ? 'Nenhum fiado encontrado.'
    : filter === 'all'
      ? 'Nenhum fiado cadastrado.'
      : `Nenhum fiado ${EMPTY_FILTER_LABELS[filter]}.`;

  return (
    <Screen contentContainerStyle={styles.page} safeAreaEdges={['top', 'left', 'right']}>
      <AppHeader subtitle="Acompanhe dívidas e pagamentos da oficina." title="Fiados" />
      {paymentSelection ? (
        <Alert
          description="Toque em um fiado com saldo para abrir o registro de pagamento."
          title="Selecione o fiado"
          variant="info"
        />
      ) : null}
      <View style={styles.summary}>
        <View style={styles.summaryCopy}>
          <AppText variant="h4">{debts.length}</AppText>
          <AppText color="textSecondary" variant="bodySmall">
            {debts.length === 1 ? 'fiado exibido' : 'fiados exibidos'}
          </AppText>
        </View>
        <Button
          icon={Plus}
          label="Novo fiado"
          onPress={() => router.push('/debts/new')}
          size="sm"
        />
      </View>
      <SearchInput
        onChangeText={setSearch}
        placeholder="Buscar cliente, descrição ou placa..."
        value={search}
      />
      <ScrollView
        contentContainerStyle={styles.filters}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {availableFilters.map((option) => (
          <Button
            key={option.value}
            label={option.label}
            onPress={() => setFilter(option.value)}
            size="sm"
            variant={filter === option.value ? 'secondary' : 'outline'}
          />
        ))}
      </ScrollView>
      <View style={styles.advancedActions}>
        <Button
          label={
            activeAdvancedFilters
              ? `Filtros avançados (${activeAdvancedFilters})`
              : 'Filtros avançados'
          }
          onPress={() => setShowAdvancedFilters((value) => !value)}
          size="sm"
          variant={showAdvancedFilters || activeAdvancedFilters ? 'secondary' : 'outline'}
        />
        {activeAdvancedFilters ? (
          <Button
            label="Limpar"
            onPress={() => setAdvancedFilters(DEFAULT_DEBT_ADVANCED_FILTERS)}
            size="sm"
            variant="ghost"
          />
        ) : null}
      </View>
      <DebtAdvancedFiltersPanel
        filters={advancedFilters}
        onChange={setAdvancedFilters}
        onClear={() => setAdvancedFilters(DEFAULT_DEBT_ADVANCED_FILTERS)}
        onClose={() => setShowAdvancedFilters(false)}
        options={filterOptions}
        visible={showAdvancedFilters}
      />
      <View style={styles.listArea}>
        {status === 'loading' ? (
          <LoadingState fullScreen label="Carregando fiados…" />
        ) : status === 'error' ? (
          <EmptyState
            action={{ label: 'Tentar novamente', onPress: () => void load() }}
            description="Verifique os dados locais e tente novamente."
            icon={Wallet}
            title="Não foi possível carregar os fiados."
          />
        ) : (
          <FlatList
            contentContainerStyle={debts.length ? styles.list : styles.emptyList}
            data={debts}
            keyExtractor={(debt) => debt.id}
            ListEmptyComponent={
              <EmptyState
                action={
                  search.trim()
                    ? { label: 'Limpar pesquisa', onPress: () => setSearch('') }
                    : filter !== 'all'
                      ? { label: 'Mostrar todos', onPress: () => setFilter('all') }
                      : { label: 'Registrar fiado', onPress: () => router.push('/debts/new') }
                }
                description={
                  search.trim()
                    ? 'Tente pesquisar outro cliente, serviço ou placa.'
                    : filter === 'all'
                      ? 'Cadastre o primeiro fiado para acompanhar o saldo da oficina.'
                      : 'Altere o filtro para consultar outras situações.'
                }
                icon={Wallet}
                title={emptyTitle}
              />
            }
            renderItem={({ item }) => (
              <DebtListItem
                debt={item}
                onPress={() =>
                  router.push({
                    pathname: paymentSelection ? '/debts/[id]/payment' : '/debts/[id]',
                    params: { id: item.id },
                  })
                }
              />
            )}
          />
        )}
      </View>
      <FloatingActionButton
        accessibilityLabel="Registrar novo fiado"
        onPress={() => router.push('/debts/new')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 16, paddingBottom: 88 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryCopy: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  filters: { gap: 8 },
  advancedActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listArea: { flex: 1, minHeight: 180 },
  list: { gap: 10, paddingBottom: 16 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
});

const DEBT_FILTERS = new Set<DebtListFilter>(FILTERS.map(({ value }) => value));

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getInitialFilter(value: string | string[] | undefined): DebtListFilter {
  const filter = getSingleParam(value) as DebtListFilter | undefined;
  return filter && DEBT_FILTERS.has(filter) ? filter : 'all';
}
