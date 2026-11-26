import type { CustomerRow, VehicleRow } from '@/database/schema';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, Car, Pencil, ReceiptText, RotateCcw, UserRound } from 'lucide-react-native';
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
  useToast,
} from '@/components/ui';
import { VEHICLE_TYPE_LABELS } from '@/features/vehicles/domain/vehicleUtils';
import { DebtListItem } from '@/features/debts/components/DebtListItem';
import type { DebtOverview } from '@/features/debts/domain/debtTypes';
import { useDatabase } from '@/hooks/useDatabase';
import { useTheme } from '@/hooks/useTheme';
import { formatBrazilianPlate } from '@/utils/plate';
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

export function VehicleDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const vehicleId = getRouteId(id);

  if (!vehicleId) {
    return (
      <RouteState
        description="O identificador recebido está ausente ou possui formato inválido."
        headerTitle="Veículo"
        kind="invalid"
        title="Veículo inválido"
      />
    );
  }

  return <VehicleDetailsContent vehicleId={vehicleId} />;
}

function VehicleDetailsContent({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const { tokens } = useTheme();
  const { showToast } = useToast();
  const { workspace, repositories, services } = useDatabase();
  const [vehicle, setVehicle] = useState<VehicleRow | null>(null);
  const [owner, setOwner] = useState<CustomerRow | null>(null);
  const [debts, setDebts] = useState<DebtOverview[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setStatus('loading');
    try {
      const record = await repositories.vehicles.findById(workspace.id, vehicleId);
      if (requestVersion.current !== version) return;
      if (!record) {
        setStatus('missing');
        return;
      }
      const [customer, vehicleDebts] = await Promise.all([
        repositories.customers.findById(workspace.id, record.customerId),
        repositories.debts.listByVehicle(workspace.id, vehicleId, {
          timezone: workspace.timezone,
        }),
      ]);
      if (requestVersion.current !== version) return;
      if (!customer) {
        setStatus('error');
        return;
      }
      setVehicle(record);
      setOwner(customer);
      setDebts(vehicleDebts);
      setStatus('ready');
    } catch {
      if (requestVersion.current === version) setStatus('error');
    }
  }, [
    repositories.customers,
    repositories.debts,
    repositories.vehicles,
    vehicleId,
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
        <LoadingState fullScreen label="Carregando veículo…" />
      </Screen>
    );
  }

  if (status === 'missing') {
    return (
      <RouteState
        description="Este veículo não existe ou pertence a outro workspace."
        headerTitle="Veículo"
        kind="notFound"
        title="Veículo não encontrado"
      />
    );
  }

  if (status === 'error' || !vehicle || !owner) {
    return (
      <Screen contentContainerStyle={styles.page}>
        <PageHeader fallbackRoute="/customers" title="Detalhes do veículo" />
        <EmptyState
          action={{ label: 'Tentar novamente', onPress: () => void load() }}
          description="Não foi possível consultar os dados locais."
          icon={Car}
          title="Não foi possível carregar o veículo."
        />
      </Screen>
    );
  }

  const isArchived = Boolean(vehicle.archivedAt);
  const mutateArchive = async () => {
    setIsMutating(true);
    try {
      if (isArchived) {
        await services.vehicles.restore(workspace.id, vehicle.id);
        showToast({ title: 'Veículo restaurado com sucesso!', variant: 'success' });
      } else {
        await services.vehicles.archive(workspace.id, vehicle.id);
        showToast({ title: 'Veículo arquivado com sucesso!', variant: 'success' });
      }
      setConfirmVisible(false);
      await load();
    } catch {
      showToast({
        title: isArchived
          ? 'Não foi possível restaurar este veículo.'
          : 'Não foi possível arquivar este veículo.',
        variant: 'error',
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
              router.push({ pathname: '/vehicles/[id]/edit', params: { id: vehicle.id } })
            }
            size="sm"
            variant="ghost"
          />
        }
        title="Detalhes do veículo"
      />
      <Card variant="outlined">
        <View style={styles.hero}>
          <Car color={tokens.colors.primary} size={34} />
          <View style={styles.heroCopy}>
            <AppText variant="h3">
              {vehicle.brand} {vehicle.model}
            </AppText>
            <AppText color="textSecondary">{VEHICLE_TYPE_LABELS[vehicle.type]}</AppText>
            <Badge
              label={isArchived ? 'Veículo arquivado' : 'Veículo ativo'}
              variant={isArchived ? 'warning' : 'success'}
            />
          </View>
        </View>
      </Card>

      <Card variant="outlined">
        <View style={styles.info}>
          <SectionHeader title="Informações do veículo" />
          <InfoRow label="Tipo" value={VEHICLE_TYPE_LABELS[vehicle.type]} />
          <InfoRow label="Marca" value={vehicle.brand} />
          <InfoRow label="Modelo" value={vehicle.model} />
          <InfoRow label="Ano" value={vehicle.year?.toString() ?? null} />
          <InfoRow label="Placa" value={formatBrazilianPlate(vehicle.plate)} />
          <InfoRow label="Cor" value={vehicle.color} />
          <InfoRow label="Observações" value={vehicle.notes} />
          <InfoRow label="Cadastrado em" value={formatDate(vehicle.createdAt)} />
          <InfoRow label="Última atualização" value={formatDate(vehicle.updatedAt)} />
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Cliente responsável" />
        <Card
          accessibilityLabel={`Abrir cliente ${owner.name}`}
          onPress={() => router.push({ pathname: '/customers/[id]', params: { id: owner.id } })}
          variant="outlined"
        >
          <View style={styles.owner}>
            <UserRound color={tokens.colors.primary} size={22} />
            <View style={styles.ownerCopy}>
              <AppText weight="semibold">{owner.name}</AppText>
              <AppText color="textMuted" variant="caption">
                {owner.archivedAt ? 'Cliente arquivado' : 'Ver perfil do cliente'}
              </AppText>
            </View>
          </View>
        </Card>
      </View>

      {isArchived ? (
        <Alert
          description="Restaure o veículo antes de selecioná-lo em um novo fiado."
          title="Veículo arquivado"
          variant="warning"
        />
      ) : null}
      <View style={styles.section}>
        <SectionHeader
          action={
            <Button
              disabled={isArchived || Boolean(owner.archivedAt)}
              label="Adicionar"
              onPress={() =>
                router.push({
                  pathname: '/debts/new',
                  params: { customerId: owner.id, vehicleId: vehicle.id },
                })
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
              isArchived || owner.archivedAt
                ? undefined
                : {
                    label: 'Registrar fiado',
                    onPress: () =>
                      router.push({
                        pathname: '/debts/new',
                        params: { customerId: owner.id, vehicleId: vehicle.id },
                      }),
                  }
            }
            description="Os fiados vinculados a este veículo aparecerão aqui."
            icon={ReceiptText}
            title="Nenhum fiado cadastrado"
          />
        )}
      </View>
      <Button
        fullWidth
        icon={isArchived ? RotateCcw : Archive}
        label={isArchived ? 'Restaurar veículo' : 'Arquivar veículo'}
        onPress={() => setConfirmVisible(true)}
        variant={isArchived ? 'secondary' : 'destructive'}
      />
      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel={isArchived ? 'Restaurar veículo' : 'Arquivar veículo'}
        description={
          isArchived
            ? 'O veículo voltará a ficar disponível, preservando todos os vínculos anteriores.'
            : 'O veículo deixará de aparecer entre os ativos, mas seu cadastro e histórico financeiro serão preservados.'
        }
        destructive={!isArchived}
        loading={isMutating}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={() => void mutateArchive()}
        title={isArchived ? 'Restaurar veículo?' : 'Arquivar veículo?'}
        visible={confirmVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 40 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroCopy: { flex: 1, alignItems: 'flex-start', gap: 5 },
  section: { gap: 12 },
  info: { gap: 14 },
  infoRow: { gap: 2 },
  owner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ownerCopy: { flex: 1, gap: 2 },
  debtList: { gap: 10 },
});
