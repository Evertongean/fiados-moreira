import { StyleSheet, View } from 'react-native';

import { SectionHeader } from '@/components/navigation';
import { Button, Card, Input } from '@/components/ui';
import { paymentMethods } from '@/database/schema';
import { PAYMENT_METHOD_LABELS } from '@/features/payments/domain/paymentUtils';
import { REPORT_PERIOD_LABELS } from '@/features/reports/domain/reportPeriods';
import type {
  ReportFilterOption,
  ReportFilters,
  ReportFinancialStatus,
  ReportPeriodPreset,
} from '@/features/reports/domain/reportTypes';

interface ReportFiltersPanelProps {
  filters: ReportFilters;
  options: ReportFilterOption[];
  onChange: (filters: ReportFilters) => void;
  onApply: () => void;
  onClear: () => void;
}

export function ReportFiltersPanel({
  filters,
  options,
  onChange,
  onApply,
  onClear,
}: ReportFiltersPanelProps) {
  return (
    <Card variant="outlined">
      <View style={styles.content}>
        <View style={styles.header}>
          <SectionHeader
            description="Cliente combina com tudo; método filtra movimentações e situação filtra saldos atuais."
            title="Filtros"
          />
          <Button label="Limpar" onPress={onClear} size="sm" variant="ghost" />
        </View>
        <ChoiceRow
          label="Período das movimentações"
          onChange={(period) => onChange({ ...filters, period })}
          options={(Object.keys(REPORT_PERIOD_LABELS) as ReportPeriodPreset[]).map((value) => ({
            value,
            label: REPORT_PERIOD_LABELS[value],
          }))}
          value={filters.period}
        />
        {filters.period === 'custom' ? (
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Input
                autoCapitalize="none"
                helpText="AAAA-MM-DD"
                label="Data inicial"
                onChangeText={(customStartDate) => onChange({ ...filters, customStartDate })}
                placeholder="2026-01-01"
                value={filters.customStartDate ?? ''}
              />
            </View>
            <View style={styles.dateField}>
              <Input
                autoCapitalize="none"
                helpText="AAAA-MM-DD"
                label="Data final"
                onChangeText={(customEndDate) => onChange({ ...filters, customEndDate })}
                placeholder="2026-01-31"
                value={filters.customEndDate ?? ''}
              />
            </View>
          </View>
        ) : null}
        <ChoiceRow
          label="Cliente"
          onChange={(customerId) => onChange({ ...filters, customerId })}
          options={[
            { value: undefined, label: 'Todos' },
            ...options.map(({ id, name }) => ({ value: id, label: name })),
          ]}
          value={filters.customerId}
        />
        <ChoiceRow
          label="Método de pagamento"
          onChange={(paymentMethod) => onChange({ ...filters, paymentMethod })}
          options={[
            { value: 'all', label: 'Todos' },
            ...paymentMethods.map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] })),
          ]}
          value={filters.paymentMethod}
        />
        <ChoiceRow<ReportFinancialStatus>
          label="Situação dos saldos atuais"
          onChange={(financialStatus) => onChange({ ...filters, financialStatus })}
          options={[
            { value: 'all', label: 'Todos em aberto' },
            { value: 'pending', label: 'Pendentes' },
            { value: 'partially_paid', label: 'Parcialmente pagos' },
          ]}
          value={filters.financialStatus}
        />
        <Button fullWidth label="Aplicar filtros" onPress={onApply} />
      </View>
    </Card>
  );
}

function ChoiceRow<T extends string | undefined>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.group}>
      <SectionHeader title={label} />
      <View style={styles.choices}>
        {options.map((option) => (
          <Button
            key={option.value ?? 'all'}
            label={option.label}
            onPress={() => onChange(option.value)}
            size="sm"
            variant={value === option.value ? 'secondary' : 'outline'}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  group: { gap: 8 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dateField: { minWidth: 140, flex: 1 },
});
