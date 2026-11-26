import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, CurrencyInput, Input, RadioGroup, TextArea } from '@/components/ui';
import type { PaymentFormValues } from '@/features/payments/domain/paymentSchemas';
import { PAYMENT_METHOD_OPTIONS } from '@/features/payments/domain/paymentUtils';
import { formatBRLCents } from '@/utils/currency';
import { maskCivilDateInput } from '@/utils/date';

export interface PaymentFormProps {
  control: Control<PaymentFormValues>;
  errors: FieldErrors<PaymentFormValues>;
  pendingCents: number;
  remainingCents: number | null;
  disabled?: boolean;
  onPayFull: () => void;
}

export function PaymentForm({
  control,
  errors,
  pendingCents,
  remainingCents,
  disabled = false,
  onPayFull,
}: PaymentFormProps) {
  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <AppText variant="label">Saldo pendente atual</AppText>
        <AppText selectable variant="h3">
          {formatBRLCents(pendingCents)}
        </AppText>
      </View>
      <Controller
        control={control}
        name="amountCents"
        render={({ field }) => (
          <CurrencyInput
            editable={!disabled}
            error={errors.amountCents?.message}
            label="Valor do pagamento *"
            maxCents={pendingCents}
            onBlur={field.onBlur}
            onChangeCents={field.onChange}
            valueCents={field.value}
          />
        )}
      />
      <Button disabled={disabled} label="Pagar valor total" onPress={onPayFull} variant="outline" />
      <View accessibilityLiveRegion="polite" style={styles.preview}>
        <AppText color="textMuted" variant="caption">
          Saldo restante após a confirmação
        </AppText>
        <AppText weight="semibold">
          {remainingCents === null ? 'Informe um valor válido' : formatBRLCents(remainingCents)}
        </AppText>
      </View>
      <Controller
        control={control}
        name="paymentMethod"
        render={({ field }) => (
          <View style={styles.field}>
            <RadioGroup
              label="Método de pagamento *"
              onValueChange={field.onChange}
              options={PAYMENT_METHOD_OPTIONS.map((option) => ({ ...option, disabled }))}
              value={field.value}
            />
            {errors.paymentMethod?.message ? (
              <AppText color="destructive" variant="caption">
                {errors.paymentMethod.message}
              </AppText>
            ) : null}
          </View>
        )}
      />
      <Controller
        control={control}
        name="paidDate"
        render={({ field }) => (
          <Input
            editable={!disabled}
            error={errors.paidDate?.message}
            helpText="Use o formato DD/MM/AAAA."
            keyboardType="number-pad"
            label="Data do pagamento *"
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
            placeholder="Informações úteis sobre o pagamento"
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
  preview: { gap: 3 },
});
