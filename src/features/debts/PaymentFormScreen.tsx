import { useLocalSearchParams } from 'expo-router';
import { Save } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RouteState } from '@/components/layouts/RouteState';
import { PageHeader } from '@/components/navigation';
import { Alert, Button, CurrencyInput, Input, Screen, TextArea } from '@/components/ui';
import { getRouteId } from '@/utils/routes';

export function PaymentFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const debtId = getRouteId(id);
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [method, setMethod] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  if (!debtId) {
    return (
      <RouteState
        description="Não foi possível identificar o fiado."
        kind="invalid"
        title="Fiado inválido"
      />
    );
  }

  return (
    <Screen contentContainerStyle={styles.page} keyboardAware scroll>
      <PageHeader fallbackRoute="/debts" title="Registrar pagamento" />
      <Alert
        description="Esta tela não registra pagamentos. Transações, saldo e auditoria serão implementados no Prompt 08."
        title="Operação financeira indisponível"
        variant="warning"
      />
      <View style={styles.form}>
        <CurrencyInput
          label="Valor do pagamento"
          onChangeCents={setAmountCents}
          valueCents={amountCents}
        />
        <Input
          helpText="Dinheiro, Pix, cartão, transferência bancária ou outro."
          label="Forma de pagamento"
          onChangeText={setMethod}
          placeholder="PIX, dinheiro, cartão..."
          value={method}
        />
        <Input
          label="Data do pagamento"
          onChangeText={setDate}
          placeholder="DD/MM/AAAA"
          value={date}
        />
        <TextArea label="Observações" onChangeText={setNotes} value={notes} />
      </View>
      <Button
        disabled
        fullWidth
        icon={Save}
        label="Confirmar pagamento"
        onPress={() => undefined}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ page: { gap: 20, paddingBottom: 40 }, form: { gap: 16 } });
