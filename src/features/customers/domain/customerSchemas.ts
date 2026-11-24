import { z } from 'zod';

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null)
  .nullable()
  .optional();

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1).max(160),
  phone: optionalText,
  whatsapp: optionalText,
  address: optionalText,
  notes: optionalText,
});

export const updateCustomerSchema = createCustomerSchema.partial();
export type CreateCustomerInput = z.input<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;
