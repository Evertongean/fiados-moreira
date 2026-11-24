import { Save } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/navigation';
import { Alert, Button, Input, Screen, TextArea } from '@/components/ui';

export interface CustomerFormScreenProps {
  mode: 'create' | 'edit';
}

export function CustomerFormScreen({ mode }: CustomerFormScreenProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const isEdit = mode === 'edit';

  return (
    <Screen contentContainerStyle={styles.page} keyboardAware scroll>
      <PageHeader
        fallbackRoute="/customers"
        subtitle="Estrutura visual; nenhum dado será salvo nesta etapa."
        title={isEdit ? 'Editar cliente' : 'Novo cliente'}
      />
      <Alert
        description="O cadastro funcional será habilitado no Prompt 05. Você pode preencher os campos apenas para avaliar a interface."
        title="Salvamento indisponível"
      />
      <View style={styles.form}>
        <Input
          autoCapitalize="words"
          label="Nome completo"
          onChangeText={setName}
          placeholder="Digite o nome do cliente"
          value={name}
        />
        <Input
          keyboardType="phone-pad"
          label="Telefone/WhatsApp"
          onChangeText={setPhone}
          placeholder="(00) 00000-0000"
          value={phone}
        />
        <Input
          label="Endereço (opcional)"
          onChangeText={setAddress}
          placeholder="Rua, número e bairro"
          value={address}
        />
        <TextArea
          label="Observações"
          onChangeText={setNotes}
          placeholder="Informações úteis sobre o cliente"
          value={notes}
        />
      </View>
      <Button disabled fullWidth icon={Save} label="Salvar cliente" onPress={() => undefined} />
    </Screen>
  );
}

const styles = StyleSheet.create({ page: { gap: 20, paddingBottom: 40 }, form: { gap: 16 } });
