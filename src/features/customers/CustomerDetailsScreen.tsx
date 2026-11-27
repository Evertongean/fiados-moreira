import type { CustomerRow, VehicleRow } from '@/database/schema';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Archive,
  Car,
  History,
  MessageCircle,
  Pencil,
  ReceiptText,
  RotateCcw,
  UserRound,
  WalletCards,
} from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RouteState } from '@/components/layouts/RouteState';
import { PageHeader, SectionHeader } from '@/components/navigation';
import {
  Alert,
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  LoadingState,
  Screen,
  SearchInput,
  useToast,
} from '@/components/ui';
import { CustomerFinancialSummary } from '@/features/customers/components/CustomerFinancialSummary';
import type { CustomerHistorySummary } from '@/features/customers/domain/customerTypes';
import { COLLECTION_TEMPLATE_LABELS } from '@/features/collections/domain/collectionMessages';
import type { CollectionAttempt } from '@/features/collections/domain/collectionTypes';
import { DebtListItem } from '@/features/debts/components/DebtListItem';
import type { DebtOverview } from '@/features/debts/domain/debtTypes';
import { formatPaymentInstant } from '@/features/payments/domain/paymentUtils';
import { VehicleListItem } from '@/features/vehicles/components/VehicleListItem';
import { vehicleMatchesQuery } from '@/features/vehicles/domain/vehicleUtils';
import { useDatabase } from '@/hooks/useDatabase';
import { useTheme } from '@/hooks/useTheme';
import { getCivilDate } from '@/utils/date';
import { formatBrazilianPhone } from '@/utils/phone';
import { getRouteId } from '@/utils/routes';

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
}

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

export function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const customerId = getRouteId(id);

  if (!customerId) {
    return (
      <RouteState
        description="O identificador do cliente está ausente ou possui formato inválido."
        headerTitle="Cliente"
        kind="invalid"
        title="Cliente inválido"
      />
    );
  }

  return <CustomerDetailsContent customerId={customerId} />;
}

function CustomerDetailsContent({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { tokens } = useTheme();
  const { workspace, repositories, services } = useDatabase();
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [summary, setSummary] = useState<CustomerHistorySummary | null>(null);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [debts, setDebts] = useState<DebtOverview[]>([]);
  const [collectionAttempts, setCollectionAttempts] = useState<CollectionAttempt[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [paymentSelectionOpen, setPaymentSelectionOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setStatus('loading');
    try {
      const record = await repositories.customers.findById(workspace.id, customerId);
      if (requestVersion.current !== version) return;
      if (!record) {
        setStatus('missing');
        return;
      }
      const [financial, customerVehicles, customerDebts, attempts] = await Promise.all([
        repositories.customerHistory.getSummary(
          workspace.id,
          customerId,
          getCivilDate(new Date(), workspace.timezone),
        ),
        repositories.vehicles.listByCustomer(workspace.id, customerId, { status: 'all' }),
        repositories.debts.listOverview(workspace.id, {
          customerId,
          timezone: workspace.timezone,
        }),
        repositories.collections.listAttempts(workspace.id, customerId),
      ]);
      if (requestVersion.current !== version) return;
      setCustomer(record);
      setSummary(financial);
      setVehicles(customerVehicles);
      setDebts(customerDebts);
      setCollectionAttempts(attempts);
      setStatus('ready');
    } catch {
      if (requestVersion.current === version) setStatus('error');
    }
  }, [
    customerId,
    repositories.customers,
    repositories.customerHistory,
    repositories.collections,
    repositories.debts,
    repositories.vehicles,
    workspace.id,
    workspace.timezone,
  ]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestVersion.current += 1;
      };
    }, [load]),
  );

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState fullScreen label="Carregando cliente…" />
      </Screen>
    );
  }

  if (status === 'missing') {
    return (
      <RouteState
        description="Este cliente não existe ou pertence a outro workspace."
        headerTitle="Perfil do cliente"
        kind="notFound"
        title="Cliente não encontrado"
      />
    );
  }

  if (status === 'error' || !customer || !summary) {
    return (
      <Screen contentContainerStyle={styles.page}>
        <PageHeader fallbackRoute="/customers" title="Perfil do cliente" />
        <EmptyState
          action={{ label: 'Tentar novamente', onPress: () => void load() }}
          description="Não foi possível consultar os dados locais."
          icon={UserRound}
          title="Não foi possível carregar o cliente."
        />
      </Screen>
    );
  }

  const isArchived = Boolean(customer.archivedAt);
  const visibleVehicles = vehicleSearch.trim()
    ? vehicles.filter((vehicle) => vehicleMatchesQuery(vehicle, vehicleSearch))
    : vehicles;
  const payableDebts = debts.filter(
    (debt) => debt.status.financialStatus !== 'canceled' && debt.summary.pendingCents > 0,
  );
  const requestPayment = () => {
    const onlyDebt = payableDebts[0];
    if (payableDebts.length === 1 && onlyDebt) {
      router.push({ pathname: '/debts/[id]/payment', params: { id: onlyDebt.id } });
      return;
    }
    if (payableDebts.length > 1) setPaymentSelectionOpen((value) => !value);
  };
  const mutateArchive = async () => {
    setIsMutating(true);
    try {
      if (isArchived) {
        await services.customers.restore(workspace.id, customer.id);
        showToast({ title: 'Cliente restaurado com sucesso!', variant: 'success' });
      } else {
        await services.customers.archive(workspace.id, customer.id);
        showToast({ title: 'Cliente arquivado com sucesso!', variant: 'success' });
      }
      setConfirmVisible(false);
      await load();
    } catch (error) {
      const hasDebt =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'CUSTOMER_HAS_OUTSTANDING_DEBT';
      showToast({
        title: hasDebt
          ? 'Este cliente possui fiados em aberto. Regularize o saldo antes de arquivá-lo.'
          : isArchived
            ? 'Não foi possível restaurar este cliente.'
            : 'Não foi possível arquivar este cliente.',
        variant: hasDebt ? 'warning' : 'error',
      });
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.page} scroll>
      <PageHeader
        fallbackRoute="/customers"
        rightAction={
          <Button
            icon={Pencil}
            label="Editar"
            onPress={() =>
              router.push({ pathname: '/customers/[id]/edit', params: { id: customer.id } })
            }
            size="sm"
            variant="ghost"
          />
        }
        title="Perfil do cliente"
      />
      <Card variant="outlined">
        <View style={styles.profile}>
          <Avatar name={customer.name} size="xl" />
          <View style={styles.profileCopy}>
            <AppText variant="h3">{customer.name}</AppText>
            {customer.phone ? (
              <AppText color="textSecondary">{formatBrazilianPhone(customer.phone)}</AppText>
            ) : null}
            <Badge
              label={isArchived ? 'Cliente arquivado' : 'Cliente ativo'}
              variant={isArchived ? 'warning' : 'success'}
            />
            <AppText color="textMuted" variant="caption">
              Cadastrado em {formatDate(customer.createdAt)}
            </AppText>
          </View>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader
          description="Valores reais calculados a partir dos fiados e pagamentos válidos."
          title="Resumo financeiro"
        />
        <CustomerFinancialSummary summary={summary} timezone={workspace.timezone} />
      </View>

      <Card variant="outlined">
        <View style={styles.info}>
          <SectionHeader title="Informações cadastrais" />
          <InfoRow label="Nome" value={customer.name} />
          <InfoRow label="Telefone" value={formatBrazilianPhone(customer.phone)} />
          <InfoRow label="WhatsApp" value={formatBrazilianPhone(customer.whatsapp)} />
          <InfoRow label="Endereço" value={customer.address} />
          <InfoRow label="Observações" value={customer.notes} />
          <InfoRow label="Última atualização" value={formatDate(customer.updatedAt)} />
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Ações rápidas" />
        <View style={styles.actions}>
          <Button
            fullWidth
            icon={Pencil}
            label="Editar cliente"
            onPress={() =>
              router.push({ pathname: '/customers/[id]/edit', params: { id: customer.id } })
            }
            variant="secondary"
          />
          <Button
            disabled={isArchived}
            fullWidth
            label={isArchived ? 'Novo fiado — restaure o cliente' : 'Novo fiado'}
            onPress={() =>
              router.push({ pathname: '/debts/new', params: { customerId: customer.id } })
            }
          />
          <Button
            fullWidth
            label={isArchived ? 'Adicionar veículo — restaure o cliente' : 'Adicionar veículo'}
            onPress={() =>
              router.push({ pathname: '/vehicles/new', params: { customerId: customer.id } })
            }
            disabled={isArchived}
            icon={Car}
            variant="secondary"
          />
          <Button
            disabled={!payableDebts.length}
            fullWidth
            icon={WalletCards}
            label={payableDebts.length ? 'Registrar pagamento' : 'Nenhum fiado com saldo pendente'}
            onPress={requestPayment}
          />
          <Button
            disabled={!payableDebts.length}
            fullWidth
            icon={MessageCircle}
            label={
              payableDebts.length ? 'Cobrar saldo total pelo WhatsApp' : 'Nenhum saldo para cobrar'
            }
            onPress={() =>
              router.push({
                pathname: '/collections/compose',
                params: { scope: 'customer', id: customer.id },
              } as never)
            }
            variant="outline"
          />
          <Button
            fullWidth
            icon={History}
            label="Consultar histórico"
            onPress={() =>
              router.push({ pathname: '/customers/[id]/history', params: { id: customer.id } })
            }
            variant="outline"
          />
        </View>
        {paymentSelectionOpen && payableDebts.length > 1 ? (
          <Card variant="highlighted">
            <View style={styles.paymentSelection}>
              <SectionHeader
                description="Escolha o fiado que receberá o pagamento."
                title="Selecionar fiado"
              />
              {payableDebts.map((debt) => (
                <DebtListItem
                  debt={debt}
                  key={debt.id}
                  onPress={() =>
                    router.push({ pathname: '/debts/[id]/payment', params: { id: debt.id } })
                  }
                />
              ))}
            </View>
          </Card>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader
          description={
            collectionAttempts.length
              ? `Última tentativa em ${formatPaymentInstant(collectionAttempts[0]?.attemptedAt ?? '', workspace.timezone)}`
              : 'Abrir o WhatsApp registra uma tentativa, não um envio.'
          }
          title="Tentativas de cobrança"
        />
        {collectionAttempts.length ? (
          <Card variant="outlined">
            <View style={styles.collectionHistory}>
              {collectionAttempts.map((attempt) => (
                <View key={attempt.id} style={styles.collectionAttempt}>
                  <MessageCircle color={tokens.colors.primary} size={18} />
                  <View style={styles.collectionAttemptCopy}>
                    <AppText variant="bodySmall" weight="semibold">
                      {COLLECTION_TEMPLATE_LABELS[attempt.templateType]}
                    </AppText>
                    <AppText color="textMuted" variant="caption">
                      {attempt.debtDescription ?? 'Saldo total do cliente'} ·{' '}
                      {formatPaymentInstant(attempt.attemptedAt, workspace.timezone)}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        ) : (
          <EmptyState
            description="As tentativas feitas por este aplicativo aparecerão aqui."
            icon={MessageCircle}
            title="Nenhuma tentativa registrada"
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          action={
            <Button
              disabled={isArchived}
              label="Adicionar"
              onPress={() =>
                router.push({ pathname: '/debts/new', params: { customerId: customer.id } })
              }
              size="sm"
              variant="outline"
            />
          }
          description={`${debts.length} ${debts.length === 1 ? 'fiado vinculado' : 'fiados vinculados'}`}
          title="Fiados"
        />
        {debts.length ? (
          <View style={styles.debtList}>
            {debts.map((debt) => (
              <DebtListItem
                debt={debt}
                key={debt.id}
                onPress={() => router.push({ pathname: '/debts/[id]', params: { id: debt.id } })}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            action={
              isArchived
                ? undefined
                : {
                    label: 'Registrar fiado',
                    onPress: () =>
                      router.push({ pathname: '/debts/new', params: { customerId: customer.id } }),
                  }
            }
            description={
              isArchived
                ? 'Restaure o cliente para registrar um novo fiado.'
                : 'Os fiados deste cliente aparecerão aqui.'
            }
            icon={ReceiptText}
            title="Nenhum fiado cadastrado"
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          action={
            <Button
              disabled={isArchived}
              label="Adicionar"
              onPress={() =>
                router.push({ pathname: '/vehicles/new', params: { customerId: customer.id } })
              }
              size="sm"
              variant="outline"
            />
          }
          description={`${vehicles.length} ${vehicles.length === 1 ? 'veículo vinculado' : 'veículos vinculados'}`}
          title="Veículos"
        />
        {vehicles.length ? (
          <SearchInput
            onChangeText={setVehicleSearch}
            placeholder="Buscar placa, marca ou modelo..."
            value={vehicleSearch}
          />
        ) : null}
        {visibleVehicles.length ? (
          <View style={styles.vehicleList}>
            {visibleVehicles.map((vehicle) => (
              <VehicleListItem
                key={vehicle.id}
                onPress={() =>
                  router.push({ pathname: '/vehicles/[id]', params: { id: vehicle.id } })
                }
                vehicle={vehicle}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            action={
              vehicleSearch.trim()
                ? { label: 'Limpar pesquisa', onPress: () => setVehicleSearch('') }
                : isArchived
                  ? undefined
                  : {
                      label: 'Adicionar veículo',
                      onPress: () =>
                        router.push({
                          pathname: '/vehicles/new',
                          params: { customerId: customer.id },
                        }),
                    }
            }
            description={
              vehicleSearch.trim()
                ? 'Tente pesquisar outra placa, marca ou modelo.'
                : isArchived
                  ? 'Restaure o cliente para cadastrar um veículo.'
                  : 'Cadastre o primeiro veículo deste cliente.'
            }
            icon={Car}
            title={vehicleSearch.trim() ? 'Nenhum veículo encontrado' : 'Nenhum veículo cadastrado'}
          />
        )}
      </View>

      {isArchived ? (
        <Alert
          description="Restaure o cadastro para permitir novos fiados quando o módulo financeiro estiver disponível."
          title="Cliente arquivado"
          variant="warning"
        />
      ) : null}
      <Button
        fullWidth
        icon={isArchived ? RotateCcw : Archive}
        label={isArchived ? 'Restaurar cliente' : 'Arquivar cliente'}
        onPress={() => setConfirmVisible(true)}
        variant={isArchived ? 'secondary' : 'destructive'}
      />
      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel={isArchived ? 'Restaurar cliente' : 'Arquivar cliente'}
        description={
          isArchived
            ? 'O cliente voltará a aparecer entre os ativos, preservando todos os vínculos anteriores.'
            : 'Este cliente deixará de aparecer na lista de ativos, mas seu cadastro e histórico serão preservados.'
        }
        destructive={!isArchived}
        loading={isMutating}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={() => void mutateArchive()}
        title={isArchived ? 'Restaurar cliente?' : 'Arquivar cliente?'}
        visible={confirmVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 40 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  profileCopy: { flex: 1, alignItems: 'flex-start', gap: 5 },
  section: { gap: 12 },
  info: { gap: 14 },
  infoRow: { gap: 2 },
  actions: { gap: 10 },
  paymentSelection: { gap: 10 },
  vehicleList: { gap: 10 },
  debtList: { gap: 10 },
  collectionHistory: { gap: 12 },
  collectionAttempt: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  collectionAttemptCopy: { flex: 1, gap: 2 },
});
