import { z } from 'zod';

import { paymentMethods } from '@/database/schema';
import { MAX_CURRENCY_CENTS } from '@/utils/currency';

export const registerPaymentSchema = z.object({
  operationId: z.uuid(),
  debtId: z.uuid(),
  amountCents: z.number().int().positive().max(MAX_CURRENCY_CENTS),
  paymentMethod: z.enum(paymentMethods),
  paidAt: z.iso.datetime(),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional(),
});

export const reversePaymentSchema = z.object({
  operationId: z.uuid(),
  paymentId: z.uuid(),
  reason: z.string().trim().min(1).max(500),
  reversedAt: z.iso.datetime(),
});

export type RegisterPaymentInput = z.input<typeof registerPaymentSchema>;
export type ReversePaymentInput = z.input<typeof reversePaymentSchema>;
