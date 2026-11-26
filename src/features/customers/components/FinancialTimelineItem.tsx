import {
  Ban,
  CircleDollarSign,
  PencilLine,
  ReceiptText,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Badge, Card } from '@/components/ui';
import type {
  FinancialHistoryEvent,
  FinancialHistoryEventType,
} from '@/features/customers/domain/customerTypes';
import { FINANCIAL_HISTORY_TYPE_LABELS } from '@/features/customers/domain/customerHistoryUtils';
import { formatVehicleLabel } from '@/features/debts/domain/debtUtils';
import { formatPaymentInstant } from '@/features/payments/domain/paymentUtils';
import { useTheme } from '@/hooks/useTheme';
import type { SemanticColorName } from '@/theme/types';
import { formatBRLCents } from '@/utils/currency';

const EVENT_PRESENTATION: Record<
  FinancialHistoryEventType,
  { icon: LucideIcon; color: SemanticColorName }
> = {
  debt_created: { icon: ReceiptText, color: 'primary' },
  payment_registered: { icon: CircleDollarSign, color: 'success' },
  payment_reversed: { icon: RotateCcw, color: 'warning' },
  debt_updated: { icon: PencilLine, color: 'info' },
  debt_canceled: { icon: Ban, color: 'destructive' },
};

const STATUS_LABELS: Record<FinancialHistoryEvent['status'], string> = {
  recorded: 'Registrado',
  valid: 'Válido',
  reversed: 'Estornado',
  updated: 'Atualizado',
  canceled: 'Cancelado',
};

export interface FinancialTimelineItemProps {
  event: FinancialHistoryEvent;
  timezone: string;
  onPress: () => void;
}

export function FinancialTimelineItem({ event, timezone, onPress }: FinancialTimelineItemProps) {
  const { tokens } = useTheme();
  const presentation = EVENT_PRESENTATION[event.type];
  const Icon = presentation.icon;
  const color = tokens.colors[presentation.color];
  const vehicle = formatVehicleLabel({
    brand: event.vehicleBrand,
    model: event.vehicleModel,
    plate: event.vehiclePlate,
  });
  const financialChange =
    event.type === 'debt_updated' &&
    event.previousAmountCents !== null &&
    event.amountCents !== null &&
    event.previousAmountCents !== event.amountCents;

  return (
    <Pressable
      accessibilityLabel={`Abrir detalhes de ${FINANCIAL_HISTORY_TYPE_LABELS[event.type].toLocaleLowerCase('pt-BR')}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}
    >
      <Card variant="outlined">
        <View style={styles.row}>
          <View
            style={[
              styles.icon,
              { backgroundColor: `${color}18`, borderRadius: tokens.radius.full },
            ]}
          >
            <Icon color={color} size={22} />
          </View>
          <View style={styles.content}>
            <View style={styles.header}>
              <AppText weight="semibold">{FINANCIAL_HISTORY_TYPE_LABELS[event.type]}</AppText>
              <Badge
                label={STATUS_LABELS[event.status]}
                variant={
                  event.status === 'valid'
                    ? 'success'
                    : event.status === 'reversed'
                      ? 'warning'
                      : event.status === 'canceled'
                        ? 'destructive'
                        : 'outline'
                }
              />
            </View>
            <AppText color="textSecondary" variant="bodySmall">
              {event.debtDescription}
            </AppText>
            {financialChange ? (
              <AppText color="info" variant="caption">
                {formatBRLCents(event.previousAmountCents as number)} →{' '}
                {formatBRLCents(event.amountCents as number)}
              </AppText>
            ) : event.amountCents !== null ? (
              <AppText variant="label">{formatBRLCents(event.amountCents)}</AppText>
            ) : null}
            {vehicle ? (
              <AppText color="textMuted" variant="caption">
                {vehicle}
              </AppText>
            ) : null}
            {event.note ? (
              <AppText color="textMuted" numberOfLines={2} variant="caption">
                {event.note}
              </AppText>
            ) : null}
            <View style={styles.footer}>
              <AppText color="textMuted" variant="caption">
                {formatPaymentInstant(event.occurredAt, timezone)}
              </AppText>
              <AppText color="textMuted" variant="caption">
                Fiado {event.debtId.slice(0, 8)}
              </AppText>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 5 },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
});
