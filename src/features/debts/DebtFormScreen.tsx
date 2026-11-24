import { Save } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/navigation';
import { Alert, Button, CurrencyInput, Input, Screen, TextArea } from '@/components/ui';

export function DebtFormScreen({ mode }: { mode: 'create' | 'edit' }) {
  const [customer, setCustomer] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [description, setDescription] = useState('');
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [serviceDate, setServiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <Screen contentContainerStyle={styles.page} keyboardAware scroll>
      <PageHeader
        fallbackRoute="/debts"
        subtitle="Estrutura visual; nenhuma operação financeira será criada."
        title={mode === 'edit' ? 'Editar fiado' : 'Novo fiado'}
      />
      <Alert
        description="O lançamento e as validações financeiras serão implementados no Prompt 07."
        title="Salvamento indisponível"
        variant="warning"
      />
      <View style={styles.form}>
        <Input
          label="Cliente"
          onChangeText={setCustomer}
          placeholder="Selecione o cliente"
          value={customer}
        />
        <Input
          label="Veículo (opcional)"
          onChangeText={setVehicle}
          placeholder="Selecione o veículo"
          value={vehicle}
        />
        <TextArea label="Descrição do serviço" onChangeText={setDescription} value={description} />
        <CurrencyInput
          label="Valor total"
          onChangeCents={setAmountCents}
          valueCents={amountCents}
        />
        <Input
          label="Data do serviço"
          onChangeText={setServiceDate}
          placeholder="DD/MM/AAAA"
          value={serviceDate}
        />
        <Input
          label="Data de vencimento (opcional)"
          onChangeText={setDueDate}
          placeholder="DD/MM/AAAA"
          value={dueDate}
        />
        <TextArea label="Observações" onChangeText={setNotes} value={notes} />
      </View>
      <Button disabled fullWidth icon={Save} label="Salvar fiado" onPress={() => undefined} />
    </Screen>
  );
}

const styles = StyleSheet.create({ page: { gap: 20, paddingBottom: 40 }, form: { gap: 16 } });
