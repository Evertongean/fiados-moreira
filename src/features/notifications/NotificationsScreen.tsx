import { useFocusEffect, useRouter } from 'expo-router';
import { BellRing, CheckCheck, Settings } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/navigation';
import { AppText, Button, Card, EmptyState, LoadingState, Screen } from '@/components/ui';
import type { ReminderListItem } from '@/features/notifications/domain/notificationTypes';
import { useNotifications } from '@/features/notifications/NotificationProvider';
import { useDatabase } from '@/hooks/useDatabase';
import { useTheme } from '@/hooks/useTheme';

const TYPE_LABELS = {
  before_due: 'Vencimento próximo',
  due_date: 'Vence hoje',
  overdue: 'Cobrança atrasada',
  custom: 'Lembrete personalizado',
} as const;

function formatSchedule(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value));
}

function getStatusLabel(item: ReminderListItem): string {
  if (item.status === 'delivered') return 'Entregue';
  if (item.status === 'failed') return 'Falhou';
  return 'Agendada';
}

export function NotificationsScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { workspace, repositories } = useDatabase();
  const { refreshNotifications } = useNotifications();
  const [items, setItems] = useState<ReminderListItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      await refreshNotifications();
      setItems(await repositories.reminders.listCenter(workspace.id));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [refreshNotifications, repositories.reminders, workspace.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const markAllRead = async () => {
    await repositories.reminders.markAllRead(workspace.id);
    await refreshNotifications();
    await load();
  };

  const open = async (item: ReminderListItem) => {
    if (item.status === 'delivered' && !item.readAt) {
      await repositories.reminders.markRead(workspace.id, item.id);
      await refreshNotifications();
    }
    router.push({ pathname: '/debts/[id]', params: { id: item.debtId } });
  };

  if (status === 'loading')
    return (
      <Screen>
        <LoadingState fullScreen label="Carregando notificações…" />
      </Screen>
    );

  return (
    <Screen
      contentContainerStyle={styles.page}
      scroll
      scrollViewProps={{
        refreshControl: (
          <RefreshControl
            onRefresh={() => {
              setRefreshing(true);
              void load().finally(() => setRefreshing(false));
            }}
            refreshing={refreshing}
            tintColor={tokens.colors.primary}
          />
        ),
      }}
    >
      <PageHeader
        rightAction={
          <Button
            icon={Settings}
            label="Configurar"
            onPress={() => router.push('/settings/notifications')}
            size="sm"
            variant="ghost"
          />
        }
        title="Notificações"
      />
      {status === 'error' ? (
        <EmptyState
          action={{ label: 'Tentar novamente', onPress: () => void load() }}
          description="Os dados locais continuam preservados."
          icon={BellRing}
          title="Não foi possível carregar os avisos"
        />
      ) : items.length === 0 ? (
        <EmptyState
          description="Avisos entregues e próximos lembretes aparecerão aqui."
          icon={BellRing}
          title="Nenhum aviso por enquanto"
        />
      ) : (
        <>
          {items.some((item) => item.status === 'delivered' && !item.readAt) ? (
            <Button
              icon={CheckCheck}
              label="Marcar tudo como lido"
              onPress={() => void markAllRead()}
              variant="secondary"
            />
          ) : null}
          <View style={styles.list}>
            {items.map((item) => {
              const unread = item.status === 'delivered' && !item.readAt;
              return (
                <Card
                  accessibilityLabel={`Abrir fiado: ${TYPE_LABELS[item.type]}`}
                  key={item.id}
                  onPress={() => void open(item)}
                  variant={unread ? 'highlighted' : 'outlined'}
                >
                  <View style={styles.itemHeader}>
                    <AppText weight="semibold">{TYPE_LABELS[item.type]}</AppText>
                    {unread ? (
                      <View
                        accessibilityLabel="Não lida"
                        style={[styles.dot, { backgroundColor: tokens.colors.primary }]}
                      />
                    ) : null}
                  </View>
                  <AppText color="textSecondary" variant="bodySmall">
                    {item.debtDescription}
                  </AppText>
                  <AppText color="textMuted" variant="caption">
                    {getStatusLabel(item)} em{' '}
                    {formatSchedule(item.deliveredAt ?? item.scheduledAt, workspace.timezone)}
                  </AppText>
                </Card>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 16, paddingBottom: 32 },
  list: { gap: 12 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
