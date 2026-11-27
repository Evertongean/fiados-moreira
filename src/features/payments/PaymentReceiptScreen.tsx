import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Download, ReceiptText, Share2 } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RouteState } from '@/components/layouts/RouteState';
import { PageHeader, SectionHeader } from '@/components/navigation';
import {
  Alert,
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  Screen,
  useToast,
} from '@/components/ui';
import { formatVehicleLabel } from '@/features/debts/domain/debtUtils';
import {
  formatReceiptInstant,
  getPaymentReceiptId,
} from '@/features/payments/domain/paymentReceipt';
import type { PaymentReceiptDetails } from '@/features/payments/domain/paymentTypes';
import { PAYMENT_METHOD_LABELS } from '@/features/payments/domain/paymentUtils';
import type { GeneratedPaymentReceipt } from '@/features/payments/services/PaymentReceiptService';
import { useDatabase } from '@/hooks/useDatabase';
import { brandColors } from '@/theme/colors';
import { formatBRLCents } from '@/utils/currency';
import { getRouteId } from '@/utils/routes';

export function PaymentReceiptScreen() {
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
  return <PaymentReceiptContent paymentId={paymentId} />;
}

function PaymentReceiptContent({ paymentId }: { paymentId: string }) {
  const { workspace, repositories, services } = useDatabase();
  const { showToast } = useToast();
  const [receipt, setReceipt] = useState<PaymentReceiptDetails | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [workingAction, setWorkingAction] = useState<'generate' | 'share' | null>(null);
  const [generated, setGenerated] = useState<GeneratedPaymentReceipt | null>(null);
  const [issuedAt, setIssuedAt] = useState(() => new Date());
  const generatedRef = useRef<GeneratedPaymentReceipt | null>(null);
  const actionLock = useRef(false);
  const mountedRef = useRef(true);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setStatus('loading');
    try {
      const record = await repositories.payments.findReceiptDetails(workspace.id, paymentId);
      if (requestVersion.current !== version) return;
      if (!record) {
        setStatus('missing');
        return;
      }
      setReceipt(record);
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

  useEffect(() => {
    generatedRef.current = generated;
  }, [generated]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const file = generatedRef.current;
      if (file && !actionLock.current) {
        generatedRef.current = null;
        void services.paymentReceipts.remove(file).catch(() => undefined);
      }
    };
  }, [services.paymentReceipts]);

  const replaceGenerated = async (file: GeneratedPaymentReceipt): Promise<boolean> => {
    if (!mountedRef.current) {
      await services.paymentReceipts.remove(file).catch(() => undefined);
      return false;
    }
    const previous = generatedRef.current;
    if (previous && previous.uri !== file.uri) {
      await services.paymentReceipts.remove(previous).catch(() => undefined);
    }
    if (!mountedRef.current) {
      generatedRef.current = null;
      await services.paymentReceipts.remove(file).catch(() => undefined);
      return false;
    }
    generatedRef.current = file;
    setGenerated(file);
    return true;
  };

  const cleanupAfterUnmount = async () => {
    if (mountedRef.current) return;
    const file = generatedRef.current;
    generatedRef.current = null;
    if (file) await services.paymentReceipts.remove(file).catch(() => undefined);
  };

  const generatePdf = async () => {
    if (!receipt || actionLock.current) return;
    actionLock.current = true;
    setWorkingAction('generate');
    const emission = new Date();
    setIssuedAt(emission);
    try {
      const file = await services.paymentReceipts.generate(receipt, workspace.timezone, emission);
      if ((await replaceGenerated(file)) && mountedRef.current) {
        showToast({ title: 'PDF gerado e pronto para compartilhar.', variant: 'success' });
      }
    } catch {
      if (mountedRef.current) {
        showToast({ title: 'Não foi possível gerar o comprovante.', variant: 'error' });
      }
    } finally {
      actionLock.current = false;
      await cleanupAfterUnmount();
      if (mountedRef.current) setWorkingAction(null);
    }
  };

  const sharePdf = async () => {
    if (!receipt || actionLock.current) return;
    actionLock.current = true;
    setWorkingAction('share');
    try {
      let file = generatedRef.current;
      if (!file) {
        const emission = new Date();
        setIssuedAt(emission);
        file = await services.paymentReceipts.generate(receipt, workspace.timezone, emission);
        if (!(await replaceGenerated(file))) return;
      }
      await services.paymentReceipts.share(file);
      await services.paymentReceipts.remove(file).catch(() => undefined);
      generatedRef.current = null;
      if (mountedRef.current) setGenerated(null);
    } catch {
      if (mountedRef.current) {
        showToast({ title: 'Não foi possível compartilhar o comprovante.', variant: 'error' });
      }
    } finally {
      actionLock.current = false;
      await cleanupAfterUnmount();
      if (mountedRef.current) setWorkingAction(null);
    }
  };

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState fullScreen label="Preparando comprovante…" />
      </Screen>
    );
  }
  if (status === 'missing') {
    return (
      <RouteState
        description="Este pagamento não existe ou pertence a outro workspace."
        headerTitle="Comprovante"
        kind="notFound"
        title="Pagamento não encontrado"
      />
    );
  }
  if (status === 'error' || !receipt) {
    return (
      <Screen contentContainerStyle={styles.page}>
        <PageHeader fallbackRoute="/debts" title="Comprovante" />
        <EmptyState
          action={{ label: 'Tentar novamente', onPress: () => void load() }}
          description="O pagamento não foi alterado. Tente consultar novamente."
          icon={ReceiptText}
          title="Não foi possível preparar o comprovante"
        />
      </Screen>
    );
  }

  const vehicle = formatVehicleLabel({
    brand: receipt.vehicleBrand,
    model: receipt.vehicleModel,
    plate: receipt.vehiclePlate,
  });
  const isReversed = receipt.reversalId !== null;
  const historicalAvailable =
    receipt.debtTotalAtPaymentCents !== null &&
    receipt.totalPaidAtPaymentCents !== null &&
    receipt.remainingAtPaymentCents !== null;

  return (
    <Screen contentContainerStyle={styles.page} scroll>
      <PageHeader fallbackRoute="/debts" title="Comprovante de pagamento" />
      {isReversed ? (
        <Alert
          description="O PDF identificará claramente que este pagamento foi posteriormente estornado."
          title="Pagamento estornado"
          variant="warning"
        />
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          description="Confira as informações antes de gerar ou compartilhar."
          title="Visualização do comprovante"
        />
        <Card style={styles.preview} variant="outlined">
          <View style={styles.previewHeader}>
            <View style={styles.previewTitle}>
              <AppText color="primary" variant="h3">
                {receipt.workshopName}
              </AppText>
              <AppText style={styles.documentText} weight="bold">
                COMPROVANTE DE PAGAMENTO
              </AppText>
              <AppText color="textMuted" selectable variant="caption">
                {getPaymentReceiptId(receipt.id)}
              </AppText>
            </View>
            <Badge
              label={isReversed ? 'Estornado' : 'Confirmado'}
              variant={isReversed ? 'warning' : 'success'}
            />
          </View>

          <View style={styles.receiptRows}>
            <ReceiptRow label="Cliente" value={receipt.customerName} />
            <ReceiptRow label="Veículo" value={vehicle} />
            <ReceiptRow label="Serviço" value={receipt.debtDescription} />
            <ReceiptRow
              label="Valor original do fiado"
              value={
                receipt.originalDebtCents === null
                  ? 'Não disponível'
                  : formatBRLCents(receipt.originalDebtCents)
              }
            />
            <ReceiptRow label="Valor do pagamento" value={formatBRLCents(receipt.amountCents)} />
            <ReceiptRow label="Método" value={PAYMENT_METHOD_LABELS[receipt.paymentMethod]} />
            <ReceiptRow
              label="Data do recebimento"
              value={formatReceiptInstant(receipt.paidAt, workspace.timezone, false)}
            />
            {historicalAvailable ? (
              <>
                <ReceiptRow
                  label="Total pago após a operação"
                  value={formatBRLCents(receipt.totalPaidAtPaymentCents as number)}
                />
                <ReceiptRow
                  label="Saldo após a operação"
                  value={formatBRLCents(receipt.remainingAtPaymentCents as number)}
                />
              </>
            ) : null}
            <ReceiptRow
              label="Data de emissão"
              value={formatReceiptInstant(issuedAt.toISOString(), workspace.timezone, true)}
            />
          </View>

          {!historicalAvailable ? (
            <Alert
              description="Total pago e saldo após a operação serão omitidos porque este registro não possui snapshot histórico suficiente."
              title="Dados históricos limitados"
              variant="info"
            />
          ) : null}
          <AppText color="textMuted" style={styles.receiptFooter} variant="caption">
            Documento emitido pelo Fiados Moreira. Este comprovante não é nota fiscal.
          </AppText>
        </Card>
      </View>

      {generated ? (
        <Alert
          description="O arquivo temporário será removido após o compartilhamento ou ao sair desta tela."
          title="PDF pronto"
          variant="success"
        />
      ) : null}

      <View style={styles.actions}>
        <Button
          accessibilityLabel="Gerar comprovante em PDF"
          fullWidth
          icon={Download}
          label="Gerar PDF"
          loading={workingAction === 'generate'}
          onPress={() => void generatePdf()}
          variant="outline"
        />
        <Button
          accessibilityLabel="Compartilhar comprovante em PDF"
          fullWidth
          icon={Share2}
          label="Compartilhar comprovante"
          loading={workingAction === 'share'}
          onPress={() => void sharePdf()}
        />
      </View>
    </Screen>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.receiptRow}>
      <AppText color="textMuted" variant="caption">
        {label}
      </AppText>
      <AppText selectable style={styles.receiptValue} variant="bodySmall" weight="semibold">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 40 },
  section: { gap: 12 },
  preview: { backgroundColor: brandColors.white },
  previewHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  previewTitle: { flex: 1, minWidth: 210, gap: 4 },
  documentText: { color: brandColors.dark },
  receiptRows: { marginTop: 18, marginBottom: 16 },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${brandColors.primary}22`,
  },
  receiptValue: { flex: 1, color: brandColors.dark, textAlign: 'right' },
  receiptFooter: { color: brandColors.dark },
  actions: { gap: 10 },
});
