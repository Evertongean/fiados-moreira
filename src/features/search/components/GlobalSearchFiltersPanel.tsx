import { StyleSheet, View } from 'react-native';

import { SectionHeader } from '@/components/navigation';
import { Button, Card, CurrencyInput, Input } from '@/components/ui';
import { paymentMethods, vehicleTypes } from '@/database/schema';
import type {
  GlobalSearchFilterOptions,
  GlobalSearchFilters,
} from '@/features/search/domain/searchTypes';
import { PAYMENT_METHOD_LABELS } from '@/features/payments/domain/paymentUtils';
import { VEHICLE_TYPE_LABELS } from '@/features/vehicles/domain/vehicleUtils';
import { useTheme } from '@/hooks/useTheme';

interface GlobalSearchFiltersPanelProps {
  filters: GlobalSearchFilters;
  options: GlobalSearchFilterOptions;
  onChange: (filters: GlobalSearchFilters) => void;
  onClear: () => void;
}

export function GlobalSearchFiltersPanel({
  filters,
  options,
  onChange,
  onClear,
}: GlobalSearchFiltersPanelProps) {
  const customerChoices = [
    { value: undefined, label: 'Todos' },
    ...options.customers.map(({ id, name }) => ({ value: id, label: name })),
  ];
  const vehicleChoices = [
    { value: undefined, label: 'Todos' },
    ...options.vehicles
      .filter(
        ({ customerId }) => !filters.debts.customerId || customerId === filters.debts.customerId,
      )
      .map(({ id, label }) => ({ value: id, label })),
  ];

  return (
    <Card style={styles.panel} variant="outlined">
      <View style={styles.header}>
        <SectionHeader description="Os filtros de cada categoria são combinados." title="Filtros" />
        <Button label="Limpar todos" onPress={onClear} size="sm" variant="ghost" />
      </View>

      <FilterSection title="Clientes">
        <ChoiceRow
          label="Cadastro"
          onChange={(status) =>
            onChange({ ...filters, customers: { ...filters.customers, status } })
          }
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'active', label: 'Ativos' },
            { value: 'archived', label: 'Arquivados' },
          ]}
          value={filters.customers.status}
        />
        <ChoiceRow
          label="Dívidas"
          onChange={(debt) => onChange({ ...filters, customers: { ...filters.customers, debt } })}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'with_debt', label: 'Com dívida' },
            { value: 'without_debt', label: 'Sem dívida' },
            { value: 'overdue', label: 'Em atraso' },
          ]}
          value={filters.customers.debt}
        />
        <ChoiceRow
          label="Ordenar"
          onChange={(sort) => onChange({ ...filters, customers: { ...filters.customers, sort } })}
          options={[
            { value: 'name_asc', label: 'Nome A–Z' },
            { value: 'name_desc', label: 'Nome Z–A' },
            { value: 'newest', label: 'Cadastro recente' },
            { value: 'oldest', label: 'Cadastro antigo' },
            { value: 'balance_desc', label: 'Maior saldo' },
            { value: 'balance_asc', label: 'Menor saldo' },
          ]}
          value={filters.customers.sort}
        />
      </FilterSection>

      <FilterSection title="Veículos">
        <ChoiceRow
          label="Cadastro"
          onChange={(status) => onChange({ ...filters, vehicles: { ...filters.vehicles, status } })}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'active', label: 'Ativos' },
            { value: 'archived', label: 'Arquivados' },
          ]}
          value={filters.vehicles.status}
        />
        <ChoiceRow
          label="Tipo"
          onChange={(type) => onChange({ ...filters, vehicles: { ...filters.vehicles, type } })}
          options={[
            { value: 'all', label: 'Todos' },
            ...vehicleTypes.map((value) => ({ value, label: VEHICLE_TYPE_LABELS[value] })),
          ]}
          value={filters.vehicles.type}
        />
        <ChoiceRow
          label="Cliente"
          onChange={(customerId) =>
            onChange({ ...filters, vehicles: { ...filters.vehicles, customerId } })
          }
          options={customerChoices}
          value={filters.vehicles.customerId}
        />
      </FilterSection>

      <FilterSection title="Fiados">
        <ChoiceRow
          label="Situação financeira"
          onChange={(status) => onChange({ ...filters, debts: { ...filters.debts, status } })}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'open', label: 'Em aberto' },
            { value: 'pending', label: 'Pendentes' },
            { value: 'partially_paid', label: 'Parciais' },
            { value: 'paid', label: 'Quitados' },
            { value: 'canceled', label: 'Cancelados' },
          ]}
          value={filters.debts.status}
        />
        <ChoiceRow
          label="Atraso"
          onChange={(overdue) => onChange({ ...filters, debts: { ...filters.debts, overdue } })}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'overdue', label: 'Atrasados' },
            { value: 'not_overdue', label: 'Não atrasados' },
          ]}
          value={filters.debts.overdue}
        />
        <ChoiceRow
          label="Cliente"
          onChange={(customerId) =>
            onChange({
              ...filters,
              debts: { ...filters.debts, customerId, vehicleId: undefined },
            })
          }
          options={customerChoices}
          value={filters.debts.customerId}
        />
        <ChoiceRow
          label="Veículo"
          onChange={(vehicleId) => onChange({ ...filters, debts: { ...filters.debts, vehicleId } })}
          options={vehicleChoices}
          value={filters.debts.vehicleId}
        />
        <ChoiceRow
          label="Período por"
          onChange={(dateField) => onChange({ ...filters, debts: { ...filters.debts, dateField } })}
          options={[
            { value: 'created', label: 'Criação' },
            { value: 'due', label: 'Vencimento' },
          ]}
          value={filters.debts.dateField}
        />
        <DateRange
          endDate={filters.debts.endDate}
          onEndDate={(endDate) => onChange({ ...filters, debts: { ...filters.debts, endDate } })}
          onStartDate={(startDate) =>
            onChange({ ...filters, debts: { ...filters.debts, startDate } })
          }
          startDate={filters.debts.startDate}
        />
        <View style={styles.fieldRow}>
          <View style={styles.field}>
            <CurrencyInput
              label="Valor mínimo"
              onChangeCents={(minAmountCents) =>
                onChange({
                  ...filters,
                  debts: { ...filters.debts, minAmountCents: minAmountCents ?? undefined },
                })
              }
              valueCents={filters.debts.minAmountCents ?? null}
            />
          </View>
          <View style={styles.field}>
            <CurrencyInput
              label="Valor máximo"
              onChangeCents={(maxAmountCents) =>
                onChange({
                  ...filters,
                  debts: { ...filters.debts, maxAmountCents: maxAmountCents ?? undefined },
                })
              }
              valueCents={filters.debts.maxAmountCents ?? null}
            />
          </View>
        </View>
        <ChoiceRow
          label="Vencimento"
          onChange={(dueDate) => onChange({ ...filters, debts: { ...filters.debts, dueDate } })}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'with_due_date', label: 'Com vencimento' },
            { value: 'without_due_date', label: 'Sem vencimento' },
          ]}
          value={filters.debts.dueDate}
        />
        <ChoiceRow
          label="Ordenar"
          onChange={(sort) => onChange({ ...filters, debts: { ...filters.debts, sort } })}
          options={[
            { value: 'newest', label: 'Mais recentes' },
            { value: 'oldest', label: 'Mais antigos' },
            { value: 'amount_desc', label: 'Maior valor' },
            { value: 'amount_asc', label: 'Menor valor' },
            { value: 'due_asc', label: 'Vence primeiro' },
            { value: 'due_desc', label: 'Vence depois' },
          ]}
          value={filters.debts.sort}
        />
      </FilterSection>

      <FilterSection title="Pagamentos">
        <DateRange
          endDate={filters.payments.endDate}
          onEndDate={(endDate) =>
            onChange({ ...filters, payments: { ...filters.payments, endDate } })
          }
          onStartDate={(startDate) =>
            onChange({ ...filters, payments: { ...filters.payments, startDate } })
          }
          startDate={filters.payments.startDate}
        />
        <ChoiceRow
          label="Método"
          onChange={(method) => onChange({ ...filters, payments: { ...filters.payments, method } })}
          options={[
            { value: 'all', label: 'Todos' },
            ...paymentMethods.map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] })),
          ]}
          value={filters.payments.method}
        />
        <ChoiceRow
          label="Cliente"
          onChange={(customerId) =>
            onChange({ ...filters, payments: { ...filters.payments, customerId } })
          }
          options={customerChoices}
          value={filters.payments.customerId}
        />
        <ChoiceRow
          label="Situação"
          onChange={(status) => onChange({ ...filters, payments: { ...filters.payments, status } })}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'confirmed', label: 'Confirmados' },
            { value: 'reversed', label: 'Estornados' },
          ]}
          value={filters.payments.status}
        />
      </FilterSection>
    </Card>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.section, { borderTopColor: tokens.colors.border }]}>
      <SectionHeader title={title} />
      {children}
    </View>
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
    <View style={styles.choiceGroup}>
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

function DateRange({
  startDate,
  endDate,
  onStartDate,
  onEndDate,
}: {
  startDate?: string;
  endDate?: string;
  onStartDate: (value?: string) => void;
  onEndDate: (value?: string) => void;
}) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.field}>
        <Input
          autoCapitalize="none"
          helpText="Use AAAA-MM-DD"
          label="Data inicial"
          onChangeText={(value) => onStartDate(value.trim() || undefined)}
          placeholder="2026-01-01"
          value={startDate ?? ''}
        />
      </View>
      <View style={styles.field}>
        <Input
          autoCapitalize="none"
          helpText="Use AAAA-MM-DD"
          label="Data final"
          onChangeText={(value) => onEndDate(value.trim() || undefined)}
          placeholder="2026-12-31"
          value={endDate ?? ''}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { overflow: 'visible' },
  header: { gap: 8 },
  section: { gap: 12, paddingTop: 18, marginTop: 18, borderTopWidth: StyleSheet.hairlineWidth },
  choiceGroup: { gap: 8 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fieldRow: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, minWidth: 130 },
});
