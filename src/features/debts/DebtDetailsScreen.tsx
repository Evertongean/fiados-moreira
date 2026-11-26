import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Ban,
  CalendarDays,
  Car,
  CircleDollarSign,
  Pencil,
  ReceiptText,
  UserRound,
  WalletCards,
} from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BalanceCard, DebtStatusBadge, PaymentListItem, StatCard } from '@/components/cards';
import { RouteState } from '@/components/layouts/RouteState';
import { PageHeader, SectionHeader } from '@/components/navigation';
import {
  Alert,
  AppText,
  Button,
  Card,
  EmptyState,
  LoadingState,
  Screen,
  TextArea,
  useToast,
} from '@/components/ui';
import type { DebtOverview, DebtPaymentDetails } from '@/features/debts/domain/debtTypes';
import { formatCivilDate, formatVehicleLabel } from '@/features/debts/domain/debtUtils';
import { toDebtBadgeStatus } from '@/features/debts/domain/status';
import {
  formatPaymentInstant,
  PAYMENT_METHOD_LABELS,
} from '@/features/payments/domain/paymentUtils';
import { useDatabase } from '@/hooks/useDatabase';
import { useTheme } from '@/hooks/useTheme';
import { formatBRLCents } from '@/utils/currency';
import { getRouteId } from '@/utils/routes';
import { createUuid } from '@/utils/uuid';

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <AppText color="textMuted" variant="caption">
        {label}
      </AppText>
      <AppText selectable variant="bodySmall">
        {value}
      </AppText>
    </View>
  );
}

export function DebtDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const debtId = getRouteId(id);
  if (!debtId) {
    return (
      <RouteState
        description="O identificador recebido não é válido."
        headerTitle="Fiado"
        kind="invalid"
        title="Fiado inválido"
      />
    );
  }
  return <DebtDetailsContent debtId={debtId} />;
}

function DebtDetailsContent({ debtId }: { debtId: string }) {
  const router = useRouter();
  const { tokens } = useTheme();
  const { showToast } = useToast();
  const { workspace, repositories, services } = useDatabase();
  const [debt, setDebt] = useState<DebtOverview | null>(null);
  const [payments, setPayments] = useState<DebtPaymentDetails[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelOperationId, setCancelOperationId] = useState(createUuid);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setStatus('loading');
    try {
      const record = await repositories.debts.findOverview(
        workspace.id,
        debtId,
        workspace.timezone,
      );
      if (requestVersion.current !== version) return;
      if (!record) {
        setStatus('missing');
        return;
      }
      const history = await repositories.debts.listPayments(workspace.id, debtId);
      if (requestVersion.current !== version) return;
      setDebt(record);
      setPayments(history);
      setStatus('ready');
    } catch {
      if (requestVersion.current === version) setStatus('error');
    }
  }, [debtId, repositories.debts, workspace.id, workspace.timezone]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestVersion.current += 1;
      };
    }, [load]),
  );

  const cancel = async () => {
    if (!cancelReason.trim() || isCanceling) return;
    setIsCanceling(true);
    try {
      await services.debts.cancel(workspace.id, debtId, {
        reason: cancelReason,
        operationId: cancelOperationId,
      });
      showToast({ title: 'Fiado cancelado com sucesso.', variant: 'success' });
      setCancelOpen(false);
      setCancelReason('');
      setCancelOperationId(createUuid());
      await load();
    } catch (error) {
      const hasPayments =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'CONSTRAINT_VIOLATION';
      showToast({
        title: hasPayments
          ? 'Este fiado possui pagamentos válidos e não pode ser cancelado.'
          : 'Não foi possível cancelar o fiado.',
        variant: hasPayments ? 'warning' : 'error',
      });
    } finally {
      setIsCanceling(false);
    }
  };

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState fullScreen label="Carregando fiado…" />
      </Screen>
    );
  }
  if (status === 'missing') {
    return (
      <RouteState
        description="Este fiado não existe ou pertence a outro workspace."
        headerTitle="Fiado"
        kind="notFound"
        title="Fiado não encontrado"
      />
    );
  }
  if (status === 'error' || !debt) {
    return (
      <Screen contentContainerStyle={styles.page}>
        <PageHeader fallbackRoute="/debts" title="Detalhes do fiado" />
        <EmptyState
          action={{ label: 'Tentar novamente', onPress: () => void load() }}
          description="Não foi possível consultar os dados locais."
          icon={ReceiptText}
          title="Não foi possível carregar o fiado."
        />
      </Screen>
    );
  }

  const vehicleLabel = formatVehicleLabel({
    brand: debt.vehicleBrand,
    model: debt.vehicleModel,
    plate: debt.vehiclePlate,
  });
  const isCanceled = debt.status.financialStatus === 'canceled';
  const paymentTimeline = payments
    .flatMap((payment) => [
      {
        key: `payment-${payment.id}`,
        paymentId: payment.id,
        eventAt: payment.paidAt,
        amountCents: payment.amountCents,
        kind: 'payment' as const,
        method:
          PAYMENT_METHOD_LABELS[payment.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ??
          payment.paymentMethod,
        description: payment.reversalId
          ? 'Pagamento posteriormente estornado'
          : (payment.notes ?? undefined),
      },
      ...(payment.reversedAt
        ? [
            {
              key: `reversal-${payment.reversalId}`,
              paymentId: payment.id,
              eventAt: payment.reversedAt,
              amountCents: payment.amountCents,
              kind: 'reversal' as const,
              method: 'Estorno integral',
              description: payment.reversalReason ?? undefined,
            },
          ]
        : []),
    ])
    .sort((first, second) => second.eventAt.localeCompare(first.eventAt));

  return (
    <Screen contentContainerStyle={styles.page} scroll>
      <PageHeader
        fallbackRoute="/debts"
        rightAction={
          <Button
            disabled={isCanceled}
            icon={Pencil}
            label="Editar"
            onPress={() => router.push({ pathname: '/debts/[id]/edit', params: { id: debt.id } })}
            size="sm"
            variant="ghost"
          />
        }
        title="Detalhes do fiado"
      />
      {isCanceled ? (
        <Alert
          description={`Motivo: ${debt.cancellationReason ?? 'Não informado'}`}
          title="Fiado cancelado"
          variant="warning"
        />
      ) : debt.status.isOverdue ? (
        <Alert
          description="O vencimento passou e ainda existe saldo pendente."
          title="Fiado atrasado"
          variant="error"
        />
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Resumo financeiro" />
        <BalanceCard
          description={`${debt.summary.paidPercentage.toFixed(0)}% do valor original pago`}
          icon={CircleDollarSign}
          title="Saldo pendente"
          valueCents={debt.summary.pendingCents}
        />
        <View
          accessibilityLabel={`${debt.summary.paidPercentage.toFixed(0)}% do fiado pago`}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(debt.summary.paidPercentage),
          }}
          style={[styles.progressTrack, { backgroundColor: tokens.colors.surfaceSecondary }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: tokens.colors.success,
                width: `${Math.min(100, debt.summary.paidPercentage)}%`,
              },
            ]}
          />
        </View>
        <View style={styles.stats}>
          <StatCard
            icon={ReceiptText}
            label="Valor original"
            style={styles.stat}
            value={formatBRLCents(debt.summary.originalCents)}
          />
          <StatCard
            icon={WalletCards}
            label="Valor pago"
            style={styles.stat}
            value={formatBRLCents(debt.summary.netPaidCents)}
            variant="success"
          />
        </View>
      </View>

      <Card variant="outlined">
        <View style={styles.info}>
          <SectionHeader title="Informações do lançamento" />
          <InfoRow label="Descrição" value={debt.description} />
          <InfoRow label="Data do serviço" value={formatCivilDate(debt.serviceDate)} />
          <InfoRow label="Vencimento" value={formatCivilDate(debt.dueDate) ?? 'Sem vencimento'} />
          <InfoRow label="Observações" value={debt.notes} />
          <View style={styles.statusRow}>
            <DebtStatusBadge status={toDebtBadgeStatus(debt.status)} />
            {debt.status.isOverdue && debt.status.financialStatus === 'partially_paid' ? (
              <AppText color="destructive" variant="caption">
                Parcial e atrasado
              </AppText>
            ) : null}
          </View>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Vínculos" />
        <Card
          accessibilityLabel={`Abrir cliente ${debt.customerName}`}
          onPress={() =>
            router.push({ pathname: '/customers/[id]', params: { id: debt.customerId } })
          }
          variant="outlined"
        >
          <View style={styles.linkRow}>
            <UserRound color={tokens.colors.primary} size={22} />
            <View style={styles.linkCopy}>
              <AppText weight="semibold">{debt.customerName}</AppText>
              <AppText color="textMuted" variant="caption">
                Abrir perfil do cliente
              </AppText>
            </View>
          </View>
        </Card>
        {debt.vehicleId && vehicleLabel ? (
          <Card
            accessibilityLabel={`Abrir veículo ${vehicleLabel}`}
            onPress={() =>
              router.push({ pathname: '/vehicles/[id]', params: { id: debt.vehicleId as string } })
            }
            variant="outlined"
          >
            <View style={styles.linkRow}>
              <Car color={tokens.colors.primary} size={22} />
              <View style={styles.linkCopy}>
                <AppText weight="semibold">{vehicleLabel}</AppText>
                <AppText color="textMuted" variant="caption">
                  Abrir perfil do veículo
                </AppText>
              </View>
            </View>
          </Card>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader
          description={`${paymentTimeline.length} ${paymentTimeline.length === 1 ? 'evento' : 'eventos'}`}
          title="Histórico de pagamentos"
        />
        {paymentTimeline.length ? (
          <Card variant="outlined">
            {paymentTimeline.map((event) => (
              <PaymentListItem
                accessibilityLabel={`Abrir ${event.kind === 'reversal' ? 'estorno' : 'pagamento'} de ${formatBRLCents(event.amountCents)}`}
                amountCents={event.amountCents}
                dateLabel={formatPaymentInstant(event.eventAt, workspace.timezone)}
                description={event.description}
                key={event.key}
                kind={event.kind}
                method={event.method}
                onPress={() =>
                  router.push({ pathname: '/payments/[id]', params: { id: event.paymentId } })
                }
              />
            ))}
          </Card>
        ) : (
          <EmptyState
            description="Pagamentos e estornos confirmados aparecerão aqui."
            icon={ReceiptText}
            title="Sem pagamentos"
          />
        )}
      </View>

      <Button
        disabled={isCanceled || debt.summary.isPaid}
        fullWidth
        icon={WalletCards}
        label={
          isCanceled
            ? 'Pagamento indisponível — fiado cancelado'
            : debt.summary.isPaid
              ? 'Fiado quitado'
              : 'Registrar pagamento'
        }
        onPress={() => router.push({ pathname: '/debts/[id]/payment', params: { id: debt.id } })}
      />

      {!isCanceled && debt.summary.netPaidCents > 0 ? (
        <Alert
          description="Trate os pagamentos válidos antes de cancelar este fiado."
          title="Cancelamento indisponível"
          variant="warning"
        />
      ) : null}
      {!isCanceled && debt.summary.netPaidCents === 0 ? (
        cancelOpen ? (
          <Card variant="outlined">
            <View style={styles.cancelBox}>
              <SectionHeader
                description="A justificativa ficará registrada na auditoria."
                title="Cancelar fiado"
              />
              <TextArea
                editable={!isCanceling}
                label="Justificativa *"
                maxLength={500}
                onChangeText={setCancelReason}
                placeholder="Informe o motivo do cancelamento"
                value={cancelReason}
              />
              <View style={styles.cancelActions}>
                <Button
                  disabled={isCanceling}
                  label="Voltar"
                  onPress={() => setCancelOpen(false)}
                  variant="ghost"
                />
                <Button
                  disabled={!cancelReason.trim()}
                  label="Confirmar cancelamento"
                  loading={isCanceling}
                  onPress={() => void cancel()}
                  variant="destructive"
                />
              </View>
            </View>
          </Card>
        ) : (
          <Button
            fullWidth
            icon={Ban}
            label="Cancelar fiado"
            onPress={() => setCancelOpen(true)}
            variant="destructive"
          />
        )
      ) : null}
      <View style={styles.dateNote}>
        <CalendarDays color={tokens.colors.textMuted} size={16} />
        <AppText color="textMuted" variant="caption">
          Criado em {formatPaymentInstant(debt.createdAt, workspace.timezone)}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 40 },
  section: { gap: 12 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { minWidth: 148, flexGrow: 1, flexBasis: 148 },
  info: { gap: 14 },
  infoRow: { gap: 2 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkCopy: { flex: 1, gap: 2 },
  cancelBox: { gap: 14 },
  cancelActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  dateNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  progressTrack: { height: 10, overflow: 'hidden', borderRadius: 999 },
  progressFill: { height: '100%', borderRadius: 999 },
});
