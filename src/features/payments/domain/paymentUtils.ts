import type { PaymentMethod } from '@/database/schema';

export const PAYMENT_METHOD_OPTIONS: readonly { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'debit_card', label: 'Cartão de débito' },
  { value: 'credit_card', label: 'Cartão de crédito' },
  { value: 'bank_transfer', label: 'Transferência bancária' },
  { value: 'other', label: 'Outro' },
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = Object.fromEntries(
  PAYMENT_METHOD_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<PaymentMethod, string>;

export function formatPaymentInstant(value: string, timezone: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'medium',
        timeZone: timezone,
      }).format(date);
}
