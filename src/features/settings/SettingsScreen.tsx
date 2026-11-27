import {
  Bell,
  Cloud,
  DatabaseBackup,
  Fingerprint,
  Info,
  LockKeyhole,
  MessageCircle,
  Palette,
  RefreshCw,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader, SectionHeader, SettingsListItem } from '@/components/navigation';
import { AppText, Card, Screen } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

export function SettingsScreen() {
  const router = useRouter();
  const { preference } = useTheme();
  const themeLabel = { light: 'Claro', dark: 'Escuro', system: 'Sistema' }[preference];

  return (
    <Screen contentContainerStyle={styles.page} safeAreaEdges={['top', 'left', 'right']} scroll>
      <AppHeader
        showNotifications={false}
        subtitle="Preferências e gerenciamento do aplicativo"
        title="Ajustes"
      />
      <SettingsSection title="Preferências">
        <SettingsListItem
          icon={Palette}
          onPress={() => router.push('/settings/appearance')}
          title="Aparência"
          value={themeLabel}
        />
        <SettingsListItem
          icon={Bell}
          onPress={() => router.push('/settings/notifications')}
          title="Notificações"
          description="Lembretes e avisos"
        />
        <SettingsListItem
          icon={MessageCircle}
          onPress={() => router.push('/settings/collections' as never)}
          title="Mensagens de cobrança"
          description="Modelos para WhatsApp"
        />
      </SettingsSection>
      <SettingsSection title="Segurança">
        <SettingsListItem
          icon={LockKeyhole}
          onPress={() => router.push('/settings/security')}
          title="Proteção do aplicativo"
          description="Indisponível nesta etapa"
        />
        <SettingsListItem
          disabled
          icon={Fingerprint}
          title="Biometria"
          description="Será habilitada com a autenticação"
        />
      </SettingsSection>
      <SettingsSection title="Dados">
        <SettingsListItem
          icon={DatabaseBackup}
          onPress={() => router.push('/settings/backup')}
          title="Backup e restauração"
          description="Indisponível nesta etapa"
        />
        <SettingsListItem
          disabled
          icon={RefreshCw}
          title="Sincronização"
          description="Será implementada no Prompt 19"
        />
        <SettingsListItem
          disabled
          icon={Cloud}
          title="Nuvem"
          description="Nenhuma conta conectada"
        />
      </SettingsSection>
      <SettingsSection title="Informações">
        <SettingsListItem
          icon={Info}
          onPress={() => router.push('/settings/about')}
          title="Sobre o Fiados Moreira"
        />
        <AppText color="textMuted" variant="caption">
          Política de privacidade ainda não disponível.
        </AppText>
      </SettingsSection>
    </Screen>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      <Card variant="outlined">{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({ page: { gap: 24, paddingBottom: 32 }, section: { gap: 10 } });
