import type { CustomerRow, VehicleRow } from '@/database/schema';
import { useMemo, useState } from 'react';
import type { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  CurrencyInput,
  Input,
  RadioGroup,
  SearchInput,
  TextArea,
} from '@/components/ui';
import { normalizeSearchText } from '@/features/customers/domain/customerUtils';
import type { DebtFormValues } from '@/features/debts/domain/debtSchemas';
import { maskCivilDateInput } from '@/features/debts/domain/debtUtils';
import { formatBrazilianPhone, normalizePhoneSearch } from '@/utils/phone';
import { formatBrazilianPlate } from '@/utils/plate';

export interface DebtFormProps {
  control: Control<DebtFormValues>;
  errors: FieldErrors<DebtFormValues>;
  customers: CustomerRow[];
  vehicles: VehicleRow[];
  setValue: UseFormSetValue<DebtFormValues>;
  customerLocked?: boolean;
  disabled?: boolean;
}

export function DebtForm({
  control,
  errors,
  customers,
  vehicles,
  setValue,
  customerLocked = false,
  disabled = false,
}: DebtFormProps) {
  const [customerQuery, setCustomerQuery] = useState('');
  const customerId = useWatch({ control, name: 'customerId' });
  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const customerVehicles = vehicles.filter((vehicle) => vehicle.customerId === customerId);
  const customerMatches = useMemo(() => {
    const textQuery = normalizeSearchText(customerQuery);
    const phoneQuery = normalizePhoneSearch(customerQuery);
    if (!textQuery && !phoneQuery) return [];
    return customers
      .filter((customer) => {
        const nameMatches = textQuery && normalizeSearchText(customer.name).includes(textQuery);
        const phoneMatches =
          phoneQuery &&
          [customer.phone, customer.whatsapp].some((phone) =>
            normalizePhoneSearch(phone ?? '').includes(phoneQuery),
          );
        return nameMatches || phoneMatches;
      })
      .slice(0, 5);
  }, [customerQuery, customers]);

  const selectCustomer = (customer: CustomerRow) => {
    setValue('customerId', customer.id, { shouldDirty: true, shouldValidate: true });
    setValue(
      'customer',
      {
        name: customer.name,
        phone: formatBrazilianPhone(customer.whatsapp ?? customer.phone) ?? '',
        address: customer.address ?? '',
      },
      { shouldDirty: true, shouldValidate: true },
    );
    setCustomerQuery('');
  };

  const clearCustomer = () => {
    setValue('customerId', '', { shouldDirty: true, shouldValidate: true });
    setValue('customer', { name: '', phone: '', address: '' }, { shouldDirty: true });
    setValue('vehicleId', '', { shouldDirty: true });
    setCustomerQuery('');
  };

  return (
    <View style={styles.form}>
      <View style={styles.section}>
        <AppText variant="h4">Dados do cliente</AppText>
        {selectedCustomer ? (
          <View style={styles.field}>
            <AppText variant="label">Cliente selecionado</AppText>
            <Card variant="outlined">
              <View style={styles.selectedCustomer}>
                <View style={styles.selectedCustomerCopy}>
                  <AppText weight="semibold">{selectedCustomer.name}</AppText>
                  {selectedCustomer.phone || selectedCustomer.whatsapp ? (
                    <AppText color="textSecondary" variant="bodySmall">
                      {formatBrazilianPhone(selectedCustomer.whatsapp ?? selectedCustomer.phone)}
                    </AppText>
                  ) : null}
                  {selectedCustomer.address ? (
                    <AppText color="textMuted" variant="caption">
                      {selectedCustomer.address}
                    </AppText>
                  ) : null}
                  {customerLocked ? (
                    <AppText color="textMuted" variant="caption">
                      O cliente do fiado não pode ser alterado nesta tela.
                    </AppText>
                  ) : null}
                </View>
                {!customerLocked ? (
                  <Button
                    disabled={disabled}
                    label="Trocar cliente"
                    onPress={clearCustomer}
                    size="sm"
                    variant="outline"
                  />
                ) : null}
              </View>
            </Card>
          </View>
        ) : (
          <View style={styles.customerFields}>
            <SearchInput
              accessibilityLabel="Buscar cliente existente (opcional)"
              editable={!disabled}
              helpText="Pesquise pelo nome ou telefone e selecione um resultado."
              label="Buscar cliente existente (opcional)"
              onChangeText={setCustomerQuery}
              placeholder="Nome ou telefone"
              value={customerQuery}
            />
            {customerQuery.trim() ? (
              customerMatches.length ? (
                <RadioGroup
                  label="Clientes encontrados"
                  onValueChange={(id) => {
                    const customer = customerMatches.find((item) => item.id === id);
                    if (customer) selectCustomer(customer);
                  }}
                  options={customerMatches.map((customer) => ({
                    value: customer.id,
                    label: customer.name,
                    description:
                      formatBrazilianPhone(customer.whatsapp ?? customer.phone) ??
                      'Sem telefone cadastrado',
                    disabled,
                  }))}
                  value=""
                />
              ) : (
                <AppText color="textMuted" variant="caption">
                  Nenhum cliente encontrado. Preencha os dados abaixo para cadastrá-lo.
                </AppText>
              )
            ) : null}
            <AppText variant="label">Novo cliente</AppText>
            <Controller
              control={control}
              name="customer.name"
              render={({ field }) => (
                <Input
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!disabled}
                  error={errors.customer?.name?.message}
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
              name="customer.phone"
              render={({ field }) => (
                <Input
                  autoComplete="tel"
                  editable={!disabled}
                  error={errors.customer?.phone?.message}
                  helpText="Fixo ou celular com DDD. O número também será usado como WhatsApp."
                  keyboardType="phone-pad"
                  label="Telefone/WhatsApp (opcional)"
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
              name="customer.address"
              render={({ field }) => (
                <Input
                  editable={!disabled}
                  error={errors.customer?.address?.message}
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
          </View>
        )}
      </View>
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
      <View style={styles.section}>
        <AppText variant="h4">Dados do fiado</AppText>
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <TextArea
              editable={!disabled}
              error={errors.description?.message}
              label="Descrição do serviço ou produto *"
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
              label="Data do fiado *"
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
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  section: { gap: 14 },
  field: { gap: 6 },
  customerFields: { gap: 14 },
  selectedCustomer: { gap: 12 },
  selectedCustomerCopy: { gap: 3 },
});
