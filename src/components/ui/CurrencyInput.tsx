import { WalletCards } from 'lucide-react-native';
import { useMemo } from 'react';

import { Input, type InputProps } from '@/components/ui/Input';
import { formatBRLCents, MAX_CURRENCY_CENTS, parseCurrencyDigits } from '@/utils/currency';

export interface CurrencyInputProps extends Omit<
  InputProps,
  'value' | 'defaultValue' | 'onChangeText' | 'keyboardType'
> {
  valueCents: number | null;
  onChangeCents: (valueCents: number | null) => void;
  maxCents?: number;
}

export function CurrencyInput({
  valueCents,
  onChangeCents,
  maxCents = MAX_CURRENCY_CENTS,
  error,
  ...props
}: CurrencyInputProps) {
  const displayValue = useMemo(
    () => (valueCents === null ? '' : formatBRLCents(valueCents)),
    [valueCents],
  );
  const limitError =
    valueCents !== null && valueCents > maxCents ? 'Valor acima do limite permitido.' : undefined;

  return (
    <Input
      accessibilityLabel={props.accessibilityLabel ?? props.label ?? 'Valor em reais'}
      endIcon={WalletCards}
      error={error ?? limitError}
      keyboardType="number-pad"
      onChangeText={(text) => {
        const cents = parseCurrencyDigits(text);
        onChangeCents(cents !== null && cents <= maxCents ? cents : valueCents);
      }}
      value={displayValue}
      {...props}
    />
  );
}
