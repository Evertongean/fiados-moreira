import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { AppText, Card } from '@/components/ui';
import { bucketReceiptSeries } from '@/features/reports/domain/reportSeries';
import type { ReportDailyReceipt } from '@/features/reports/domain/reportTypes';
import { useTheme } from '@/hooks/useTheme';
import { formatBRLCents } from '@/utils/currency';

const WIDTH = 700;
const HEIGHT = 230;
const BASELINE = 108;
const MAX_BAR_HEIGHT = 76;

export function ReportReceiptsChart({ data }: { data: ReportDailyReceipt[] }) {
  const { tokens } = useTheme();
  const buckets = bucketReceiptSeries(data);
  const maximum = Math.max(
    1,
    ...buckets.flatMap(({ grossCents, reversedCents }) => [grossCents, reversedCents]),
  );
  const slot = (WIDTH - 40) / Math.max(1, buckets.length);
  const barWidth = Math.max(7, Math.min(20, slot / 3));
  const description = buckets
    .map(
      (item) =>
        `${item.label}: bruto ${formatBRLCents(item.grossCents)}, estornos ${formatBRLCents(item.reversedCents)}, líquido ${formatBRLCents(item.netCents)}`,
    )
    .join('; ');
  return (
    <Card variant="outlined">
      <View accessible accessibilityLabel={`Evolução dos recebimentos. ${description}`}>
        <Svg height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%">
          <Line
            stroke={tokens.colors.border}
            strokeWidth={2}
            x1={20}
            x2={WIDTH - 20}
            y1={BASELINE}
            y2={BASELINE}
          />
          {buckets.map((item, index) => {
            const center = 20 + slot * index + slot / 2;
            const grossHeight = (item.grossCents / maximum) * MAX_BAR_HEIGHT;
            const reversedHeight = (item.reversedCents / maximum) * MAX_BAR_HEIGHT;
            return (
              <Fragment key={item.key}>
                <Rect
                  fill={tokens.colors.success}
                  height={grossHeight}
                  rx={3}
                  width={barWidth}
                  x={center - barWidth - 2}
                  y={BASELINE - grossHeight}
                />
                <Rect
                  fill={tokens.colors.destructive}
                  height={reversedHeight}
                  rx={3}
                  width={barWidth}
                  x={center + 2}
                  y={BASELINE}
                />
                <SvgText
                  fill={tokens.colors.textMuted}
                  fontSize={Math.max(11, Math.min(17, slot / 3.2))}
                  textAnchor="middle"
                  x={center}
                  y={205}
                >
                  {item.label}
                </SvgText>
              </Fragment>
            );
          })}
        </Svg>
      </View>
      <View style={styles.legend}>
        <Legend color={tokens.colors.success} label="Bruto" />
        <Legend color={tokens.colors.destructive} label="Estornos" />
      </View>
      <AppText color="textMuted" variant="caption">
        Períodos extensos são agrupados em até 12 blocos sem alterar os totais.
      </AppText>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText color="textSecondary" variant="caption">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
