import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Car, Save } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert as NativeAlert, BackHandler, StyleSheet, View } from 'react-native';

import { RouteState } from '@/components/layouts/RouteState';
import { Alert, Button, EmptyState, Header, LoadingState, Screen, useToast } from '@/components/ui';
import type { CustomerRow } from '@/database/schema';
import { DuplicateVehicleDialog } from '@/features/vehicles/components/DuplicateVehicleDialog';
import { VehicleForm } from '@/features/vehicles/components/VehicleForm';
import {
  vehicleFormSchema,
  type CreateVehicleInput,
  type VehicleFormValues,
} from '@/features/vehicles/domain/vehicleSchemas';
import type { PotentialVehicleDuplicate } from '@/features/vehicles/domain/vehicleTypes';
import { useDatabase } from '@/hooks/useDatabase';
import { createUuid } from '@/utils/uuid';

export interface VehicleFormScreenProps {
  mode: 'create' | 'edit';
  vehicleId?: string;
  initialCustomerId?: string;
}

const DEFAULT_VALUES: VehicleFormValues = {
  customerId: '',
  type: 'car',
  brand: '',
  model: '',
  year: '',
  plate: '',
  color: '',
  notes: '',
};

function getFriendlyError(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = String(error.code);
    if (code === 'VEHICLE_NOT_FOUND') return 'Este veículo não foi encontrado.';
    if (code === 'CUSTOMER_NOT_FOUND') return 'O cliente responsável não foi encontrado.';
    if (code === 'VEHICLE_CUSTOMER_ARCHIVED')
      return 'Restaure o cliente antes de cadastrar um veículo.';
    if (code === 'VEHICLE_VALIDATION_ERROR') return 'Revise os dados informados.';
    if (code === 'IDEMPOTENCY_CONFLICT')
      return 'Não foi possível repetir esta tentativa com dados diferentes.';
  }
  return 'Não foi possível salvar o veículo. Tente novamente.';
}

export function VehicleFormScreen({ mode, vehicleId, initialCustomerId }: VehicleFormScreenProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { workspace, repositories, services } = useDatabase();
  const [requestId] = useState(createUuid);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loadStatus, setLoadStatus] = useState<
    'loading' | 'ready' | 'missing' | 'noCustomers' | 'error'
  >('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [duplicates, setDuplicates] = useState<PotentialVehicleDuplicate[]>([]);
  const [pendingInput, setPendingInput] = useState<CreateVehicleInput | null>(null);
  const isEdit = mode === 'edit';
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<VehicleFormValues>({
    defaultValues: DEFAULT_VALUES,
    mode: 'onBlur',
    resolver: zodResolver(vehicleFormSchema),
  });

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/customers');
  };

  const requestLeave = () => {
    if (!isDirty || isSaving) {
      leave();
      return;
    }
    NativeAlert.alert('Descartar alterações?', 'Os dados do veículo ainda não foram salvos.', [
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
          if (!vehicleId) {
            if (active) setLoadStatus('missing');
            return;
          }
          const vehicle = await repositories.vehicles.findById(workspace.id, vehicleId);
          if (!vehicle) {
            if (active) setLoadStatus('missing');
            return;
          }
          const owner = await repositories.customers.findById(workspace.id, vehicle.customerId);
          if (!owner) {
            if (active) setLoadStatus('error');
            return;
          }
          if (!active) return;
          setCustomers([owner]);
          reset({
            customerId: vehicle.customerId,
            type: vehicle.type,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year?.toString() ?? '',
            plate: vehicle.plate ?? '',
            color: vehicle.color ?? '',
            notes: vehicle.notes ?? '',
          });
          setLoadStatus('ready');
          return;
        }

        const activeCustomers = await repositories.customers.list(workspace.id, {
          status: 'active',
          sort: 'name_asc',
        });
        if (!active) return;
        setCustomers(activeCustomers);
        if (!activeCustomers.length) {
          setLoadStatus('noCustomers');
          return;
        }
        const preferred = activeCustomers.some((customer) => customer.id === initialCustomerId)
          ? initialCustomerId
          : activeCustomers.length === 1
            ? activeCustomers[0]?.id
            : undefined;
        reset({ ...DEFAULT_VALUES, customerId: preferred ?? '' });
        setLoadStatus('ready');
      } catch {
        if (active) setLoadStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [
    initialCustomerId,
    isEdit,
    loadAttempt,
    repositories.customers,
    repositories.vehicles,
    reset,
    vehicleId,
    workspace.id,
  ]);

  const persist = async (input: CreateVehicleInput) => {
    setIsSaving(true);
    try {
      const vehicle = isEdit
        ? await services.vehicles.update(workspace.id, vehicleId as string, {
            type: input.type,
            brand: input.brand,
            model: input.model,
            year: input.year,
            plate: input.plate,
            color: input.color,
            notes: input.notes,
          })
        : await services.vehicles.create(workspace.id, input, requestId);
      setPendingInput(null);
      setDuplicates([]);
      reset(DEFAULT_VALUES);
      showToast({
        title: isEdit ? 'Veículo atualizado com sucesso!' : 'Veículo cadastrado com sucesso!',
        variant: 'success',
      });
      router.replace({ pathname: '/vehicles/[id]', params: { id: vehicle.id } });
    } catch (error) {
      showToast({ title: getFriendlyError(error), variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const submit = handleSubmit(async (values) => {
    const input: CreateVehicleInput = {
      customerId: values.customerId,
      type: values.type,
      brand: values.brand,
      model: values.model,
      year: values.year.trim() ? Number(values.year) : null,
      plate: values.plate,
      color: values.color,
      notes: values.notes,
    };
    setIsSaving(true);
    try {
      const matches = await services.vehicles.findPotentialDuplicates(
        workspace.id,
        input,
        vehicleId,
      );
      if (matches.length) {
        setPendingInput(input);
        setDuplicates(matches);
        return;
      }
      await persist(input);
    } catch (error) {
      showToast({ title: getFriendlyError(error), variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  });

  if (loadStatus === 'loading') {
    return (
      <Screen>
        <LoadingState fullScreen label="Carregando dados do veículo…" />
      </Screen>
    );
  }

  if (loadStatus === 'missing') {
    return (
      <RouteState
        description="O veículo solicitado não existe neste workspace."
        headerTitle="Veículo"
        kind="notFound"
        title="Veículo não encontrado"
      />
    );
  }

  if (loadStatus === 'noCustomers') {
    return (
      <Screen contentContainerStyle={styles.page}>
        <Header onBack={requestLeave} title="Novo veículo" />
        <EmptyState
          action={{ label: 'Cadastrar cliente', onPress: () => router.push('/customers/new') }}
          description="Cadastre um cliente ativo antes de vincular um veículo."
          icon={Car}
          title="Nenhum cliente disponível"
        />
      </Screen>
    );
  }

  if (loadStatus === 'error') {
    return (
      <Screen contentContainerStyle={styles.page}>
        <Header onBack={requestLeave} title={isEdit ? 'Editar veículo' : 'Novo veículo'} />
        <EmptyState
          action={{
            label: 'Tentar novamente',
            onPress: () => {
              setLoadStatus('loading');
              setLoadAttempt((value) => value + 1);
            },
          }}
          description="Não foi possível consultar os dados locais."
          icon={Car}
          title="Não foi possível carregar o formulário."
        />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.page} keyboardAware scroll>
      <Header
        onBack={requestLeave}
        subtitle={
          isEdit
            ? 'O cliente responsável e os vínculos existentes serão preservados.'
            : 'Marca, modelo e cliente responsável são obrigatórios.'
        }
        title={isEdit ? 'Editar veículo' : 'Novo veículo'}
      />
      <Alert
        description="A placa é normalizada e possíveis duplicidades geram apenas um aviso."
        title="Cadastro offline"
        variant="info"
      />
      <VehicleForm
        control={control}
        customers={customers}
        disabled={isSaving}
        errors={errors}
        ownerLocked={isEdit || Boolean(initialCustomerId)}
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
          label={isEdit ? 'Salvar alterações' : 'Salvar veículo'}
          loading={isSaving}
          onPress={() => void submit()}
        />
      </View>
      <DuplicateVehicleDialog
        duplicates={duplicates}
        loading={isSaving}
        onCancel={() => {
          setPendingInput(null);
          setDuplicates([]);
        }}
        onContinue={() => {
          if (pendingInput) void persist(pendingInput);
        }}
        onView={(id) => {
          setPendingInput(null);
          setDuplicates([]);
          router.push({ pathname: '/vehicles/[id]', params: { id } });
        }}
        visible={duplicates.length > 0}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 40 },
  actions: { gap: 10 },
});
