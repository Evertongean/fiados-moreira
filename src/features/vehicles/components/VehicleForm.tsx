import type { CustomerRow } from '@/database/schema';
import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, Input, RadioGroup, TextArea } from '@/components/ui';
import type { VehicleFormValues } from '@/features/vehicles/domain/vehicleSchemas';

const TYPE_OPTIONS = [
  { value: 'motorcycle', label: 'Motocicleta' },
  { value: 'car', label: 'Carro' },
  { value: 'truck', label: 'Caminhão' },
  { value: 'van', label: 'Van' },
  { value: 'other', label: 'Outro' },
] as const;

export interface VehicleFormProps {
  control: Control<VehicleFormValues>;
  errors: FieldErrors<VehicleFormValues>;
  customers: CustomerRow[];
  ownerLocked?: boolean;
  disabled?: boolean;
}

export function VehicleForm({
  control,
  errors,
  customers,
  ownerLocked = false,
  disabled = false,
}: VehicleFormProps) {
  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="customerId"
        render={({ field }) => {
          const selected = customers.find((customer) => customer.id === field.value);
          if (ownerLocked && selected) {
            return (
              <View style={styles.field}>
                <AppText variant="label">Cliente responsável *</AppText>
                <Card variant="outlined">
                  <View style={styles.owner}>
                    <AppText weight="semibold">{selected.name}</AppText>
                    <AppText color="textMuted" variant="caption">
                      O proprietário não pode ser alterado após o cadastro.
                    </AppText>
                  </View>
                </Card>
              </View>
            );
          }
          return (
            <View style={styles.field}>
              <RadioGroup
                label="Cliente responsável *"
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
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <RadioGroup
            label="Tipo *"
            onValueChange={field.onChange}
            options={TYPE_OPTIONS.map((option) => ({ ...option, disabled }))}
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="brand"
        render={({ field }) => (
          <Input
            autoCapitalize="words"
            editable={!disabled}
            error={errors.brand?.message}
            label="Marca *"
            maxLength={100}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Ex.: Honda"
            returnKeyType="next"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="model"
        render={({ field }) => (
          <Input
            autoCapitalize="words"
            editable={!disabled}
            error={errors.model?.message}
            label="Modelo *"
            maxLength={100}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Ex.: CG 160"
            returnKeyType="next"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="year"
        render={({ field }) => (
          <Input
            editable={!disabled}
            error={errors.year?.message}
            keyboardType="number-pad"
            label="Ano (opcional)"
            maxLength={4}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="2024"
            returnKeyType="next"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="plate"
        render={({ field }) => (
          <Input
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!disabled}
            error={errors.plate?.message}
            helpText="Padrão antigo ABC-1234 ou Mercosul ABC1D23."
            label="Placa (opcional)"
            maxLength={8}
            onBlur={field.onBlur}
            onChangeText={(value) => field.onChange(value.toUpperCase())}
            placeholder="ABC1D23"
            returnKeyType="next"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="color"
        render={({ field }) => (
          <Input
            autoCapitalize="words"
            editable={!disabled}
            error={errors.color?.message}
            label="Cor (opcional)"
            maxLength={80}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Ex.: Prata"
            returnKeyType="next"
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
            helpText="Evite registrar informações pessoais sensíveis."
            label="Observações (opcional)"
            maxLength={1000}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Informações úteis sobre o veículo"
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
  owner: { gap: 3 },
});
