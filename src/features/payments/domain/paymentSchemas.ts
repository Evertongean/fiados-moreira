import { z } from 'zod';

import { paymentMethods } from '@/database/schema';
import { MAX_CURRENCY_CENTS } from '@/utils/currency';
import { parseCivilDate } from '@/utils/date';

export const registerPaymentSchema = z.object({
  operationId: z.uuid(),
  debtId: z.uuid(),
  amountCents: z.number().int().positive().max(MAX_CURRENCY_CENTS),
  paymentMethod: z.enum(paymentMethods),
  paidAt: z.iso.datetime(),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => value || null)
    .nullable()
    .optional(),
});

export const paymentFormSchema = z.object({
  amountCents: z
    .number()
    .nullable()
    .pipe(
      z
        .number({ error: 'Informe o valor do pagamento.' })
        .int()
        .positive('Informe um valor maior que zero.')
        .max(MAX_CURRENCY_CENTS),
    ),
  paymentMethod: z.enum(paymentMethods, { error: 'Selecione o método de pagamento.' }),
  paidDate: z
    .string()
    .refine(
      (value) => parseCivilDate(value) !== null,
      'Informe uma data válida no formato DD/MM/AAAA.',
    ),
  notes: z.string().max(1000, 'As observações devem ter no máximo 1000 caracteres.'),
});

export const reversePaymentSchema = z.object({
  operationId: z.uuid(),
  paymentId: z.uuid(),
  reason: z.string().trim().min(1).max(500),
  reversedAt: z.iso.datetime(),
});

export type RegisterPaymentInput = z.input<typeof registerPaymentSchema>;
export type ReversePaymentInput = z.input<typeof reversePaymentSchema>;
export type PaymentFormValues = z.input<typeof paymentFormSchema>;
export type PaymentFormOutput = z.output<typeof paymentFormSchema>;
