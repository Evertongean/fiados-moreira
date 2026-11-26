import { CalendarDays, Car, ChevronRight, UserRound } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { DebtStatusBadge } from '@/components/cards';
import { AppText, Card } from '@/components/ui';
import type { DebtOverview } from '@/features/debts/domain/debtTypes';
import { formatCivilDate, formatVehicleLabel } from '@/features/debts/domain/debtUtils';
import { toDebtBadgeStatus } from '@/features/debts/domain/status';
import { useTheme } from '@/hooks/useTheme';
import { formatBRLCents } from '@/utils/currency';

export function DebtListItem({ debt, onPress }: { debt: DebtOverview; onPress: () => void }) {
  const { tokens } = useTheme();
  const vehicle = formatVehicleLabel({
    brand: debt.vehicleBrand,
    model: debt.vehicleModel,
    plate: debt.vehiclePlate,
  });
  return (
    <Card
      accessibilityLabel={`Abrir fiado de ${debt.customerName}`}
      onPress={onPress}
      variant="outlined"
    >
      <View style={styles.content}>
        <View style={styles.top}>
          <View style={styles.title}>
            <AppText numberOfLines={2} weight="semibold">
              {debt.description}
            </AppText>
            <View style={styles.meta}>
              <UserRound color={tokens.colors.textMuted} size={15} />
              <AppText color="textSecondary" numberOfLines={1} variant="caption">
                {debt.customerName}
              </AppText>
            </View>
          </View>
          <ChevronRight color={tokens.colors.textMuted} size={20} />
        </View>
        {vehicle ? (
          <View style={styles.meta}>
            <Car color={tokens.colors.textMuted} size={15} />
            <AppText color="textMuted" numberOfLines={1} variant="caption">
              {vehicle}
            </AppText>
          </View>
        ) : null}
        <View style={styles.financial}>
          <View style={styles.amount}>
            <AppText color="textMuted" variant="caption">
              Saldo
            </AppText>
            <AppText variant="h4">{formatBRLCents(debt.summary.pendingCents)}</AppText>
          </View>
          <View style={styles.amountRight}>
            <AppText color="textMuted" variant="caption">
              Valor original
            </AppText>
            <AppText variant="bodySmall">{formatBRLCents(debt.summary.originalCents)}</AppText>
          </View>
        </View>
        <View style={styles.footer}>
          <DebtStatusBadge status={toDebtBadgeStatus(debt.status)} />
          <View style={styles.meta}>
            <CalendarDays color={tokens.colors.textMuted} size={15} />
            <AppText color={debt.status.isOverdue ? 'destructive' : 'textMuted'} variant="caption">
              {debt.dueDate ? `Vence em ${formatCivilDate(debt.dueDate)}` : 'Sem vencimento'}
            </AppText>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: 10 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, gap: 5 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  financial: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  amount: { gap: 2 },
  amountRight: { alignItems: 'flex-end', gap: 2 },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
