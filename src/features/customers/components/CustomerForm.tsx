import type { Control, FieldErrors } from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Checkbox, Input, TextArea } from '@/components/ui';
import type { CustomerFormValues } from '@/features/customers/domain/customerSchemas';

export interface CustomerFormProps {
  control: Control<CustomerFormValues>;
  errors: FieldErrors<CustomerFormValues>;
  disabled?: boolean;
}

export function CustomerForm({ control, errors, disabled = false }: CustomerFormProps) {
  const usePhoneForWhatsapp = useWatch({ control, name: 'usePhoneForWhatsapp' });

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input
            autoCapitalize="words"
            autoComplete="name"
            editable={!disabled}
            error={errors.name?.message}
            label="Nome completo *"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Digite o nome do cliente"
            returnKeyType="next"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <Input
            autoComplete="tel"
            editable={!disabled}
            error={errors.phone?.message}
            helpText="Fixo ou celular com DDD."
            keyboardType="phone-pad"
            label="Telefone (opcional)"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="(84) 99999-9999"
            returnKeyType="next"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="usePhoneForWhatsapp"
        render={({ field }) => (
          <Checkbox
            checked={field.value}
            description="Evita preencher o mesmo número duas vezes."
            disabled={disabled}
            label="Usar o telefone também no WhatsApp"
            onCheckedChange={field.onChange}
          />
        )}
      />
      {!usePhoneForWhatsapp ? (
        <Controller
          control={control}
          name="whatsapp"
          render={({ field }) => (
            <Input
              editable={!disabled}
              error={errors.whatsapp?.message}
              keyboardType="phone-pad"
              label="WhatsApp (opcional)"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="(84) 99999-9999"
              returnKeyType="next"
              value={field.value}
            />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="address"
        render={({ field }) => (
          <Input
            editable={!disabled}
            error={errors.address?.message}
            label="Endereço (opcional)"
            maxLength={300}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Rua, número e bairro"
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
            placeholder="Informações úteis sobre o atendimento"
            value={field.value}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 16 } });
