import { z } from 'zod';

import { vehicleTypes } from '@/database/schema';

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null)
  .nullable()
  .optional();
const plate = z
  .string()
  .trim()
  .transform((value) => value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || null)
  .nullable()
  .optional();

export const createVehicleSchema = z.object({
  customerId: z.uuid(),
  type: z.enum(vehicleTypes),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80),
  year: z.number().int().min(1886).max(9999).nullable().optional(),
  plate,
  color: optionalText,
  notes: optionalText,
});

export const updateVehicleSchema = createVehicleSchema.omit({ customerId: true }).partial();
export type CreateVehicleInput = z.input<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.input<typeof updateVehicleSchema>;
