import { CircleDollarSign } from 'lucide-react-native';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/hooks/useTheme';
import { formatBRLCents } from '@/utils/currency';

export interface PaymentListItemProps extends ViewProps {
  amountCents: number;
  dateLabel: string;
  method: string;
  description?: string;
}

export function PaymentListItem({
  amountCents,
  dateLabel,
  method,
  description,
  style,
  ...props
}: PaymentListItemProps) {
  const { tokens } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: tokens.colors.border }, style]} {...props}>
      <View
        style={[
          styles.icon,
          { backgroundColor: `${tokens.colors.success}18`, borderRadius: tokens.radius.full },
        ]}
      >
        <CircleDollarSign color={tokens.colors.success} size={22} />
      </View>
      <View style={styles.main}>
        <AppText variant="label" weight="semibold">
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
    </View>
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
