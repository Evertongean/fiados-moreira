import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Save, UserRoundPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert as NativeAlert, BackHandler, StyleSheet, View } from 'react-native';

import { RouteState } from '@/components/layouts/RouteState';
import {
  Alert,
  AppText,
  Button,
  Card,
  EmptyState,
  Header,
  LoadingState,
  Screen,
  useToast,
} from '@/components/ui';
import { CustomerForm } from '@/features/customers/components/CustomerForm';
import { DuplicateCustomerDialog } from '@/features/customers/components/DuplicateCustomerDialog';
import {
  customerFormSchema,
  type CreateCustomerInput,
  type CustomerFormValues,
} from '@/features/customers/domain/customerSchemas';
import type { PotentialDuplicate } from '@/features/customers/domain/customerTypes';
import { useDatabase } from '@/hooks/useDatabase';
import { useTheme } from '@/hooks/useTheme';
import { formatBrazilianPhone } from '@/utils/phone';
import { createUuid } from '@/utils/uuid';

export interface CustomerFormScreenProps {
  mode: 'create' | 'edit';
  customerId?: string;
}

const DEFAULT_VALUES: CustomerFormValues = {
  name: '',
  phone: '',
  whatsapp: '',
  address: '',
  notes: '',
  usePhoneForWhatsapp: true,
};

function getFriendlyError(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = String(error.code);
    if (code === 'CUSTOMER_NOT_FOUND') return 'Este cliente não foi encontrado.';
    if (code === 'CUSTOMER_VALIDATION_ERROR') return 'Revise os dados informados.';
    if (code === 'IDEMPOTENCY_CONFLICT')
      return 'Não foi possível repetir esta tentativa com dados diferentes.';
  }
  return 'Não foi possível salvar o cliente. Tente novamente.';
}

export function CustomerFormScreen({ mode, customerId }: CustomerFormScreenProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const { showToast } = useToast();
  const { workspace, repositories, services } = useDatabase();
  const [requestId] = useState(createUuid);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>(
    mode === 'edit' ? 'loading' : 'ready',
  );
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [duplicates, setDuplicates] = useState<PotentialDuplicate[]>([]);
  const [pendingInput, setPendingInput] = useState<CreateCustomerInput | null>(null);
  const isEdit = mode === 'edit';
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CustomerFormValues>({
    defaultValues: DEFAULT_VALUES,
    mode: 'onBlur',
    resolver: zodResolver(customerFormSchema),
  });

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/debts');
  };

  const requestLeave = () => {
    if (!isDirty || isSaving) {
      leave();
      return;
    }
    NativeAlert.alert(
      'Descartar alterações?',
      'As informações preenchidas ainda não foram salvas.',
      [
        { text: 'Continuar editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: leave },
      ],
    );
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestLeave();
      return true;
    });
    return () => subscription.remove();
  });

  useEffect(() => {
    if (!isEdit || !customerId) return;
    let active = true;
    void repositories.customers.findById(workspace.id, customerId).then(
      (customer) => {
        if (!active) return;
        if (!customer) {
          setLoadStatus('missing');
          return;
        }
        reset({
          name: customer.name,
          phone: formatBrazilianPhone(customer.phone) ?? '',
          whatsapp: formatBrazilianPhone(customer.whatsapp) ?? '',
          address: customer.address ?? '',
          notes: customer.notes ?? '',
          usePhoneForWhatsapp: !customer.whatsapp || customer.phone === customer.whatsapp,
        });
        setLoadStatus('ready');
      },
      () => {
        if (active) setLoadStatus('error');
      },
    );
    return () => {
      active = false;
    };
  }, [customerId, isEdit, loadAttempt, repositories.customers, reset, workspace.id]);

  const persist = async (input: CreateCustomerInput) => {
    setIsSaving(true);
    try {
      const customer = isEdit
        ? await services.customers.update(workspace.id, customerId as string, input)
        : await services.customers.create(workspace.id, input, requestId);
      setPendingInput(null);
      setDuplicates([]);
      reset({ ...DEFAULT_VALUES, name: customer.name });
      showToast({
        title: isEdit
          ? 'Dados do cliente atualizados com sucesso!'
          : 'Cliente cadastrado com sucesso!',
        variant: 'success',
      });
      router.replace({ pathname: '/customers/[id]', params: { id: customer.id } });
    } catch (error) {
      showToast({ title: getFriendlyError(error), variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const submit = handleSubmit(async (values) => {
    const input: CreateCustomerInput = {
      name: values.name,
      phone: values.phone,
      whatsapp: values.usePhoneForWhatsapp ? values.phone : values.whatsapp,
      address: values.address,
      notes: values.notes,
    };
    setIsSaving(true);
    try {
      const matches = await services.customers.findPotentialDuplicates(
        workspace.id,
        input,
        customerId,
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
        <LoadingState fullScreen label="Carregando cliente…" />
      </Screen>
    );
  }

  if (loadStatus === 'missing' || (isEdit && !customerId)) {
    return (
      <RouteState
        description="O cadastro solicitado não existe neste workspace."
        headerTitle="Cliente"
        kind="notFound"
        title="Cliente não encontrado"
      />
    );
  }

  if (loadStatus === 'error') {
    return (
      <Screen contentContainerStyle={styles.page}>
        <Header onBack={requestLeave} title="Editar cliente" />
        <EmptyState
          action={{
            label: 'Tentar novamente',
            onPress: () => {
              setLoadStatus('loading');
              setLoadAttempt((value) => value + 1);
            },
          }}
          description="Não foi possível consultar os dados locais."
          icon={UserRoundPlus}
          title="Não foi possível carregar o cliente."
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
            ? 'Atualize somente as informações necessárias.'
            : 'O nome é o único campo obrigatório.'
        }
        title={isEdit ? 'Editar cliente' : 'Novo cliente'}
      />
      {!isEdit ? (
        <Card variant="highlighted">
          <View style={styles.intro}>
            <View
              style={[
                styles.icon,
                { backgroundColor: tokens.colors.surface, borderRadius: tokens.radius.full },
              ]}
            >
              <UserRoundPlus color={tokens.colors.primary} size={24} />
            </View>
            <View style={styles.introCopy}>
              <AppText variant="label" weight="semibold">
                Cadastro rápido e offline
              </AppText>
              <AppText color="textSecondary" variant="bodySmall">
                Os dados serão salvos no banco local do aplicativo.
              </AppText>
            </View>
          </View>
        </Card>
      ) : null}
      <Alert
        description="Não informe CPF, RG, dados bancários ou outras informações sensíveis nas observações."
        title="Privacidade do cliente"
        variant="info"
      />
      <CustomerForm control={control} disabled={isSaving} errors={errors} />
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
          label={isEdit ? 'Salvar alterações' : 'Salvar cliente'}
          loading={isSaving}
          onPress={() => void submit()}
        />
      </View>
      <DuplicateCustomerDialog
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
          router.push({ pathname: '/customers/[id]', params: { id } });
        }}
        visible={duplicates.length > 0}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 40 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  introCopy: { flex: 1, gap: 2 },
  actions: { gap: 10 },
});
