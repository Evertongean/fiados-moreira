import { CircleDollarSign, RotateCcw } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/hooks/useTheme';
import { formatBRLCents } from '@/utils/currency';

export interface PaymentListItemProps extends PressableProps {
  amountCents: number;
  dateLabel: string;
  method: string;
  description?: string;
  kind?: 'payment' | 'reversal';
}

export function PaymentListItem({
  amountCents,
  dateLabel,
  method,
  description,
  kind = 'payment',
  style,
  ...props
}: PaymentListItemProps) {
  const { tokens } = useTheme();
  const reversed = kind === 'reversal';
  const color = reversed ? tokens.colors.warning : tokens.colors.success;
  const Icon = reversed ? RotateCcw : CircleDollarSign;

  return (
    <Pressable
      accessibilityRole={props.onPress ? 'button' : undefined}
      disabled={!props.onPress}
      style={(state) => [
        styles.container,
        { borderBottomColor: tokens.colors.border, opacity: state.pressed ? 0.72 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <View
        style={[styles.icon, { backgroundColor: `${color}18`, borderRadius: tokens.radius.full }]}
      >
        <Icon color={color} size={22} />
      </View>
      <View style={styles.main}>
        <AppText variant="label" weight="semibold">
          {reversed ? 'Estorno de ' : ''}
          {formatBRLCents(amountCents)}
        </AppText>
        <AppText color="textSecondary" variant="caption">
          {method} · {dateLabel}
        </AppText>
        {description ? (
          <AppText color="textMuted" numberOfLines={1} variant="caption">
            {description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, gap: 2 },
});
