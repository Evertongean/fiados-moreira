import { ChartNoAxesCombined } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { PageHeader } from '@/components/navigation';
import { EmptyState, Screen } from '@/components/ui';

export function ReportPlaceholderScreen({ title }: { title: string }) {
  return (
    <Screen contentContainerStyle={styles.page}>
      <PageHeader fallbackRoute="/reports" title={title} />
      <EmptyState
        description="Este relatório será calculado com dados reais no Prompt 14."
        icon={ChartNoAxesCombined}
        title="Relatório ainda indisponível"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ page: { gap: 20 } });
