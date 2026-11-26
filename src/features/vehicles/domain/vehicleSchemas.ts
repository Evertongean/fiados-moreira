import { z } from 'zod';

import { vehicleTypes } from '@/database/schema';
import { isValidBrazilianPlate, normalizeBrazilianPlate } from '@/utils/plate';

import {
  normalizeOptionalVehicleNotes,
  normalizeOptionalVehicleText,
  normalizeVehicleText,
} from './vehicleUtils';

const plateMessage = 'Informe uma placa antiga (ABC-1234) ou Mercosul (ABC1D23).';

export const vehicleFormSchema = z.object({
  customerId: z.string().uuid('Selecione o cliente responsável.'),
  type: z.enum(vehicleTypes),
  brand: z
    .string()
    .max(100, 'A marca deve ter no máximo 80 caracteres.')
    .refine((value) => normalizeVehicleText(value).length > 0, 'Informe a marca.')
    .refine(
      (value) => normalizeVehicleText(value).length <= 80,
      'A marca deve ter no máximo 80 caracteres.',
    ),
  model: z
    .string()
    .max(100, 'O modelo deve ter no máximo 80 caracteres.')
    .refine((value) => normalizeVehicleText(value).length > 0, 'Informe o modelo.')
    .refine(
      (value) => normalizeVehicleText(value).length <= 80,
      'O modelo deve ter no máximo 80 caracteres.',
    ),
  year: z
    .string()
    .refine((value) => !value.trim() || /^\d{4}$/.test(value.trim()), 'Informe um ano válido.')
    .refine((value) => {
      const year = Number(value);
      return !value.trim() || (year >= 1886 && year <= 9999);
    }, 'O ano deve estar entre 1886 e 9999.'),
  plate: z
    .string()
    .max(12, plateMessage)
    .refine((value) => !value.trim() || isValidBrazilianPlate(value), plateMessage),
  color: z.string().max(80, 'A cor deve ter no máximo 80 caracteres.'),
  notes: z.string().max(1000, 'As observações devem ter no máximo 1000 caracteres.'),
});

export type VehicleFormValues = z.output<typeof vehicleFormSchema>;

const optionalText = z
  .string()
  .nullable()
  .optional()
  .transform(normalizeOptionalVehicleText)
  .pipe(z.string().max(80).nullable());

const normalizedPlate = z
  .string()
  .nullable()
  .optional()
  .transform(normalizeBrazilianPlate)
  .refine((value) => value === null || isValidBrazilianPlate(value), plateMessage);

export const createVehicleSchema = z.object({
  customerId: z.uuid(),
  type: z.enum(vehicleTypes),
  brand: z.string().transform(normalizeVehicleText).pipe(z.string().min(1).max(80)),
  model: z.string().transform(normalizeVehicleText).pipe(z.string().min(1).max(80)),
  year: z
    .number()
    .int()
    .min(1886)
    .max(9999)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  plate: normalizedPlate,
  color: optionalText,
  notes: z
    .string()
    .nullable()
    .optional()
    .transform(normalizeOptionalVehicleNotes)
    .pipe(z.string().max(1000).nullable()),
});

export const updateVehicleSchema = createVehicleSchema.omit({ customerId: true }).partial();
export type CreateVehicleInput = z.input<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.input<typeof updateVehicleSchema>;
export type NormalizedVehicleInput = z.output<typeof createVehicleSchema>;
