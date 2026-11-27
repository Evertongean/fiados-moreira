import { StyleSheet, View } from 'react-native';

import { AppText, Card } from '@/components/ui';
import { PAYMENT_METHOD_LABELS } from '@/features/payments/domain/paymentUtils';
import type { ReportMethodBreakdown } from '@/features/reports/domain/reportTypes';
import { useTheme } from '@/hooks/useTheme';
import { formatBRLCents } from '@/utils/currency';

export function PaymentMethodDistribution({ data }: { data: ReportMethodBreakdown[] }) {
  const { tokens } = useTheme();
  const maximum = Math.max(1, ...data.map(({ grossCents }) => grossCents));
  return (
    <Card variant="outlined">
      <View style={styles.list}>
        {data.map((item) => {
          const label = PAYMENT_METHOD_LABELS[item.paymentMethod];
          return (
            <View
              accessible
              accessibilityLabel={`${label}: bruto ${formatBRLCents(item.grossCents)}, estornos ${formatBRLCents(item.reversedCents)}, líquido ${formatBRLCents(item.netCents)}`}
              key={item.paymentMethod}
              style={styles.item}
            >
              <View style={styles.row}>
                <AppText weight="semibold">{label}</AppText>
                <AppText variant="bodySmall">{formatBRLCents(item.netCents)}</AppText>
              </View>
              <View style={[styles.track, { backgroundColor: tokens.colors.surfaceSecondary }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      backgroundColor: tokens.colors.primary,
                      width: `${Math.max(2, (item.grossCents / maximum) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <AppText color="textMuted" variant="caption">
                Bruto {formatBRLCents(item.grossCents)} · Estornos{' '}
                {formatBRLCents(item.reversedCents)}
              </AppText>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: 16 },
  item: { gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  track: { height: 8, overflow: 'hidden', borderRadius: 999 },
  fill: { height: '100%', borderRadius: 999 },
});
