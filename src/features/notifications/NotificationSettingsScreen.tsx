import { useFocusEffect } from 'expo-router';
import { Bell, ShieldAlert } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { PageHeader, SectionHeader } from '@/components/navigation';
import {
  Alert,
  Button,
  Card,
  Input,
  LoadingState,
  Screen,
  Switch,
  useToast,
} from '@/components/ui';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPermissionState,
  type NotificationPreferences,
} from '@/features/notifications/domain/notificationTypes';
import { useNotifications } from '@/features/notifications/NotificationProvider';
import { useDatabase } from '@/hooks/useDatabase';

const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function NotificationSettingsScreen() {
  const { showToast } = useToast();
  const { workspace, services } = useDatabase();
  const { refreshNotifications } = useNotifications();
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [permission, setPermission] = useState<NotificationPermissionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stored, currentPermission] = await Promise.all([
        services.reminders.getPreferences(workspace.id),
        services.reminders.getPermission(),
      ]);
      setPreferences(stored);
      setPermission(currentPermission);
    } finally {
      setLoading(false);
    }
  }, [services.reminders, workspace.id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const update = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) => setPreferences((current) => ({ ...current, [key]: value }));
  const requestPermission = async () => {
    const next = await services.reminders.requestPermission();
    setPermission(next);
    if (next.granted) {
      await refreshNotifications();
      showToast({ title: 'Notificações ativadas.', variant: 'success' });
    }
  };
  const save = async () => {
    setSaving(true);
    try {
      const saved = await services.reminders.savePreferences(workspace.id, preferences);
      setPreferences(saved);
      await refreshNotifications();
      showToast({ title: 'Preferências salvas.', variant: 'success' });
    } catch {
      showToast({ title: 'Não foi possível salvar as preferências.', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };
  if (loading)
    return (
      <Screen>
        <LoadingState fullScreen label="Carregando preferências…" />
      </Screen>
    );
  return (
    <Screen contentContainerStyle={styles.page} keyboardAware scroll>
      <PageHeader fallbackRoute="/settings" title="Notificações" />
      <Alert
        description={
          !permission?.granted
            ? permission?.canAskAgain === false
              ? 'A permissão foi bloqueada. Abra os ajustes do sistema para ativá-la.'
              : 'Ative somente quando quiser receber lembretes neste dispositivo.'
            : 'Os agendamentos são mantidos no dispositivo e funcionam sem internet.'
        }
        title={permission?.granted ? 'Notificações locais ativas' : 'Permissão necessária'}
        variant={permission?.granted ? 'success' : 'warning'}
      />
      {!permission?.granted ? (
        <Button
          icon={permission?.canAskAgain === false ? ShieldAlert : Bell}
          label={
            permission?.canAskAgain === false ? 'Abrir ajustes do sistema' : 'Ativar notificações'
          }
          onPress={() =>
            permission?.canAskAgain === false
              ? void Linking.openSettings()
              : void requestPermission()
          }
        />
      ) : null}
      <View style={styles.section}>
        <SectionHeader title="Categorias" />
        <Card variant="outlined">
          <View style={styles.fields}>
            <Switch
              description="Padrão: 1 dia antes."
              label="Antes do vencimento"
              onValueChange={(value) => update('beforeDueEnabled', value)}
              value={preferences.beforeDueEnabled}
            />
            <Input
              keyboardType="number-pad"
              label="Dias de antecedência"
              onChangeText={(value) => update('beforeDueDays', toNumber(value, 1))}
              value={String(preferences.beforeDueDays)}
            />
            <Switch
              label="No dia do vencimento"
              onValueChange={(value) => update('dueDateEnabled', value)}
              value={preferences.dueDateEnabled}
            />
            <Switch
              description="Repete enquanto houver saldo."
              label="Cobranças atrasadas"
              onValueChange={(value) => update('overdueEnabled', value)}
              value={preferences.overdueEnabled}
            />
            <Input
              keyboardType="number-pad"
              label="Repetir atraso a cada quantos dias"
              onChangeText={(value) => update('overdueIntervalDays', toNumber(value, 3))}
              value={String(preferences.overdueIntervalDays)}
            />
            <Switch
              description="Segunda-feira por padrão."
              label="Resumo semanal"
              onValueChange={(value) => update('weeklyEnabled', value)}
              value={preferences.weeklyEnabled}
            />
            <Input
              helpText="1 = domingo, 2 = segunda, …, 7 = sábado"
              keyboardType="number-pad"
              label="Dia do resumo semanal"
              onChangeText={(value) => update('weeklyWeekday', toNumber(value, 2))}
              value={String(preferences.weeklyWeekday)}
            />
          </View>
        </Card>
      </View>
      <View style={styles.section}>
        <SectionHeader title="Horário e privacidade" />
        <Card variant="outlined">
          <View style={styles.fields}>
            <View style={styles.timeRow}>
              <Input
                keyboardType="number-pad"
                label="Hora"
                onChangeText={(value) => update('hour', toNumber(value, 8))}
                value={String(preferences.hour).padStart(2, '0')}
              />
              <Input
                keyboardType="number-pad"
                label="Minuto"
                onChangeText={(value) => update('minute', toNumber(value, 0))}
                value={String(preferences.minute).padStart(2, '0')}
              />
            </View>
            <Switch
              description="Oculta cliente, serviço e valores na tela do sistema."
              label="Ocultar dados sensíveis"
              onValueChange={(value) => update('hideSensitiveContent', value)}
              value={preferences.hideSensitiveContent}
            />
          </View>
        </Card>
      </View>
      <Button fullWidth label="Salvar preferências" loading={saving} onPress={() => void save()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 36 },
  section: { gap: 10 },
  fields: { gap: 16 },
  timeRow: { flexDirection: 'row', gap: 12 },
});
