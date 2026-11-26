import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ReceiptText, RotateCcw, UserRound, WalletCards } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RouteState } from '@/components/layouts/RouteState';
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
  TextArea,
  useToast,
} from '@/components/ui';
import type { PaymentDetails } from '@/features/payments/domain/paymentTypes';
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

export function PaymentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const paymentId = getRouteId(id);
  if (!paymentId) {
    return (
      <RouteState
        description="O identificador recebido não é válido."
        kind="invalid"
        title="Pagamento inválido"
      />
    );
  }
  return <PaymentDetailsContent paymentId={paymentId} />;
}

function PaymentDetailsContent({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const { tokens } = useTheme();
  const { showToast } = useToast();
  const { workspace, repositories, services } = useDatabase();
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [reversalOpen, setReversalOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [isReversing, setIsReversing] = useState(false);
  const [reversalOperationId, setReversalOperationId] = useState(createUuid);
  const [reversalTimestamp, setReversalTimestamp] = useState(() => new Date().toISOString());
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setStatus('loading');
    try {
      const record = await repositories.payments.findDetails(workspace.id, paymentId);
      if (requestVersion.current !== version) return;
      if (!record) {
        setStatus('missing');
        return;
      }
      setPayment(record);
      setStatus('ready');
    } catch {
      if (requestVersion.current === version) setStatus('error');
    }
  }, [paymentId, repositories.payments, workspace.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestVersion.current += 1;
      };
    }, [load]),
  );

  const reverse = async () => {
    if (!payment || !reversalReason.trim() || isReversing) return;
    setIsReversing(true);
    try {
      await services.reversals.reverse(workspace.id, {
        operationId: reversalOperationId,
        paymentId: payment.id,
        reason: reversalReason,
        reversedAt: reversalTimestamp,
      });
      setConfirmVisible(false);
      setReversalOpen(false);
      setReversalReason('');
      setReversalOperationId(createUuid());
      setReversalTimestamp(new Date().toISOString());
      showToast({ title: 'Pagamento estornado com sucesso.', variant: 'success' });
      await load();
    } catch (error) {
      const alreadyReversed =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'PAYMENT_ALREADY_REVERSED';
      setConfirmVisible(false);
      showToast({
        title: alreadyReversed
          ? 'Este pagamento já foi estornado.'
          : 'Não foi possível estornar o pagamento.',
        variant: alreadyReversed ? 'warning' : 'error',
      });
      if (alreadyReversed) await load();
    } finally {
      setIsReversing(false);
    }
  };

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState fullScreen label="Carregando pagamento…" />
      </Screen>
    );
  }
  if (status === 'missing') {
    return (
      <RouteState
        description="Este pagamento não existe ou pertence a outro workspace."
        headerTitle="Pagamento"
        kind="notFound"
        title="Pagamento não encontrado"
      />
    );
  }
  if (status === 'error' || !payment) {
    return (
      <Screen contentContainerStyle={styles.page}>
        <PageHeader fallbackRoute="/debts" title="Detalhes do pagamento" />
        <EmptyState
          action={{ label: 'Tentar novamente', onPress: () => void load() }}
          description="Não foi possível consultar os dados locais."
          icon={ReceiptText}
          title="Não foi possível carregar o pagamento."
        />
      </Screen>
    );
  }

  const isReversed = payment.reversalId !== null;

  return (
    <Screen contentContainerStyle={styles.page} scroll>
      <PageHeader fallbackRoute="/debts" title="Detalhes do pagamento" />
      {isReversed ? (
        <Alert
          description={`Motivo: ${payment.reversalReason ?? 'Não informado'}`}
          title="Pagamento estornado"
          variant="warning"
        />
      ) : (
        <Alert
          description="Este pagamento compõe o saldo líquido do fiado."
          title="Pagamento confirmado"
          variant="success"
        />
      )}

      <Card variant="highlighted">
        <View style={styles.amountCard}>
          <WalletCards color={tokens.colors.primary} size={28} />
          <View style={styles.amountCopy}>
            <AppText color="textMuted" variant="caption">
              Valor do pagamento
            </AppText>
            <AppText selectable variant="h2">
              {formatBRLCents(payment.amountCents)}
            </AppText>
          </View>
          <Badge
            label={isReversed ? 'Estornado' : 'Confirmado'}
            variant={isReversed ? 'warning' : 'success'}
          />
        </View>
      </Card>

      <Card variant="outlined">
        <View style={styles.info}>
          <SectionHeader title="Informações" />
          <InfoRow label="Método" value={PAYMENT_METHOD_LABELS[payment.paymentMethod]} />
          <InfoRow
            label="Data do pagamento"
            value={formatPaymentInstant(payment.paidAt, workspace.timezone)}
          />
          <InfoRow label="Observações" value={payment.notes} />
          {payment.reversedAt ? (
            <InfoRow
              label="Data do estorno"
              value={formatPaymentInstant(payment.reversedAt, workspace.timezone)}
            />
          ) : null}
          <InfoRow label="Justificativa do estorno" value={payment.reversalReason} />
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Vínculos" />
        <Card
          accessibilityLabel={`Abrir cliente ${payment.customerName}`}
          onPress={() =>
            router.push({ pathname: '/customers/[id]', params: { id: payment.customerId } })
          }
          variant="outlined"
        >
          <View style={styles.linkRow}>
            <UserRound color={tokens.colors.primary} size={22} />
            <View style={styles.linkCopy}>
              <AppText weight="semibold">{payment.customerName}</AppText>
              <AppText color="textMuted" variant="caption">
                Abrir perfil do cliente
              </AppText>
            </View>
          </View>
        </Card>
        <Card
          accessibilityLabel={`Abrir fiado ${payment.debtDescription}`}
          onPress={() => router.push({ pathname: '/debts/[id]', params: { id: payment.debtId } })}
          variant="outlined"
        >
          <View style={styles.linkRow}>
            <ReceiptText color={tokens.colors.primary} size={22} />
            <View style={styles.linkCopy}>
              <AppText weight="semibold">{payment.debtDescription}</AppText>
              <AppText color="textMuted" variant="caption">
                Abrir detalhes do fiado
              </AppText>
            </View>
          </View>
        </Card>
      </View>

      {!isReversed ? (
        reversalOpen ? (
          <Card variant="outlined">
            <View style={styles.reversalBox}>
              <SectionHeader
                description="O pagamento permanecerá no histórico e o valor retornará ao saldo."
                title="Estornar pagamento"
              />
              <TextArea
                editable={!isReversing}
                label="Justificativa *"
                maxLength={500}
                onChangeText={setReversalReason}
                placeholder="Informe o motivo do estorno"
                value={reversalReason}
              />
              <View style={styles.actions}>
                <Button
                  disabled={isReversing}
                  label="Voltar"
                  onPress={() => setReversalOpen(false)}
                  variant="ghost"
                />
                <Button
                  disabled={!reversalReason.trim()}
                  label="Revisar estorno"
                  onPress={() => setConfirmVisible(true)}
                  variant="destructive"
                />
              </View>
            </View>
          </Card>
        ) : (
          <Button
            fullWidth
            icon={RotateCcw}
            label="Estornar pagamento"
            onPress={() => {
              setReversalOperationId(createUuid());
              setReversalTimestamp(new Date().toISOString());
              setReversalOpen(true);
            }}
            variant="destructive"
          />
        )
      ) : null}

      <ConfirmDialog
        confirmLabel="Confirmar estorno"
        description={`O valor de ${formatBRLCents(payment.amountCents)} retornará integralmente ao saldo. O histórico será preservado.`}
        destructive
        loading={isReversing}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={() => void reverse()}
        title="Estornar este pagamento?"
        visible={confirmVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 40 },
  section: { gap: 12 },
  amountCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  amountCopy: { flex: 1, gap: 2 },
  info: { gap: 14 },
  infoRow: { gap: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkCopy: { flex: 1, gap: 2 },
  reversalBox: { gap: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
});
