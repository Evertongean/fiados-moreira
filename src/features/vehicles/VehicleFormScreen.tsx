import { Save } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/navigation';
import { Alert, Button, Input, Screen, TextArea } from '@/components/ui';

export function VehicleFormScreen({ mode }: { mode: 'create' | 'edit' }) {
  const [customer, setCustomer] = useState('');
  const [type, setType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <Screen contentContainerStyle={styles.page} keyboardAware scroll>
      <PageHeader
        fallbackRoute="/customers"
        subtitle="Estrutura visual; nenhum veículo será salvo."
        title={mode === 'edit' ? 'Editar veículo' : 'Novo veículo'}
      />
      <Alert
        description="O vínculo com clientes e o salvamento serão implementados no Prompt 06."
        title="Funcionalidade indisponível"
      />
      <View style={styles.form}>
        <Input label="Cliente responsável" onChangeText={setCustomer} value={customer} />
        <Input
          label="Tipo de veículo"
          onChangeText={setType}
          placeholder="Carro, moto..."
          value={type}
        />
        <Input label="Marca" onChangeText={setBrand} value={brand} />
        <Input label="Modelo" onChangeText={setModel} value={model} />
        <Input
          keyboardType="number-pad"
          label="Ano"
          maxLength={4}
          onChangeText={setYear}
          value={year}
        />
        <Input autoCapitalize="characters" label="Placa" onChangeText={setPlate} value={plate} />
        <Input label="Cor" onChangeText={setColor} value={color} />
        <TextArea label="Observações" onChangeText={setNotes} value={notes} />
      </View>
      <Button disabled fullWidth icon={Save} label="Salvar veículo" onPress={() => undefined} />
    </Screen>
  );
}

const styles = StyleSheet.create({ page: { gap: 20, paddingBottom: 40 }, form: { gap: 16 } });
