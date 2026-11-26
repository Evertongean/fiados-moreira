import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ReceiptText, Save } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Alert as NativeAlert, BackHandler, StyleSheet, View } from 'react-native';

import { RouteState } from '@/components/layouts/RouteState';
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  Header,
  LoadingState,
  Screen,
  useToast,
} from '@/components/ui';
import { calculateRemainingAfterPayment } from '@/features/debts/domain/finance';
import type { DebtOverview } from '@/features/debts/domain/debtTypes';
import { PaymentForm } from '@/features/payments/components/PaymentForm';
import {
  paymentFormSchema,
  type PaymentFormOutput,
  type PaymentFormValues,
} from '@/features/payments/domain/paymentSchemas';
import { PAYMENT_METHOD_LABELS } from '@/features/payments/domain/paymentUtils';
import { useDatabase } from '@/hooks/useDatabase';
import { formatBRLCents } from '@/utils/currency';
import { civilDateToIsoInstant, formatCivilDate, getCivilDate, parseCivilDate } from '@/utils/date';
import { getRouteId } from '@/utils/routes';
import { createUuid } from '@/utils/uuid';

function friendlyError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code === 'PAYMENT_EXCEEDS_BALANCE') return 'O valor supera o saldo pendente atualizado.';
  if (code === 'DEBT_ALREADY_PAID') return 'Este fiado já está quitado.';
  if (code === 'DEBT_CANCELED') return 'Fiados cancelados não podem receber pagamentos.';
  if (code === 'IDEMPOTENCY_CONFLICT') return 'Esta tentativa já foi concluída com outros dados.';
  return 'Não foi possível registrar o pagamento. Tente novamente.';
}

export function PaymentFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const debtId = getRouteId(id);
  if (!debtId) {
    return (
      <RouteState
        description="Não foi possível identificar o fiado."
        kind="invalid"
        title="Fiado inválido"
      />
    );
  }
  return <PaymentFormContent debtId={debtId} />;
}

function PaymentFormContent({ debtId }: { debtId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { workspace, repositories, services } = useDatabase();
  const [operationId] = useState(createUuid);
  const [debt, setDebt] = useState<DebtOverview | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<PaymentFormOutput | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PaymentFormValues, unknown, PaymentFormOutput>({
    defaultValues: {
      amountCents: null,
      paymentMethod: 'pix',
      paidDate: formatCivilDate(getCivilDate(new Date(), workspace.timezone)) ?? '',
      notes: '',
    },
    mode: 'onBlur',
    resolver: zodResolver(paymentFormSchema),
  });
  const amountCents = useWatch({ control, name: 'amountCents' });
  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/debts/[id]', params: { id: debtId } });
  };
  const requestLeave = () => {
    if (isSaving) return;
    if (!isDirty) return leave();
    NativeAlert.alert('Descartar pagamento?', 'Os dados informados ainda não foram confirmados.', [
      { text: 'Continuar editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: leave },
    ]);
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestLeave();
      return true;
    });
    return () => subscription.remove();
  });

  useEffect(() => {
    let active = true;
    void repositories.debts
      .findOverview(workspace.id, debtId, workspace.timezone)
      .then((record) => {
        if (!active) return;
        if (!record) {
          setStatus('missing');
          return;
        }
        setDebt(record);
        setStatus('ready');
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [debtId, loadAttempt, repositories.debts, workspace.id, workspace.timezone]);

  const remainingCents = useMemo(() => {
    if (!debt || amountCents === null) return null;
    try {
      return calculateRemainingAfterPayment(debt.summary, amountCents);
    } catch {
      return null;
    }
  }, [amountCents, debt]);

  const prepareConfirmation = handleSubmit((values) => {
    if (!debt) return;
    try {
      calculateRemainingAfterPayment(debt.summary, values.amountCents);
      setConfirmation(values);
    } catch {
      setError('amountCents', { message: 'O valor não pode superar o saldo pendente.' });
    }
  });

  const confirmPayment = async () => {
    if (!confirmation || isSaving) return;
    const paidDate = parseCivilDate(confirmation.paidDate);
    if (!paidDate) return;
    setIsSaving(true);
    try {
      const payment = await services.payments.register(workspace.id, {
        operationId,
        debtId,
        amountCents: confirmation.amountCents,
        paymentMethod: confirmation.paymentMethod,
        paidAt: civilDateToIsoInstant(paidDate),
        notes: confirmation.notes,
      });
      setConfirmation(null);
      showToast({ title: 'Pagamento registrado com sucesso!', variant: 'success' });
      router.replace({ pathname: '/payments/[id]', params: { id: payment.id } });
    } catch (error) {
      setConfirmation(null);
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      if (
        code === 'PAYMENT_EXCEEDS_BALANCE' ||
        code === 'DEBT_ALREADY_PAID' ||
        code === 'DEBT_CANCELED'
      ) {
        try {
          const current = await repositories.debts.findOverview(
            workspace.id,
            debtId,
            workspace.timezone,
          );
          if (current) {
            setDebt(current);
            if (confirmation.amountCents > current.summary.pendingCents) {
              setValue('amountCents', null, { shouldDirty: true });
            }
          }
        } catch {
          // A mensagem da falha transacional original continua sendo a mais útil para o usuário.
        }
      }
      showToast({ title: friendlyError(error), variant: 'error' });
    } finally {
      setIsSaving(false);
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
        description="Este fiado não existe ou pertence a outro workspace."
        headerTitle="Pagamento"
        kind="notFound"
        title="Fiado não encontrado"
      />
    );
  }
  if (status === 'error' || !debt) {
    return (
      <Screen contentContainerStyle={styles.page}>
        <Header
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/debts'))}
          title="Registrar pagamento"
        />
        <EmptyState
          action={{
            label: 'Tentar novamente',
            onPress: () => {
              setStatus('loading');
              setLoadAttempt((value) => value + 1);
            },
          }}
          description="Não foi possível consultar os dados locais."
          icon={ReceiptText}
          title="Não foi possível carregar o pagamento."
        />
      </Screen>
    );
  }

  const unavailable = debt.status.financialStatus === 'canceled' || debt.summary.isPaid;
  if (unavailable) {
    return (
      <Screen contentContainerStyle={styles.page}>
        <Header
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/debts'))}
          title="Registrar pagamento"
        />
        <EmptyState
          action={{
            label: 'Voltar ao fiado',
            onPress: () => router.replace({ pathname: '/debts/[id]', params: { id: debt.id } }),
          }}
          description={
            debt.summary.isPaid
              ? 'O saldo deste fiado já foi totalmente quitado.'
              : 'Fiados cancelados não podem receber pagamentos.'
          }
          icon={ReceiptText}
          title="Pagamento indisponível"
        />
      </Screen>
    );
  }

  const confirmedRemaining = confirmation
    ? calculateRemainingAfterPayment(debt.summary, confirmation.amountCents)
    : null;

  return (
    <Screen contentContainerStyle={styles.page} keyboardAware scroll>
      <Header onBack={requestLeave} subtitle={debt.description} title="Registrar pagamento" />
      <Alert
        description="O saldo é validado novamente dentro da transação antes da confirmação."
        title={`Cliente: ${debt.customerName}`}
        variant="info"
      />
      <PaymentForm
        control={control}
        disabled={isSaving}
        errors={errors}
        onPayFull={() => setValue('amountCents', debt.summary.pendingCents, { shouldDirty: true })}
        pendingCents={debt.summary.pendingCents}
        remainingCents={remainingCents}
      />
      <View style={styles.actions}>
        <Button
          disabled={isSaving}
          fullWidth
          label="Cancelar"
          onPress={requestLeave}
          variant="outline"
        />
        <Button
          fullWidth
          icon={Save}
          label="Revisar pagamento"
          loading={isSaving}
          onPress={() => void prepareConfirmation()}
        />
      </View>
      <ConfirmDialog
        confirmLabel="Confirmar pagamento"
        description={
          confirmation
            ? `${formatBRLCents(confirmation.amountCents)} via ${PAYMENT_METHOD_LABELS[confirmation.paymentMethod]}. O saldo ficará em ${formatBRLCents(confirmedRemaining ?? 0)}.`
            : ''
        }
        loading={isSaving}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void confirmPayment()}
        title="Registrar este pagamento?"
        visible={confirmation !== null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 40 },
  actions: { gap: 10 },
});
