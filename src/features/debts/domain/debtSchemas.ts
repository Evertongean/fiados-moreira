import { z } from 'zod';

import { MAX_CURRENCY_CENTS } from '@/utils/currency';

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === (month ?? 0) - 1 &&
      parsed.getUTCDate() === day
    );
  });
const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null)
  .nullable()
  .optional();
const positiveCents = z.number().int().positive().max(MAX_CURRENCY_CENTS);

export const createDebtSchema = z.object({
  customerId: z.uuid(),
  vehicleId: z.uuid().nullable().optional(),
  description: z.string().trim().min(1).max(500),
  totalCents: positiveCents,
  serviceDate: date,
  dueDate: date.nullable().optional(),
  notes: optionalText,
});

export const updateDebtSchema = z.object({
  vehicleId: z.uuid().nullable().optional(),
  description: z.string().trim().min(1).max(500).optional(),
  totalCents: positiveCents.optional(),
  serviceDate: date.optional(),
  dueDate: date.nullable().optional(),
  notes: optionalText,
});

export const cancelDebtSchema = z.object({
  reason: z.string().trim().min(1).max(500),
  operationId: z.uuid(),
  canceledAt: z.iso.datetime().optional(),
});

export type CreateDebtInput = z.input<typeof createDebtSchema>;
export type UpdateDebtInput = z.input<typeof updateDebtSchema>;
export type CancelDebtInput = z.input<typeof cancelDebtSchema>;
