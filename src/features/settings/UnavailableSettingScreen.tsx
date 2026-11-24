import { Construction } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { PageHeader } from '@/components/navigation';
import { EmptyState, Screen } from '@/components/ui';

export function UnavailableSettingScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Screen contentContainerStyle={styles.page}>
      <PageHeader fallbackRoute="/settings" title={title} />
      <EmptyState
        description={description}
        icon={Construction}
        title="Funcionalidade ainda indisponível"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ page: { gap: 20 } });
