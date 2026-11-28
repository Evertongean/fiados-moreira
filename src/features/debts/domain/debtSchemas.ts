import { z } from 'zod';

import { customerFormSchema } from '@/features/customers/domain/customerSchemas';
import { MAX_CURRENCY_CENTS } from '@/utils/currency';

import { parseCivilDate } from './debtUtils';

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
  .max(1000)
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

const formDate = (optional = false) =>
  z
    .string()
    .refine(
      (value) => (optional && !value.trim()) || parseCivilDate(value) !== null,
      'Informe uma data válida no formato DD/MM/AAAA.',
    );

const embeddedCustomerFormSchema = customerFormSchema.pick({
  name: true,
  phone: true,
  address: true,
});

export const debtFormSchema = z.object({
  customerId: z.union([z.literal(''), z.string().uuid('Selecione um cliente válido.')]),
  customer: embeddedCustomerFormSchema,
  vehicleId: z.union([z.literal(''), z.string().uuid('Selecione um veículo válido.')]),
  description: z.string().trim().min(1, 'Informe o serviço ou produto.').max(500),
  totalCents: z
    .number()
    .nullable()
    .pipe(
      z
        .number({ error: 'Informe o valor total.' })
        .int()
        .positive('Informe um valor maior que zero.')
        .max(MAX_CURRENCY_CENTS),
    ),
  serviceDate: formDate(),
  dueDate: formDate(true),
  notes: z.string().max(1000, 'As observações devem ter no máximo 1000 caracteres.'),
});

export type CreateDebtInput = z.input<typeof createDebtSchema>;
export type CreateDebtWithoutCustomerInput = Omit<CreateDebtInput, 'customerId'>;
export type UpdateDebtInput = z.input<typeof updateDebtSchema>;
export type CancelDebtInput = z.input<typeof cancelDebtSchema>;
export type DebtFormValues = z.input<typeof debtFormSchema>;
export type DebtFormOutput = z.output<typeof debtFormSchema>;
