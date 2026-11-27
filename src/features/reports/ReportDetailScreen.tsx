import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  BanknoteArrowDown,
  ClockAlert,
  Download,
  Filter,
  ReceiptText,
  WalletCards,
} from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { StatCard } from '@/components/cards';
import { PageHeader, SectionHeader } from '@/components/navigation';
import {
  Alert,
  AppText,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  LoadingState,
  Screen,
  useToast,
} from '@/components/ui';
import {
  PAYMENT_METHOD_LABELS,
  formatPaymentInstant,
} from '@/features/payments/domain/paymentUtils';
import { ReportFiltersPanel } from '@/features/reports/components/ReportFiltersPanel';
import {
  reportFiltersFromParams,
  resolveReportDateRange,
} from '@/features/reports/domain/reportPeriods';
import { DEFAULT_REPORT_FILTERS } from '@/features/reports/domain/reportTypes';
import type {
  FinancialReportSnapshot,
  ReportFilterOption,
  ReportFilters,
  ReportKind,
} from '@/features/reports/domain/reportTypes';
import { useDatabase } from '@/hooks/useDatabase';
import { formatBRLCents } from '@/utils/currency';
import { formatCivilDate } from '@/utils/date';

const DISPLAY_LIMIT = 100;

const COPY: Record<Exclude<ReportKind, 'summary'>, { title: string; description: string }> = {
  receivables: {
    title: 'Valores a receber',
    description: 'Saldos atuais de fiados não cancelados',
  },
  received: {
    title: 'Recebimentos',
    description: 'Pagamentos e estornos nas datas efetivas',
  },
  overdue: {
    title: 'Fiados atrasados',
    description: 'Vencimento anterior a hoje e saldo atual positivo',
  },
};

export function ReportDetailScreen({ kind }: { kind: Exclude<ReportKind, 'summary'> }) {
  const params = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const router = useRouter();
  const { workspace, repositories, services } = useDatabase();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<ReportFilters>(() => reportFiltersFromParams(params));
  const [draftFilters, setDraftFilters] = useState<ReportFilters>(() =>
    reportFiltersFromParams(params),
  );
  const [options, setOptions] = useState<ReportFilterOption[]>([]);
  const [snapshot, setSnapshot] = useState<FinancialReportSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showFilters, setShowFilters] = useState(false);
  const [confirmExport, setConfirmExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setStatus('loading');
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
    }
  }, [filters, repositories.reports, workspace.id, workspace.timezone]);

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
      await services.reportExport.exportAndShare(kind, snapshot, workspace.timezone);
      setConfirmExport(false);
    } catch {
      showToast({ title: 'Não foi possível compartilhar o relatório.', variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState fullScreen label="Carregando relatório…" />
      </Screen>
    );
  }
  if (status === 'error' || !snapshot) {
    return (
      <Screen contentContainerStyle={styles.page}>
        <PageHeader fallbackRoute="/reports" title={COPY[kind].title} />
        <EmptyState
          action={{ label: 'Tentar novamente', onPress: () => void load() }}
          description="Os registros locais não foram alterados."
          icon={ReceiptText}
          title="Não foi possível carregar o relatório"
        />
      </Screen>
    );
  }

  const items =
    kind === 'received'
      ? snapshot.movements
      : kind === 'overdue'
        ? snapshot.overdueDebts
        : snapshot.receivables;
  const visibleItems = items.slice(0, DISPLAY_LIMIT);
  const summaryValue =
    kind === 'received'
      ? snapshot.summary.netReceivedCents
      : kind === 'overdue'
        ? snapshot.summary.currentOverdueCents
        : snapshot.summary.currentReceivableCents;
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
    <Screen contentContainerStyle={styles.page} keyboardAware scroll>
      <PageHeader fallbackRoute="/reports" title={COPY[kind].title} />
      <AppText color="textSecondary">{COPY[kind].description}</AppText>
      <View style={styles.toolbar}>
        <Button
          icon={Filter}
          label={showFilters ? 'Ocultar filtros' : 'Filtros'}
          onPress={() => setShowFilters((value) => !value)}
          size="sm"
          variant={showFilters ? 'secondary' : 'outline'}
        />
        <Button
          disabled={!items.length}
          icon={Download}
          label="Exportar CSV"
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
        description={
          kind === 'received'
            ? `Movimentações efetivadas de ${snapshot.range.label}. Filtros adicionais: ${additionalFilters || 'nenhum'}. Estes valores não representam faturamento total ou lucro.`
            : `Posição atual em ${formatCivilDate(snapshot.currentCivilDate)}. Filtros adicionais: ${additionalFilters || 'nenhum'}. O período selecionado não reconstrói saldos históricos.`
        }
        title="Referência do relatório"
        variant="info"
      />
      <StatCard
        description={`${items.length} ${items.length === 1 ? 'registro' : 'registros'}`}
        icon={
          kind === 'received' ? BanknoteArrowDown : kind === 'overdue' ? ClockAlert : WalletCards
        }
        label={kind === 'received' ? 'Recebimento líquido' : 'Saldo atual'}
        value={formatBRLCents(summaryValue)}
        variant={kind === 'overdue' ? 'destructive' : kind === 'received' ? 'success' : 'default'}
      />
      {items.length > DISPLAY_LIMIT ? (
        <Alert
          description={`A tela mostra os primeiros ${DISPLAY_LIMIT} de ${items.length} registros. O CSV inclui todos os resultados filtrados.`}
          title="Visualização limitada"
          variant="warning"
        />
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Registros" />
        {visibleItems.length ? (
          kind === 'received' ? (
            snapshot.movements.slice(0, DISPLAY_LIMIT).map((item) => (
              <Card
                accessibilityLabel={`Abrir ${item.type === 'payment' ? 'pagamento' : 'estorno'} de ${item.customerName}`}
                key={item.id}
                onPress={() =>
                  router.push({ pathname: '/payments/[id]', params: { id: item.paymentId } })
                }
                variant="outlined"
              >
                <View style={styles.recordRow}>
                  <View style={styles.recordCopy}>
                    <View style={styles.inline}>
                      <AppText weight="semibold">{item.customerName}</AppText>
                      <Badge
                        label={item.type === 'payment' ? 'Pagamento' : 'Estorno'}
                        variant={item.type === 'payment' ? 'success' : 'destructive'}
                      />
                    </View>
                    <AppText color="textSecondary" variant="bodySmall">
                      {item.debtDescription}
                    </AppText>
                    <AppText color="textMuted" variant="caption">
                      {PAYMENT_METHOD_LABELS[item.paymentMethod]} ·{' '}
                      {formatPaymentInstant(item.occurredAt, workspace.timezone)}
                    </AppText>
                  </View>
                  <AppText
                    color={item.type === 'payment' ? 'success' : 'destructive'}
                    weight="bold"
                  >
                    {item.type === 'payment' ? '+' : '−'} {formatBRLCents(item.amountCents)}
                  </AppText>
                </View>
              </Card>
            ))
          ) : (
            (kind === 'overdue' ? snapshot.overdueDebts : snapshot.receivables)
              .slice(0, DISPLAY_LIMIT)
              .map((item) => (
                <Card
                  accessibilityLabel={`Abrir fiado de ${item.customerName}`}
                  key={item.debtId}
                  onPress={() =>
                    router.push({ pathname: '/debts/[id]', params: { id: item.debtId } })
                  }
                  variant="outlined"
                >
                  <View style={styles.recordRow}>
                    <View style={styles.recordCopy}>
                      <AppText weight="semibold">{item.customerName}</AppText>
                      <AppText color="textSecondary" variant="bodySmall">
                        {item.description}
                      </AppText>
                      <AppText color="textMuted" variant="caption">
                        {item.dueDate
                          ? `Vencimento ${formatCivilDate(item.dueDate)}`
                          : 'Sem vencimento'}{' '}
                        · Pago {formatBRLCents(item.paidCents)}
                      </AppText>
                    </View>
                    <AppText
                      color={kind === 'overdue' ? 'destructive' : 'foreground'}
                      weight="bold"
                    >
                      {formatBRLCents(item.pendingCents)}
                    </AppText>
                  </View>
                </Card>
              ))
          )
        ) : (
          <EmptyState
            description="Ajuste ou limpe os filtros para consultar outros registros."
            icon={
              kind === 'received'
                ? BanknoteArrowDown
                : kind === 'overdue'
                  ? ClockAlert
                  : WalletCards
            }
            title="Nenhum registro encontrado"
          />
        )}
      </View>
      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Gerar e compartilhar"
        description="O CSV contém informações financeiras correspondentes aos filtros ativos. Compartilhe somente com pessoas autorizadas."
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
  page: { gap: 20, paddingBottom: 36 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  section: { gap: 10 },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recordCopy: { flex: 1, gap: 3 },
  inline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
});
