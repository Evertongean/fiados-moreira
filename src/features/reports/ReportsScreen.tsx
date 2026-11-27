import { useFocusEffect, useRouter } from 'expo-router';
import {
  BanknoteArrowDown,
  ChartColumn,
  ClockAlert,
  Download,
  Filter,
  ReceiptText,
  RotateCcw,
  Users,
  WalletCards,
} from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { StatCard } from '@/components/cards';
import { AppHeader, SectionHeader } from '@/components/navigation';
import {
  Alert,
  AppText,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  LoadingState,
  Screen,
  useToast,
} from '@/components/ui';
import { PaymentMethodDistribution } from '@/features/reports/components/PaymentMethodDistribution';
import { PAYMENT_METHOD_LABELS } from '@/features/payments/domain/paymentUtils';
import { ReportFiltersPanel } from '@/features/reports/components/ReportFiltersPanel';
import { ReportReceiptsChart } from '@/features/reports/components/ReportReceiptsChart';
import {
  reportFiltersToParams,
  resolveReportDateRange,
} from '@/features/reports/domain/reportPeriods';
import { DEFAULT_REPORT_FILTERS } from '@/features/reports/domain/reportTypes';
import type {
  FinancialReportSnapshot,
  ReportFilterOption,
  ReportFilters,
} from '@/features/reports/domain/reportTypes';
import { useDatabase } from '@/hooks/useDatabase';
import { useTheme } from '@/hooks/useTheme';
import { formatBRLCents } from '@/utils/currency';

const REPORT_LINKS = [
  {
    title: 'Valores a receber',
    description: 'Saldos atuais não cancelados',
    icon: WalletCards,
    route: '/reports/receivables',
  },
  {
    title: 'Recebimentos',
    description: 'Pagamentos e estornos pela data efetiva',
    icon: BanknoteArrowDown,
    route: '/reports/received',
  },
  {
    title: 'Fiados atrasados',
    description: 'Saldos com vencimento anterior a hoje',
    icon: ClockAlert,
    route: '/reports/overdue',
  },
] as const;

export function ReportsScreen() {
  const router = useRouter();
  const { workspace, repositories, services } = useDatabase();
  const { tokens } = useTheme();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  const [options, setOptions] = useState<ReportFilterOption[]>([]);
  const [snapshot, setSnapshot] = useState<FinancialReportSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmExport, setConfirmExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const requestVersion = useRef(0);

  const load = useCallback(
    async (refresh = false) => {
      const version = ++requestVersion.current;
      if (refresh) setRefreshing(true);
      else setStatus('loading');
      try {
        const [next, customerOptions] = await Promise.all([
          repositories.reports.getSnapshot(workspace.id, workspace.timezone, filters),
          repositories.reports.listFilterOptions(workspace.id),
        ]);
        if (requestVersion.current !== version) return;
        setSnapshot(next);
        setOptions(customerOptions);
        setStatus('ready');
      } catch {
        if (requestVersion.current === version) setStatus('error');
      } finally {
        if (requestVersion.current === version) setRefreshing(false);
      }
    },
    [filters, repositories.reports, workspace.id, workspace.timezone],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestVersion.current += 1;
      };
    }, [load]),
  );

  const applyFilters = () => {
    try {
      resolveReportDateRange(draftFilters, workspace.timezone);
      setFilters({ ...draftFilters });
      setShowFilters(false);
    } catch {
      showToast({ title: 'Informe um período personalizado válido.', variant: 'warning' });
    }
  };
  const clearFilters = () => {
    setDraftFilters(DEFAULT_REPORT_FILTERS);
    setFilters(DEFAULT_REPORT_FILTERS);
  };
  const exportReport = async () => {
    if (!snapshot || exporting) return;
    setExporting(true);
    try {
      await services.reportExport.exportAndShare('summary', snapshot, workspace.timezone);
      setConfirmExport(false);
    } catch {
      showToast({ title: 'Não foi possível compartilhar o relatório.', variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  if (status === 'loading') {
    return (
      <Screen safeAreaEdges={['top', 'left', 'right']}>
        <LoadingState fullScreen label="Consolidando relatórios…" />
      </Screen>
    );
  }
  if (status === 'error' || !snapshot) {
    return (
      <Screen contentContainerStyle={styles.page} safeAreaEdges={['top', 'left', 'right']}>
        <AppHeader subtitle="Indicadores financeiros offline" title="Relatórios" />
        <EmptyState
          action={{ label: 'Tentar novamente', onPress: () => void load() }}
          description="Os dados locais não foram alterados. Tente consultar novamente."
          icon={ChartColumn}
          title="Não foi possível carregar os relatórios"
        />
      </Screen>
    );
  }

  const hasMovements = snapshot.movements.length > 0;
  const routeParams = reportFiltersToParams(filters);
  const selectedCustomer = options.find(({ id }) => id === filters.customerId)?.name;
  const additionalFilters = [
    selectedCustomer ? `Cliente: ${selectedCustomer}` : null,
    filters.paymentMethod !== 'all'
      ? `Método: ${PAYMENT_METHOD_LABELS[filters.paymentMethod]}`
      : null,
    filters.financialStatus === 'pending'
      ? 'Situação: pendentes'
      : filters.financialStatus === 'partially_paid'
        ? 'Situação: parcialmente pagos'
        : null,
  ]
    .filter(Boolean)
    .join(' · ');

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
      <AppHeader subtitle="Indicadores financeiros offline" title="Relatórios" />
      <View style={styles.toolbar}>
        <Button
          icon={Filter}
          label={showFilters ? 'Ocultar filtros' : 'Filtros'}
          onPress={() => setShowFilters((value) => !value)}
          size="sm"
          variant={showFilters ? 'secondary' : 'outline'}
        />
        <Button
          icon={Download}
          label="Exportar relatório"
          onPress={() => setConfirmExport(true)}
          size="sm"
        />
      </View>
      {showFilters ? (
        <ReportFiltersPanel
          filters={draftFilters}
          onApply={applyFilters}
          onChange={setDraftFilters}
          onClear={clearFilters}
          options={options}
        />
      ) : null}
      <Alert
        description={`Movimentações: ${snapshot.range.label}. Filtros adicionais: ${additionalFilters || 'nenhum'}. Os saldos representam a posição atual, não um saldo histórico retroativo. Recebimentos de fiados não equivalem ao faturamento total ou lucro da oficina.`}
        title="Período analisado"
        variant="info"
      />

      <View style={styles.section}>
        <SectionHeader title="Indicadores" />
        <View style={styles.grid}>
          <StatCard
            description={`${snapshot.summary.currentOpenDebtCount} em aberto`}
            icon={WalletCards}
            label="Saldo atual a receber"
            style={styles.gridItem}
            value={formatBRLCents(snapshot.summary.currentReceivableCents)}
          />
          <StatCard
            icon={ClockAlert}
            label="Saldo atual em atraso"
            style={styles.gridItem}
            value={formatBRLCents(snapshot.summary.currentOverdueCents)}
            variant="destructive"
          />
          <StatCard
            description={`Bruto ${formatBRLCents(snapshot.summary.grossReceivedCents)}`}
            icon={BanknoteArrowDown}
            label="Líquido no período"
            style={styles.gridItem}
            value={formatBRLCents(snapshot.summary.netReceivedCents)}
            variant={snapshot.summary.netReceivedCents < 0 ? 'destructive' : 'success'}
          />
          <StatCard
            description={`${snapshot.summary.reversalCount} estorno(s)`}
            icon={RotateCcw}
            label="Estornos no período"
            style={styles.gridItem}
            value={formatBRLCents(snapshot.summary.reversedCents)}
            variant="warning"
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          description="Bruto e estornos são registrados nas datas efetivas de cada evento."
          title="Evolução dos recebimentos"
        />
        {hasMovements ? (
          <ReportReceiptsChart data={snapshot.dailyReceipts} />
        ) : (
          <EmptyState
            description={`Nenhum pagamento ou estorno em ${snapshot.range.label}.`}
            icon={ChartColumn}
            title="Sem movimentações no período"
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recebimentos por método" />
        {snapshot.methodBreakdown.length ? (
          <PaymentMethodDistribution data={snapshot.methodBreakdown} />
        ) : (
          <EmptyState
            description="A distribuição aparecerá quando houver movimentações no período."
            icon={ReceiptText}
            title="Sem métodos para comparar"
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          description="Ordenação pelo saldo devedor atual."
          title="Clientes com maiores saldos"
        />
        {snapshot.customerRanking.length ? (
          snapshot.customerRanking.slice(0, 5).map((item, index) => (
            <Card
              accessibilityLabel={`Abrir cliente ${item.customerName}`}
              key={item.customerId}
              onPress={() =>
                router.push({ pathname: '/customers/[id]', params: { id: item.customerId } })
              }
              variant="outlined"
            >
              <View style={styles.rankingRow}>
                <View style={styles.rankingPosition}>
                  <AppText color="primary" weight="bold">
                    {index + 1}º
                  </AppText>
                </View>
                <View style={styles.rankingCopy}>
                  <AppText weight="semibold">{item.customerName}</AppText>
                  <AppText color="textMuted" variant="caption">
                    {item.openDebtCount} em aberto · {formatBRLCents(item.overdueCents)} em atraso
                  </AppText>
                </View>
                <AppText weight="bold">{formatBRLCents(item.pendingCents)}</AppText>
              </View>
            </Card>
          ))
        ) : (
          <EmptyState
            description="Clientes com saldo pendente aparecerão aqui."
            icon={Users}
            title="Nenhum saldo devedor atual"
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Relatórios detalhados" />
        {REPORT_LINKS.map(({ title, description, icon: Icon, route }) => (
          <Card
            accessibilityLabel={`Abrir relatório ${title}`}
            key={route}
            onPress={() => router.push({ pathname: route, params: routeParams } as never)}
            variant="outlined"
          >
            <SectionHeader
              action={<Icon color={tokens.colors.primary} size={22} />}
              description={description}
              title={title}
            />
          </Card>
        ))}
      </View>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Gerar e compartilhar"
        description="O arquivo contém informações financeiras correspondentes aos filtros ativos. Compartilhe somente com pessoas autorizadas."
        loading={exporting}
        onCancel={() => setConfirmExport(false)}
        onConfirm={() => void exportReport()}
        title="Compartilhar relatório financeiro?"
        visible={confirmExport}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 24, paddingBottom: 36 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  section: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { minWidth: 148, flexGrow: 1, flexBasis: 148 },
  rankingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankingPosition: { width: 32, alignItems: 'center' },
  rankingCopy: { flex: 1, gap: 2 },
});
