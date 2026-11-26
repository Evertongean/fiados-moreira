import { CalendarDays, ChevronRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, Card } from '@/components/ui';
import type { DashboardDebt } from '@/features/dashboard/domain/dashboardTypes';
import { formatCivilDate } from '@/utils/date';
import { formatBRLCents } from '@/utils/currency';
import { useTheme } from '@/hooks/useTheme';

export interface DashboardDebtItemProps {
  debt: DashboardDebt;
  overdue?: boolean;
  hidden?: boolean;
  onPress: () => void;
}

export function DashboardDebtItem({
  debt,
  overdue = false,
  hidden = false,
  onPress,
}: DashboardDebtItemProps) {
  const { tokens } = useTheme();
  return (
    <Card
      accessibilityLabel={`Abrir fiado de ${debt.customerName}`}
      onPress={onPress}
      variant="outlined"
    >
      <View style={styles.row}>
        <View style={styles.content}>
          <AppText numberOfLines={1} weight="semibold">
            {debt.customerName}
          </AppText>
          <AppText color="textSecondary" numberOfLines={1} variant="bodySmall">
            {debt.description}
          </AppText>
          <View style={styles.meta}>
            <CalendarDays
              color={overdue ? tokens.colors.destructive : tokens.colors.textMuted}
              size={15}
            />
            <AppText color={overdue ? 'destructive' : 'textMuted'} variant="caption">
              {overdue ? 'Venceu em' : 'Vence em'} {formatCivilDate(debt.dueDate)}
            </AppText>
          </View>
        </View>
        <View style={styles.amount}>
          <AppText color="textMuted" variant="caption">
            Saldo
          </AppText>
          <AppText color={overdue ? 'destructive' : 'foreground'} variant="label">
            {hidden ? 'R$ ••••••' : formatBRLCents(debt.pendingCents)}
          </AppText>
        </View>
        <ChevronRight color={tokens.colors.textMuted} size={20} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  content: { flex: 1, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  amount: { alignItems: 'flex-end', gap: 2 },
});
