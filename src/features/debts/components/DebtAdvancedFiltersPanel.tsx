import { X } from 'lucide-react-native';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { SectionHeader } from '@/components/navigation';
import { Button, Card, CurrencyInput, Header, IconButton, Input } from '@/components/ui';
import type { DebtListOptions } from '@/features/debts/domain/debtTypes';
import type { GlobalSearchFilterOptions } from '@/features/search/domain/searchTypes';
import { useTheme } from '@/hooks/useTheme';

export type DebtAdvancedFilters = Pick<
  DebtListOptions,
  | 'customerId'
  | 'vehicleId'
  | 'overdue'
  | 'dateField'
  | 'startDate'
  | 'endDate'
  | 'minAmountCents'
  | 'maxAmountCents'
  | 'dueDate'
  | 'sort'
>;

export const DEFAULT_DEBT_ADVANCED_FILTERS: DebtAdvancedFilters = {
  overdue: 'all',
  dateField: 'created',
  dueDate: 'all',
  sort: 'newest',
};

interface DebtAdvancedFiltersPanelProps {
  filters: DebtAdvancedFilters;
  options: GlobalSearchFilterOptions;
  onChange: (filters: DebtAdvancedFilters) => void;
  onClear: () => void;
  visible: boolean;
  onClose: () => void;
}

export function countDebtAdvancedFilters(filters: DebtAdvancedFilters): number {
  return [
    Boolean(filters.customerId),
    Boolean(filters.vehicleId),
    filters.overdue !== 'all',
    filters.dateField !== 'created',
    Boolean(filters.startDate),
    Boolean(filters.endDate),
    filters.minAmountCents !== undefined,
    filters.maxAmountCents !== undefined,
    filters.dueDate !== 'all',
    filters.sort !== 'newest',
  ].filter(Boolean).length;
}

export function DebtAdvancedFiltersPanel({
  filters,
  options,
  onChange,
  onClear,
  visible,
  onClose,
}: DebtAdvancedFiltersPanelProps) {
  const { tokens } = useTheme();
  const customers = [
    { value: undefined, label: 'Todos' },
    ...options.customers.map(({ id, name }) => ({ value: id, label: name })),
  ];
  const vehicles = [
    { value: undefined, label: 'Todos' },
    ...options.vehicles
      .filter(({ customerId }) => !filters.customerId || customerId === filters.customerId)
      .map(({ id, label }) => ({ value: id, label })),
  ];

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <View style={[styles.modal, { backgroundColor: tokens.colors.background }]}>
        <Card style={styles.panel} variant="outlined">
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Header
              rightAction={
                <IconButton accessibilityLabel="Fechar filtros" icon={X} onPress={onClose} />
              }
              subtitle="Combine os critérios para refinar a lista."
              title="Filtros avançados"
            />
            <Button label="Limpar todos" onPress={onClear} size="sm" variant="ghost" />
            <ChoiceRow
              label="Condição de atraso"
              onChange={(overdue) => onChange({ ...filters, overdue })}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'overdue', label: 'Atrasados' },
                { value: 'not_overdue', label: 'Não atrasados' },
              ]}
              value={filters.overdue}
            />
            <ChoiceRow
              label="Cliente"
              onChange={(customerId) => onChange({ ...filters, customerId, vehicleId: undefined })}
              options={customers}
              value={filters.customerId}
            />
            <ChoiceRow
              label="Veículo"
              onChange={(vehicleId) => onChange({ ...filters, vehicleId })}
              options={vehicles}
              value={filters.vehicleId}
            />
            <ChoiceRow
              label="Período por"
              onChange={(dateField) => onChange({ ...filters, dateField })}
              options={[
                { value: 'created', label: 'Criação' },
                { value: 'due', label: 'Vencimento' },
              ]}
              value={filters.dateField}
            />
            <View style={styles.fieldRow}>
              <View style={styles.field}>
                <Input
                  helpText="AAAA-MM-DD"
                  label="Data inicial"
                  onChangeText={(value) =>
                    onChange({ ...filters, startDate: value.trim() || undefined })
                  }
                  value={filters.startDate ?? ''}
                />
              </View>
              <View style={styles.field}>
                <Input
                  helpText="AAAA-MM-DD"
                  label="Data final"
                  onChangeText={(value) =>
                    onChange({ ...filters, endDate: value.trim() || undefined })
                  }
                  value={filters.endDate ?? ''}
                />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.field}>
                <CurrencyInput
                  label="Valor mínimo"
                  onChangeCents={(value) =>
                    onChange({ ...filters, minAmountCents: value ?? undefined })
                  }
                  valueCents={filters.minAmountCents ?? null}
                />
              </View>
              <View style={styles.field}>
                <CurrencyInput
                  label="Valor máximo"
                  onChangeCents={(value) =>
                    onChange({ ...filters, maxAmountCents: value ?? undefined })
                  }
                  valueCents={filters.maxAmountCents ?? null}
                />
              </View>
            </View>
            <ChoiceRow
              label="Vencimento"
              onChange={(dueDate) => onChange({ ...filters, dueDate })}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'with_due_date', label: 'Com vencimento' },
                { value: 'without_due_date', label: 'Sem vencimento' },
              ]}
              value={filters.dueDate}
            />
            <ChoiceRow
              label="Ordenar"
              onChange={(sort) => onChange({ ...filters, sort })}
              options={[
                { value: 'newest', label: 'Mais recentes' },
                { value: 'oldest', label: 'Mais antigos' },
                { value: 'amount_desc', label: 'Maior valor' },
                { value: 'amount_asc', label: 'Menor valor' },
                { value: 'due_asc', label: 'Vence primeiro' },
                { value: 'due_desc', label: 'Vence depois' },
              ]}
              value={filters.sort}
            />
          </ScrollView>
        </Card>
      </View>
    </Modal>
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
  modal: { flex: 1, padding: 16 },
  panel: { flex: 1, overflow: 'hidden' },
  content: { gap: 4, paddingBottom: 24 },
  group: { gap: 8, marginTop: 16 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fieldRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  field: { flex: 1, minWidth: 130 },
});
