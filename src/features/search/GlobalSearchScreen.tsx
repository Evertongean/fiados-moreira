import { useFocusEffect, useRouter } from 'expo-router';
import { Car, CircleDollarSign, Search, Users, Wallet } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SectionHeader } from '@/components/navigation';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  Header,
  LoadingState,
  Screen,
  SearchInput,
} from '@/components/ui';
import { GlobalSearchFiltersPanel } from '@/features/search/components/GlobalSearchFiltersPanel';
import {
  countActiveSearchFilters,
  DEFAULT_GLOBAL_SEARCH_FILTERS,
  type GlobalSearchFilterOptions,
  type GlobalSearchFilters,
  type GlobalSearchResults,
} from '@/features/search/domain/searchTypes';
import {
  PAYMENT_METHOD_LABELS,
  formatPaymentInstant,
} from '@/features/payments/domain/paymentUtils';
import { VEHICLE_TYPE_LABELS } from '@/features/vehicles/domain/vehicleUtils';
import { useDatabase } from '@/hooks/useDatabase';
import { useTheme } from '@/hooks/useTheme';
import { formatBRLCents } from '@/utils/currency';
import { formatCivilDate } from '@/utils/date';
import { formatBrazilianPhone } from '@/utils/phone';
import { formatBrazilianPlate } from '@/utils/plate';

const EMPTY_RESULTS: GlobalSearchResults = {
  customers: [],
  vehicles: [],
  debts: [],
  payments: [],
  total: 0,
  limited: false,
};
const EMPTY_OPTIONS: GlobalSearchFilterOptions = { customers: [], vehicles: [] };

export function GlobalSearchScreen() {
  const router = useRouter();
  const { workspace, repositories } = useDatabase();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<GlobalSearchFilters>(DEFAULT_GLOBAL_SEARCH_FILTERS);
  const [options, setOptions] = useState<GlobalSearchFilterOptions>(EMPTY_OPTIONS);
  const [results, setResults] = useState<GlobalSearchResults>(EMPTY_RESULTS);
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const requestVersion = useRef(0);
  const activeFilters = countActiveSearchFilters(filters);
  const shouldSearch = debouncedQuery.trim().length > 0 || activeFilters > 0;

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const loadOptions = useCallback(async () => {
    try {
      setOptions(await repositories.globalSearch.listFilterOptions(workspace.id));
    } catch {
      setOptions(EMPTY_OPTIONS);
    }
  }, [repositories.globalSearch, workspace.id]);

  const search = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!shouldSearch) {
      setResults(EMPTY_RESULTS);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    try {
      const next = await repositories.globalSearch.search(
        workspace.id,
        debouncedQuery,
        filters,
        workspace.timezone,
      );
      if (version !== requestVersion.current) return;
      setResults(next);
      setStatus('ready');
    } catch {
      if (version === requestVersion.current) setStatus('error');
    }
  }, [
    debouncedQuery,
    filters,
    repositories.globalSearch,
    shouldSearch,
    workspace.id,
    workspace.timezone,
  ]);

  useFocusEffect(
    useCallback(() => {
      void loadOptions();
      void search();
      return () => {
        requestVersion.current += 1;
      };
    }, [loadOptions, search]),
  );

  useEffect(() => {
    const timeout = setTimeout(() => void search(), 0);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <Screen
      contentContainerStyle={styles.page}
      keyboardAware
      safeAreaEdges={['top', 'left', 'right']}
      scroll
    >
      <Header
        onBack={() => router.back()}
        subtitle="Clientes, veículos, fiados e pagamentos"
        title="Pesquisa global"
      />
      <SearchInput
        autoFocus
        onChangeText={setQuery}
        placeholder="Pesquise nome, telefone, placa ou serviço..."
        value={query}
      />
      <View style={styles.toolbar}>
        <Button
          label={activeFilters ? `Filtros (${activeFilters})` : 'Filtros'}
          onPress={() => setShowFilters((value) => !value)}
          size="sm"
          variant={showFilters || activeFilters ? 'secondary' : 'outline'}
        />
        {activeFilters ? (
          <Button
            label="Limpar todos"
            onPress={() => setFilters(DEFAULT_GLOBAL_SEARCH_FILTERS)}
            size="sm"
            variant="ghost"
          />
        ) : null}
      </View>
      {showFilters ? (
        <GlobalSearchFiltersPanel
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(DEFAULT_GLOBAL_SEARCH_FILTERS)}
          options={options}
        />
      ) : null}

      {status === 'loading' ? (
        <LoadingState label="Pesquisando nos dados locais…" />
      ) : status === 'error' ? (
        <EmptyState
          action={{ label: 'Tentar novamente', onPress: () => void search() }}
          description="Nenhuma informação foi enviada para serviços externos. Tente consultar novamente."
          icon={Search}
          title="Não foi possível pesquisar."
        />
      ) : status === 'idle' ? (
        <EmptyState
          description="Digite um termo ou aplique filtros para consultar os dados armazenados neste aparelho."
          icon={Search}
          title="O que você procura?"
        />
      ) : results.total === 0 ? (
        <EmptyState
          action={
            activeFilters
              ? {
                  label: 'Limpar filtros',
                  onPress: () => setFilters(DEFAULT_GLOBAL_SEARCH_FILTERS),
                }
              : query
                ? { label: 'Limpar pesquisa', onPress: () => setQuery('') }
                : undefined
          }
          description="Tente outro termo ou remova parte dos filtros ativos."
          icon={Search}
          title="Nenhum resultado encontrado."
        />
      ) : (
        <View style={styles.results}>
          <View style={styles.resultSummary}>
            <AppText variant="h4">
              {results.total} {results.total === 1 ? 'resultado' : 'resultados'}
            </AppText>
            {results.limited ? <Badge label="20 por categoria" variant="info" /> : null}
          </View>

          <ResultSection count={results.customers.length} icon={Users} title="Clientes">
            {results.customers.map((item) => (
              <ResultCard
                key={item.id}
                badge={item.archivedAt ? 'Arquivado' : item.overdueCents ? 'Em atraso' : undefined}
                detail={
                  item.outstandingCents > 0
                    ? `Saldo ${formatBRLCents(item.outstandingCents)}`
                    : (formatBrazilianPhone(item.phone) ??
                      formatBrazilianPhone(item.whatsapp) ??
                      'Sem telefone')
                }
                onPress={() =>
                  router.push({ pathname: '/customers/[id]', params: { id: item.id } })
                }
                title={item.name}
              />
            ))}
          </ResultSection>

          <ResultSection count={results.vehicles.length} icon={Car} title="Veículos">
            {results.vehicles.map((item) => (
              <ResultCard
                key={item.id}
                badge={item.archivedAt ? 'Arquivado' : VEHICLE_TYPE_LABELS[item.type]}
                detail={`${item.customerName}${item.plate ? ` · ${formatBrazilianPlate(item.plate)}` : ''}`}
                onPress={() => router.push({ pathname: '/vehicles/[id]', params: { id: item.id } })}
                title={`${item.brand} ${item.model}`}
              />
            ))}
          </ResultSection>

          <ResultSection count={results.debts.length} icon={Wallet} title="Fiados">
            {results.debts.map((item) => (
              <ResultCard
                key={item.id}
                badge={
                  item.isOverdue
                    ? 'Atrasado'
                    : item.financialStatus === 'paid'
                      ? 'Quitado'
                      : undefined
                }
                detail={`${item.customerName} · ${formatBRLCents(item.pendingCents)}${item.dueDate ? ` · vence ${formatCivilDate(item.dueDate)}` : ''}`}
                onPress={() => router.push({ pathname: '/debts/[id]', params: { id: item.id } })}
                title={item.description}
              />
            ))}
          </ResultSection>

          <ResultSection count={results.payments.length} icon={CircleDollarSign} title="Pagamentos">
            {results.payments.map((item) => (
              <ResultCard
                key={item.id}
                badge={item.isReversed ? 'Estornado' : PAYMENT_METHOD_LABELS[item.paymentMethod]}
                detail={`${item.customerName} · ${formatBRLCents(item.amountCents)} · ${formatPaymentInstant(item.paidAt, workspace.timezone)}`}
                onPress={() => router.push({ pathname: '/payments/[id]', params: { id: item.id } })}
                title={item.debtDescription}
              />
            ))}
          </ResultSection>
        </View>
      )}
    </Screen>
  );
}

function ResultSection({
  title,
  count,
  icon: Icon,
  children,
}: {
  title: string;
  count: number;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  const { tokens } = useTheme();
  if (!count) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        <Icon color={tokens.colors.foreground} size={20} />
        <SectionHeader title={`${title} (${count})`} />
      </View>
      <View style={styles.cards}>{children}</View>
    </View>
  );
}

function ResultCard({
  title,
  detail,
  badge,
  onPress,
}: {
  title: string;
  detail: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Card accessibilityLabel={`Abrir ${title}`} onPress={onPress} variant="outlined">
      <View style={styles.cardContent}>
        <View style={styles.cardCopy}>
          <AppText variant="body" weight="semibold">
            {title}
          </AppText>
          <AppText color="textSecondary" variant="bodySmall">
            {detail}
          </AppText>
        </View>
        {badge ? <Badge label={badge} variant="outline" /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  page: { gap: 16, paddingBottom: 40 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  results: { gap: 24 },
  resultSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  section: { gap: 10 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cards: { gap: 8 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardCopy: { flex: 1, gap: 3 },
});
