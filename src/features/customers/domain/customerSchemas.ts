import { z } from 'zod';

import { isValidBrazilianPhone, normalizeBrazilianPhone } from '@/utils/phone';

import {
  normalizeCustomerName,
  normalizeOptionalMultiline,
  normalizeOptionalSingleLine,
} from './customerUtils';

const optionalPhone = z
  .string()
  .trim()
  .max(32, 'O telefone informado é inválido.')
  .refine((value) => !value || isValidBrazilianPhone(value), 'O telefone informado é inválido.');

const normalizedOptionalPhone = z
  .string()
  .nullable()
  .optional()
  .refine((value) => !value || isValidBrazilianPhone(value), 'O telefone informado é inválido.')
  .transform((value) => normalizeBrazilianPhone(value));

export const customerFormSchema = z.object({
  name: z
    .string()
    .max(160, 'O nome deve ter no máximo 120 caracteres.')
    .refine((value) => normalizeCustomerName(value).length >= 2, 'Informe o nome do cliente.')
    .refine(
      (value) => normalizeCustomerName(value).length <= 120,
      'O nome deve ter no máximo 120 caracteres.',
    ),
  phone: optionalPhone,
  whatsapp: optionalPhone,
  address: z.string().max(300, 'O endereço deve ter no máximo 300 caracteres.'),
  notes: z.string().max(1000, 'As observações devem ter no máximo 1000 caracteres.'),
  usePhoneForWhatsapp: z.boolean(),
});

export type CustomerFormInput = z.input<typeof customerFormSchema>;
export type CustomerFormValues = z.output<typeof customerFormSchema>;

export const createCustomerSchema = z.object({
  name: z.string().transform(normalizeCustomerName).pipe(z.string().min(2).max(120)),
  phone: normalizedOptionalPhone,
  whatsapp: normalizedOptionalPhone,
  address: z
    .string()
    .nullable()
    .optional()
    .transform((value) => normalizeOptionalSingleLine(value))
    .pipe(z.string().max(300).nullable()),
  notes: z
    .string()
    .nullable()
    .optional()
    .transform((value) => normalizeOptionalMultiline(value))
    .pipe(z.string().max(1000).nullable()),
});

export const updateCustomerSchema = createCustomerSchema.partial();
export type CreateCustomerInput = z.input<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;
export type NormalizedCustomerInput = z.output<typeof createCustomerSchema>;
