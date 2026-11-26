import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { ReceiptText, Save } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Alert as NativeAlert, BackHandler, StyleSheet, View } from 'react-native';

import { RouteState } from '@/components/layouts/RouteState';
import { Alert, Button, EmptyState, Header, LoadingState, Screen, useToast } from '@/components/ui';
import type { CustomerRow, VehicleRow } from '@/database/schema';
import { DebtForm } from '@/features/debts/components/DebtForm';
import {
  debtFormSchema,
  type CreateDebtInput,
  type DebtFormOutput,
  type DebtFormValues,
} from '@/features/debts/domain/debtSchemas';
import { formatCivilDate, parseCivilDate } from '@/features/debts/domain/debtUtils';
import { useDatabase } from '@/hooks/useDatabase';
import { getCivilDate } from '@/utils/date';
import { createUuid } from '@/utils/uuid';

export interface DebtFormScreenProps {
  mode: 'create' | 'edit';
  debtId?: string;
  initialCustomerId?: string;
  initialVehicleId?: string;
}

function friendlyError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code === 'CUSTOMER_ARCHIVED') return 'Restaure o cliente antes de registrar um fiado.';
  if (code === 'VEHICLE_ARCHIVED') return 'O veículo selecionado está arquivado.';
  if (code === 'CONSTRAINT_VIOLATION') return 'O veículo selecionado não pertence ao cliente.';
  if (code === 'INVALID_AMOUNT') return 'O valor não pode ser menor que o total já pago.';
  if (code === 'DEBT_CANCELED') return 'Fiados cancelados não podem ser editados.';
  if (code === 'IDEMPOTENCY_CONFLICT') return 'Esta tentativa já foi concluída com outros dados.';
  return 'Não foi possível salvar o fiado. Tente novamente.';
}

export function DebtFormScreen({
  mode,
  debtId,
  initialCustomerId,
  initialVehicleId,
}: DebtFormScreenProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { workspace, repositories, services } = useDatabase();
  const [operationId] = useState(createUuid);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'empty' | 'error'>(
    'loading',
  );
  const [isSaving, setIsSaving] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const isEdit = mode === 'edit';
  const initializedCustomer = useRef('');
  const {
    control,
    getValues,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<DebtFormValues, unknown, DebtFormOutput>({
    defaultValues: {
      customerId: '',
      vehicleId: '',
      description: '',
      totalCents: null,
      serviceDate: formatCivilDate(getCivilDate(new Date(), workspace.timezone)) ?? '',
      dueDate: '',
      notes: '',
    },
    mode: 'onBlur',
    resolver: zodResolver(debtFormSchema),
  });
  const selectedCustomerId = useWatch({ control, name: 'customerId' });

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/debts');
  };
  const requestLeave = () => {
    if (!isDirty || isSaving) return leave();
    NativeAlert.alert('Descartar alterações?', 'Os dados do fiado ainda não foram salvos.', [
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
    void (async () => {
      try {
        if (isEdit) {
          if (!debtId) {
            if (active) setStatus('missing');
            return;
          }
          const debt = await repositories.debts.findById(workspace.id, debtId);
          if (!debt) {
            if (active) setStatus('missing');
            return;
          }
          const owner = await repositories.customers.findById(workspace.id, debt.customerId);
          if (!owner) {
            if (active) setStatus('error');
            return;
          }
          if (!active) return;
          setCustomers([owner]);
          initializedCustomer.current = owner.id;
          reset({
            customerId: owner.id,
            vehicleId: debt.vehicleId ?? '',
            description: debt.description,
            totalCents: debt.totalCents,
            serviceDate: formatCivilDate(debt.serviceDate) ?? '',
            dueDate: formatCivilDate(debt.dueDate) ?? '',
            notes: debt.notes ?? '',
          });
          setStatus('ready');
          return;
        }
        const activeCustomers = await repositories.customers.list(workspace.id, {
          status: 'active',
          sort: 'name_asc',
        });
        if (!active) return;
        setCustomers(activeCustomers);
        if (!activeCustomers.length) {
          setStatus('empty');
          return;
        }
        const preferred = activeCustomers.some((item) => item.id === initialCustomerId)
          ? initialCustomerId
          : activeCustomers.length === 1
            ? activeCustomers[0]?.id
            : '';
        initializedCustomer.current = preferred ?? '';
        reset({
          customerId: preferred ?? '',
          vehicleId: initialVehicleId ?? '',
          description: '',
          totalCents: null,
          serviceDate: formatCivilDate(getCivilDate(new Date(), workspace.timezone)) ?? '',
          dueDate: '',
          notes: '',
        });
        setStatus('ready');
      } catch {
        if (active) setStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [
    debtId,
    initialCustomerId,
    initialVehicleId,
    isEdit,
    loadAttempt,
    repositories.customers,
    repositories.debts,
    reset,
    workspace.id,
    workspace.timezone,
  ]);

  useEffect(() => {
    let active = true;
    if (!selectedCustomerId) {
      return;
    }
    void repositories.vehicles
      .listByCustomer(workspace.id, selectedCustomerId, { status: isEdit ? 'all' : 'active' })
      .then((rows) => {
        if (!active) return;
        setVehicles(rows);
        const currentVehicleId = getValues('vehicleId');
        if (currentVehicleId && !rows.some((vehicle) => vehicle.id === currentVehicleId)) {
          setValue('vehicleId', '', { shouldDirty: true });
        }
        if (initializedCustomer.current && initializedCustomer.current !== selectedCustomerId) {
          setValue('vehicleId', '', { shouldDirty: true });
        }
        initializedCustomer.current = selectedCustomerId;
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [getValues, isEdit, repositories.vehicles, selectedCustomerId, setValue, workspace.id]);

  const submit = handleSubmit(async (values) => {
    const serviceDate = parseCivilDate(values.serviceDate);
    const dueDate = values.dueDate.trim() ? parseCivilDate(values.dueDate) : null;
    if (!serviceDate || (values.dueDate.trim() && !dueDate) || values.totalCents === null) return;
    const input: CreateDebtInput = {
      customerId: values.customerId,
      vehicleId: values.vehicleId || null,
      description: values.description,
      totalCents: values.totalCents,
      serviceDate,
      dueDate,
      notes: values.notes,
    };
    setIsSaving(true);
    try {
      const debt = isEdit
        ? await services.debts.update(
            workspace.id,
            debtId as string,
            {
              vehicleId: input.vehicleId,
              description: input.description,
              totalCents: input.totalCents,
              serviceDate: input.serviceDate,
              dueDate: input.dueDate,
              notes: input.notes,
            },
            operationId,
          )
        : await services.debts.create(workspace.id, input, operationId);
      reset(values);
      showToast({
        title: isEdit ? 'Fiado atualizado com sucesso!' : 'Fiado cadastrado com sucesso!',
        variant: 'success',
      });
      router.replace({ pathname: '/debts/[id]', params: { id: debt.id } });
    } catch (error) {
      showToast({ title: friendlyError(error), variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  });

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState fullScreen label="Carregando formulário do fiado…" />
      </Screen>
    );
  }
  if (status === 'missing') {
    return (
      <RouteState
        description="O fiado solicitado não existe neste workspace."
        headerTitle="Fiado"
        kind="notFound"
        title="Fiado não encontrado"
      />
    );
  }
  if (status === 'empty') {
    return (
      <Screen contentContainerStyle={styles.page}>
        <Header onBack={requestLeave} title="Novo fiado" />
        <EmptyState
          action={{ label: 'Cadastrar cliente', onPress: () => router.push('/customers/new') }}
          description="Cadastre um cliente ativo antes de lançar um fiado."
          icon={ReceiptText}
          title="Nenhum cliente disponível"
        />
      </Screen>
    );
  }
  if (status === 'error') {
    return (
      <Screen contentContainerStyle={styles.page}>
        <Header onBack={requestLeave} title={isEdit ? 'Editar fiado' : 'Novo fiado'} />
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
          title="Não foi possível carregar o formulário."
        />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.page} keyboardAware scroll>
      <Header
        onBack={requestLeave}
        subtitle="Valores são salvos em centavos e a operação é auditada localmente."
        title={isEdit ? 'Editar fiado' : 'Novo fiado'}
      />
      <Alert
        description="O lançamento funciona sem internet e só é confirmado após a gravação no SQLite."
        title="Cadastro offline"
        variant="info"
      />
      <DebtForm
        control={control}
        customerLocked={isEdit || Boolean(initialCustomerId)}
        customers={customers}
        disabled={isSaving}
        errors={errors}
        vehicles={vehicles}
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
          label={isEdit ? 'Salvar alterações' : 'Salvar fiado'}
          loading={isSaving}
          onPress={() => void submit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 40 },
  actions: { gap: 10 },
});
