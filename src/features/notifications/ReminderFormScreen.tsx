import { useLocalSearchParams, useRouter } from 'expo-router';
import { BellPlus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { PageHeader } from '@/components/navigation';
import { Alert, Button, Card, Input, Screen, useToast } from '@/components/ui';
import { getWorkspaceInstant } from '@/features/notifications/domain/reminderDates';
import { useNotifications } from '@/features/notifications/NotificationProvider';
import { useDatabase } from '@/hooks/useDatabase';
import { parseCivilDate } from '@/utils/date';
import { getRouteId } from '@/utils/routes';

export function ReminderFormScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const debtId = getRouteId(params.id);
  const router = useRouter();
  const { showToast } = useToast();
  const { workspace, services } = useDatabase();
  const { refreshNotifications } = useNotifications();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('08:00');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!debtId) return;
    const civilDate = parseCivilDate(date);
    const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
    const hour = Number(match?.[1]);
    const minute = Number(match?.[2]);
    if (!civilDate || !match || hour > 23 || minute > 59) {
      setError('Informe data e horário válidos.');
      return;
    }
    const scheduledAt = getWorkspaceInstant(civilDate, hour, minute, workspace.timezone);
    if (scheduledAt <= new Date()) {
      setError('Escolha um horário futuro.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let permission = await services.reminders.getPermission();
      if (!permission.granted && permission.canAskAgain) {
        permission = await services.reminders.requestPermission();
      }
      if (!permission.granted) {
        setError('Ative as notificações nos ajustes do sistema.');
        return;
      }
      await services.reminders.createCustom(workspace.id, debtId, scheduledAt);
      await refreshNotifications();
      showToast({ title: 'Lembrete criado.', variant: 'success' });
      router.back();
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message === 'DEBT_NOT_ELIGIBLE'
          ? 'Este fiado não possui saldo pendente.'
          : 'Não foi possível criar o lembrete.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.page} keyboardAware scroll>
      <PageHeader title="Criar lembrete" />
      <Alert
        description="O aviso ficará somente neste dispositivo. Fiados sem vencimento também podem receber lembretes personalizados."
        title="Lembrete local"
        variant="info"
      />
      <Card variant="outlined">
        <Input
          autoCapitalize="none"
          keyboardType="number-pad"
          label="Data *"
          maxLength={10}
          onChangeText={setDate}
          placeholder="DD/MM/AAAA"
          value={date}
        />
        <Input
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          label="Horário *"
          maxLength={5}
          onChangeText={setTime}
          placeholder="08:00"
          value={time}
        />
      </Card>
      {error ? <Alert description={error} title="Verifique o lembrete" variant="error" /> : null}
      <Button
        disabled={!debtId}
        fullWidth
        icon={BellPlus}
        label="Criar lembrete"
        loading={saving}
        onPress={() => void save()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ page: { gap: 18, paddingBottom: 32 } });
