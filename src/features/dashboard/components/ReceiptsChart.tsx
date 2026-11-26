import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { AppText, Card } from '@/components/ui';
import type { DashboardDailyReceipt } from '@/features/dashboard/domain/dashboardTypes';
import { useTheme } from '@/hooks/useTheme';
import { formatBRLCents } from '@/utils/currency';

const CHART_WIDTH = 700;
const CHART_HEIGHT = 220;
const BASELINE = 102;
const MAX_BAR_HEIGHT = 70;
const SLOT_WIDTH = 92;
const BAR_WIDTH = 24;

export function ReceiptsChart({
  data,
  hidden = false,
}: {
  data: DashboardDailyReceipt[];
  hidden?: boolean;
}) {
  const { tokens } = useTheme();
  const maximum = Math.max(1, ...data.flatMap((day) => [day.grossCents, day.reversedCents]));
  const description = data
    .map(
      (day) =>
        `${formatDay(day.civilDate)}: bruto ${formatBRLCents(day.grossCents)}, estornos ${formatBRLCents(day.reversedCents)}, líquido ${formatBRLCents(day.netCents)}`,
    )
    .join('; ');

  return (
    <Card variant="outlined">
      <View
        accessible
        accessibilityLabel={
          hidden
            ? 'Recebimentos dos últimos sete dias. Valores ocultos.'
            : `Recebimentos dos últimos sete dias. ${description}`
        }
      >
        <Svg height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} width="100%">
          <Line
            stroke={tokens.colors.border}
            strokeWidth={2}
            x1={18}
            x2={CHART_WIDTH - 18}
            y1={BASELINE}
            y2={BASELINE}
          />
          {data.map((day, index) => {
            const center = 52 + index * SLOT_WIDTH;
            const grossHeight = (day.grossCents / maximum) * MAX_BAR_HEIGHT;
            const reversedHeight = (day.reversedCents / maximum) * MAX_BAR_HEIGHT;
            return (
              <Fragment key={day.civilDate}>
                <Rect
                  fill={tokens.colors.success}
                  height={grossHeight}
                  rx={4}
                  width={BAR_WIDTH}
                  x={center - BAR_WIDTH - 2}
                  y={BASELINE - grossHeight}
                />
                <Rect
                  fill={tokens.colors.destructive}
                  height={reversedHeight}
                  rx={4}
                  width={BAR_WIDTH}
                  x={center + 2}
                  y={BASELINE}
                />
                <SvgText
                  fill={tokens.colors.textMuted}
                  fontSize={18}
                  textAnchor="middle"
                  x={center}
                  y={198}
                >
                  {formatDay(day.civilDate)}
                </SvgText>
              </Fragment>
            );
          })}
        </Svg>
      </View>
      <View style={styles.legend}>
        <Legend color={tokens.colors.success} label="Recebimentos brutos" />
        <Legend color={tokens.colors.destructive} label="Estornos" />
      </View>
      <AppText color="textMuted" variant="caption">
        {hidden
          ? 'Valores ocultos. As barras mantêm a proporção do período.'
          : 'O líquido diário corresponde aos recebimentos menos os estornos efetivados no dia.'}
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

function formatDay(civilDate: string): string {
  const [, month = '', day = ''] = civilDate.split('-');
  return `${day}/${month}`;
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: -8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
