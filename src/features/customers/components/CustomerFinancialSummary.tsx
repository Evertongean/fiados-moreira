import {
  Banknote,
  CalendarCheck,
  CircleCheckBig,
  CircleDollarSign,
  ClockAlert,
  ReceiptText,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { BalanceCard, StatCard } from '@/components/cards';
import { AppText } from '@/components/ui';
import type { CustomerHistorySummary } from '@/features/customers/domain/customerTypes';
import { formatPaymentInstant } from '@/features/payments/domain/paymentUtils';
import { formatBRLCents } from '@/utils/currency';

export interface CustomerFinancialSummaryProps {
  summary: CustomerHistorySummary;
  timezone: string;
}

export function CustomerFinancialSummary({ summary, timezone }: CustomerFinancialSummaryProps) {
  return (
    <View style={styles.container}>
      <BalanceCard
        description={`${summary.openDebtCount} ${summary.openDebtCount === 1 ? 'fiado em aberto' : 'fiados em aberto'}`}
        icon={CircleDollarSign}
        title="Saldo devedor"
        valueCents={summary.outstandingCents}
      />
      <View style={styles.grid}>
        <StatCard
          icon={ReceiptText}
          label="Total em fiados"
          style={styles.stat}
          value={formatBRLCents(summary.totalDebtCents)}
        />
        <StatCard
          icon={Banknote}
          label="Total líquido recebido"
          style={styles.stat}
          value={formatBRLCents(summary.totalPaidCents)}
          variant="success"
        />
        <StatCard
          icon={ClockAlert}
          label="Valor em atraso"
          style={styles.stat}
          value={formatBRLCents(summary.overdueCents)}
          variant={summary.overdueCents > 0 ? 'destructive' : 'default'}
        />
        <StatCard
          icon={CircleCheckBig}
          label="Fiados quitados"
          style={styles.stat}
          value={String(summary.paidDebtCount)}
          variant="success"
        />
        <StatCard
          description={summary.openDebtCount === 1 ? 'fiado atual' : 'fiados atuais'}
          icon={CircleDollarSign}
          label="Fiados em aberto"
          style={styles.stat}
          value={String(summary.openDebtCount)}
        />
        <StatCard
          icon={CalendarCheck}
          label="Último pagamento válido"
          style={styles.stat}
          value={
            summary.lastValidPaymentAt
              ? formatPaymentInstant(summary.lastValidPaymentAt, timezone)
              : 'Nenhum'
          }
        />
      </View>
      <AppText color="textMuted" variant="caption">
        Este resumo representa a situação atual e não muda com os filtros do histórico.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { minWidth: 148, flexGrow: 1, flexBasis: 148 },
});
