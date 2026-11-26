import type { CustomerRow, VehicleRow } from '@/database/schema';
import type { Control, FieldErrors } from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, CurrencyInput, Input, RadioGroup, TextArea } from '@/components/ui';
import type { DebtFormValues } from '@/features/debts/domain/debtSchemas';
import { maskCivilDateInput } from '@/features/debts/domain/debtUtils';
import { formatBrazilianPlate } from '@/utils/plate';

export interface DebtFormProps {
  control: Control<DebtFormValues>;
  errors: FieldErrors<DebtFormValues>;
  customers: CustomerRow[];
  vehicles: VehicleRow[];
  customerLocked?: boolean;
  disabled?: boolean;
}

export function DebtForm({
  control,
  errors,
  customers,
  vehicles,
  customerLocked = false,
  disabled = false,
}: DebtFormProps) {
  const customerId = useWatch({ control, name: 'customerId' });
  const customerVehicles = vehicles.filter((vehicle) => vehicle.customerId === customerId);

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="customerId"
        render={({ field }) => {
          const selected = customers.find((customer) => customer.id === field.value);
          return customerLocked && selected ? (
            <View style={styles.field}>
              <AppText variant="label">Cliente *</AppText>
              <Card variant="outlined">
                <View style={styles.locked}>
                  <AppText weight="semibold">{selected.name}</AppText>
                  <AppText color="textMuted" variant="caption">
                    O cliente do fiado não pode ser alterado nesta tela.
                  </AppText>
                </View>
              </Card>
            </View>
          ) : (
            <View style={styles.field}>
              <RadioGroup
                label="Cliente *"
                onValueChange={field.onChange}
                options={customers.map((customer) => ({
                  value: customer.id,
                  label: customer.name,
                  disabled,
                }))}
                value={field.value}
              />
              {errors.customerId?.message ? (
                <AppText color="destructive" variant="caption">
                  {errors.customerId.message}
                </AppText>
              ) : null}
            </View>
          );
        }}
      />
      {customerId ? (
        <Controller
          control={control}
          name="vehicleId"
          render={({ field }) => (
            <View style={styles.field}>
              <RadioGroup
                label="Veículo (opcional)"
                onValueChange={field.onChange}
                options={[
                  { value: '', label: 'Sem veículo', disabled },
                  ...customerVehicles.map((vehicle) => ({
                    value: vehicle.id,
                    label: `${vehicle.brand} ${vehicle.model}${vehicle.plate ? ` · ${formatBrazilianPlate(vehicle.plate)}` : ''}`,
                    description: vehicle.archivedAt ? 'Veículo arquivado' : undefined,
                    disabled: disabled || Boolean(vehicle.archivedAt),
                  })),
                ]}
                value={field.value}
              />
              {errors.vehicleId?.message ? (
                <AppText color="destructive" variant="caption">
                  {errors.vehicleId.message}
                </AppText>
              ) : null}
            </View>
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextArea
            editable={!disabled}
            error={errors.description?.message}
            label="Serviço ou produto *"
            maxLength={500}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Descreva o serviço realizado ou produto vendido"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="totalCents"
        render={({ field }) => (
          <CurrencyInput
            editable={!disabled}
            error={errors.totalCents?.message}
            label="Valor total *"
            onBlur={field.onBlur}
            onChangeCents={field.onChange}
            valueCents={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="serviceDate"
        render={({ field }) => (
          <Input
            editable={!disabled}
            error={errors.serviceDate?.message}
            helpText="Use o formato DD/MM/AAAA."
            keyboardType="number-pad"
            label="Data do serviço *"
            maxLength={10}
            onBlur={field.onBlur}
            onChangeText={(value) => field.onChange(maskCivilDateInput(value))}
            placeholder="DD/MM/AAAA"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="dueDate"
        render={({ field }) => (
          <Input
            editable={!disabled}
            error={errors.dueDate?.message}
            helpText="Deixe em branco se não houver vencimento."
            keyboardType="number-pad"
            label="Data de vencimento (opcional)"
            maxLength={10}
            onBlur={field.onBlur}
            onChangeText={(value) => field.onChange(maskCivilDateInput(value))}
            placeholder="DD/MM/AAAA"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <TextArea
            editable={!disabled}
            error={errors.notes?.message}
            label="Observações (opcional)"
            maxLength={1000}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Informações úteis sobre o lançamento"
            value={field.value}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  field: { gap: 6 },
  locked: { gap: 3 },
});
