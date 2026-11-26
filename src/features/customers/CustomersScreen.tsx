import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDownAZ, UserPlus, Users } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { CustomerListItem } from '@/components/cards';
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
import type {
  CustomerSortOrder,
  CustomerStatusFilter,
  CustomerDebtFilter,
  CustomerListEntry,
} from '@/features/customers/domain/customerTypes';
import { useDatabase } from '@/hooks/useDatabase';
import { useTheme } from '@/hooks/useTheme';
import { formatBrazilianPhone } from '@/utils/phone';

const FILTERS: readonly { value: CustomerStatusFilter; label: string }[] = [
  { value: 'active', label: 'Ativos' },
  { value: 'archived', label: 'Arquivados' },
  { value: 'all', label: 'Todos' },
];

const SORTS: readonly { value: CustomerSortOrder; label: string }[] = [
  { value: 'name_asc', label: 'Nome A–Z' },
  { value: 'name_desc', label: 'Nome Z–A' },
  { value: 'newest', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'balance_desc', label: 'Maior saldo' },
  { value: 'balance_asc', label: 'Menor saldo' },
];

const DEBT_FILTERS: readonly { value: CustomerDebtFilter; label: string }[] = [
  { value: 'all', label: 'Todos os saldos' },
  { value: 'with_debt', label: 'Com dívida' },
  { value: 'without_debt', label: 'Sem dívida' },
  { value: 'overdue', label: 'Com atraso' },
];

export function CustomersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ financial?: string | string[] }>();
  const outstandingOnly = getSingleParam(params.financial) === 'with_debt';
  const routeDebtFilter: CustomerDebtFilter = outstandingOnly ? 'with_debt' : 'all';
  const { tokens } = useTheme();
  const { workspace, repositories } = useDatabase();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<CustomerStatusFilter>('active');
  const [sort, setSort] = useState<CustomerSortOrder>('name_asc');
  const [debtSelection, setDebtSelection] = useState<{
    routeDebtFilter: CustomerDebtFilter;
    value: CustomerDebtFilter;
  } | null>(null);
  const debtFilter =
    debtSelection?.routeDebtFilter === routeDebtFilter ? debtSelection.value : routeDebtFilter;
  const setDebtFilter = (value: CustomerDebtFilter) => setDebtSelection({ routeDebtFilter, value });
  const [customers, setCustomers] = useState<CustomerListEntry[]>([]);
  const [activeCount, setActiveCount] = useState(0);
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
      const [rows, count] = await Promise.all([
        repositories.customers.listAdvanced(
          workspace.id,
          {
            query: debouncedSearch,
            status: filter,
            sort,
            debt: debtFilter,
          },
          workspace.timezone,
        ),
        repositories.customers.countActive(workspace.id),
      ]);
      if (requestVersion.current !== version) return;
      setCustomers(rows);
      setActiveCount(count);
      setStatus('ready');
    } catch {
      if (requestVersion.current === version) setStatus('error');
    }
  }, [
    debouncedSearch,
    debtFilter,
    filter,
    repositories.customers,
    sort,
    workspace.id,
    workspace.timezone,
  ]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestVersion.current += 1;
      };
    }, [load]),
  );

  const emptyTitle = search.trim()
    ? 'Nenhum cliente encontrado.'
    : filter === 'archived'
      ? 'Nenhum cliente arquivado.'
      : 'Nenhum cliente cadastrado.';
  const emptyDescription = search.trim()
    ? 'Tente pesquisar outro nome ou telefone.'
    : filter === 'archived'
      ? 'Os clientes arquivados aparecerão aqui.'
      : 'Cadastre seu primeiro cliente para começar a organizar os fiados da oficina.';

  return (
    <Screen contentContainerStyle={styles.page} safeAreaEdges={['top', 'left', 'right']}>
      <AppHeader subtitle="Gerencie os clientes da sua oficina." title="Clientes" />
      {debtFilter === 'with_debt' ? (
        <Alert
          description="A lista mostra somente clientes com pelo menos um saldo pendente."
          title="Clientes com dívidas"
          variant="info"
        />
      ) : null}
      <View style={styles.summary}>
        <View style={styles.summaryCopy}>
          <AppText variant="h4">{activeCount}</AppText>
          <AppText color="textSecondary" variant="bodySmall">
            {activeCount === 1 ? 'cliente ativo' : 'clientes ativos'}
          </AppText>
        </View>
        <Button
          icon={UserPlus}
          label="Novo cliente"
          onPress={() => router.push('/customers/new')}
          size="sm"
        />
      </View>
      <SearchInput
        onChangeText={setSearch}
        placeholder="Buscar nome ou telefone..."
        value={search}
      />
      <View style={styles.controls}>
        <ScrollView
          contentContainerStyle={styles.controlRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {FILTERS.map((option) => (
            <Button
              key={option.value}
              label={option.label}
              onPress={() => setFilter(option.value)}
              size="sm"
              variant={filter === option.value ? 'secondary' : 'outline'}
            />
          ))}
        </ScrollView>
        <ScrollView
          contentContainerStyle={styles.controlRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {DEBT_FILTERS.map((option) => (
            <Button
              key={option.value}
              label={option.label}
              onPress={() => setDebtFilter(option.value)}
              size="sm"
              variant={debtFilter === option.value ? 'secondary' : 'outline'}
            />
          ))}
        </ScrollView>
        <ScrollView
          contentContainerStyle={styles.controlRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.sortIcon}>
            <ArrowDownAZ color={tokens.colors.textMuted} size={18} />
          </View>
          {SORTS.map((option) => (
            <Button
              key={option.value}
              label={option.label}
              onPress={() => setSort(option.value)}
              size="sm"
              variant={sort === option.value ? 'secondary' : 'ghost'}
            />
          ))}
        </ScrollView>
      </View>
      <View style={styles.listArea}>
        {status === 'loading' ? (
          <LoadingState fullScreen label="Carregando clientes…" />
        ) : status === 'error' ? (
          <EmptyState
            action={{ label: 'Tentar novamente', onPress: () => void load() }}
            description="Verifique os dados locais e tente novamente."
            icon={Users}
            title="Não foi possível carregar os clientes."
          />
        ) : (
          <FlatList
            contentContainerStyle={customers.length ? styles.list : styles.emptyList}
            data={customers}
            keyExtractor={(customer) => customer.id}
            ListEmptyComponent={
              <EmptyState
                action={
                  search.trim()
                    ? { label: 'Limpar pesquisa', onPress: () => setSearch('') }
                    : filter === 'archived'
                      ? undefined
                      : {
                          label: 'Cadastrar cliente',
                          onPress: () => router.push('/customers/new'),
                        }
                }
                description={emptyDescription}
                icon={Users}
                title={emptyTitle}
              />
            }
            renderItem={({ item }) => (
              <CustomerListItem
                archived={Boolean(item.archivedAt)}
                detail={formatBrazilianPhone(item.phone) ?? undefined}
                name={item.name}
                onPress={() =>
                  router.push({ pathname: '/customers/[id]', params: { id: item.id } })
                }
                pendingCents={item.outstandingCents || null}
              />
            )}
          />
        )}
      </View>
      <FloatingActionButton
        accessibilityLabel="Cadastrar novo cliente"
        onPress={() => router.push('/customers/new')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 16, paddingBottom: 88 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryCopy: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  controls: { gap: 8 },
  controlRow: { alignItems: 'center', gap: 8 },
  sortIcon: { width: 32, alignItems: 'center' },
  listArea: { flex: 1, minHeight: 180 },
  list: { gap: 10, paddingBottom: 16 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
});

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
