import { BellRing } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { PageHeader } from '@/components/navigation';
import { EmptyState, Screen } from '@/components/ui';

export function NotificationsScreen() {
  return (
    <Screen contentContainerStyle={styles.page}>
      <PageHeader title="Notificações" />
      <EmptyState
        description="Os lembretes de pagamento e avisos importantes aparecerão aqui quando essa funcionalidade estiver disponível."
        icon={BellRing}
        title="Você está em dia!"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ page: { gap: 20 } });
