import {
  Ban,
  CircleDollarSign,
  PencilLine,
  ReceiptText,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Card } from '@/components/ui';
import type {
  DashboardActivity,
  DashboardActivityType,
} from '@/features/dashboard/domain/dashboardTypes';
import { formatPaymentInstant } from '@/features/payments/domain/paymentUtils';
import { useTheme } from '@/hooks/useTheme';
import type { SemanticColorName } from '@/theme/types';
import { formatBRLCents } from '@/utils/currency';

const PRESENTATION: Record<
  DashboardActivityType,
  { label: string; icon: LucideIcon; color: SemanticColorName }
> = {
  debt_created: { label: 'Fiado registrado', icon: ReceiptText, color: 'primary' },
  debt_updated: { label: 'Fiado atualizado', icon: PencilLine, color: 'info' },
  debt_canceled: { label: 'Fiado cancelado', icon: Ban, color: 'destructive' },
  payment_registered: { label: 'Pagamento registrado', icon: CircleDollarSign, color: 'success' },
  payment_reversed: { label: 'Pagamento estornado', icon: RotateCcw, color: 'warning' },
};

export function DashboardActivityItem({
  activity,
  timezone,
  hidden = false,
  onPress,
}: {
  activity: DashboardActivity;
  timezone: string;
  hidden?: boolean;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  const presentation = PRESENTATION[activity.type];
  const Icon = presentation.icon;
  const color = tokens.colors[presentation.color];
  return (
    <Card
      accessibilityLabel={`Abrir detalhes de ${presentation.label.toLocaleLowerCase('pt-BR')}`}
      onPress={onPress}
      variant="outlined"
    >
      <View style={styles.row}>
        <View
          style={[styles.icon, { backgroundColor: `${color}18`, borderRadius: tokens.radius.full }]}
        >
          <Icon color={color} size={21} />
        </View>
        <View style={styles.content}>
          <View style={styles.header}>
            <AppText weight="semibold">{presentation.label}</AppText>
            {activity.type === 'payment_registered' && activity.isReversed ? (
              <Badge label="Estornado" variant="warning" />
            ) : null}
          </View>
          <AppText color="textSecondary" numberOfLines={1} variant="bodySmall">
            {activity.customerName} · {activity.debtDescription}
          </AppText>
          <View style={styles.footer}>
            <AppText color="textMuted" variant="caption">
              {formatPaymentInstant(activity.occurredAt, timezone)}
            </AppText>
            {activity.amountCents !== null ? (
              <AppText color={presentation.color} variant="label">
                {hidden ? 'R$ ••••••' : formatBRLCents(activity.amountCents)}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 5 },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
