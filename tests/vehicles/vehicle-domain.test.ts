import { createVehicleSchema, vehicleFormSchema } from '@/features/vehicles/domain/vehicleSchemas';
import {
  formatBrazilianPlate,
  isValidBrazilianPlate,
  normalizeBrazilianPlate,
} from '@/utils/plate';

describe('vehicle domain', () => {
  it.each([
    ['abc-1234', 'ABC1234', 'ABC-1234'],
    ['abc1d23', 'ABC1D23', 'ABC1D23'],
    [' ABC 1D23 ', 'ABC1D23', 'ABC1D23'],
  ])('normalizes valid Brazilian plates', (input, normalized, formatted) => {
    expect(normalizeBrazilianPlate(input)).toBe(normalized);
    expect(isValidBrazilianPlate(input)).toBe(true);
    expect(formatBrazilianPlate(input)).toBe(formatted);
  });

  it.each(['AB12345', 'ABCD123', 'ABC12D3', 'ABC-123', '1234ABC'])(
    'rejects invalid plate %s',
    (plate) => {
      expect(isValidBrazilianPlate(plate)).toBe(false);
      expect(
        createVehicleSchema.safeParse({
          customerId: '6b05c50a-44cf-4d95-80a7-e0ff8b17c1c8',
          type: 'car',
          brand: 'Fiat',
          model: 'Uno',
          plate,
        }).success,
      ).toBe(false);
    },
  );

  it('normalizes text and optional values at the domain boundary', () => {
    expect(
      createVehicleSchema.parse({
        customerId: '6b05c50a-44cf-4d95-80a7-e0ff8b17c1c8',
        type: 'motorcycle',
        brand: '  Honda  ',
        model: ' CG   160 ',
        color: '  Vermelha ',
        notes: ' Revisada   recentemente. ',
      }),
    ).toEqual({
      customerId: '6b05c50a-44cf-4d95-80a7-e0ff8b17c1c8',
      type: 'motorcycle',
      brand: 'Honda',
      model: 'CG 160',
      year: null,
      plate: null,
      color: 'Vermelha',
      notes: 'Revisada recentemente.',
    });
  });

  it('validates required form fields and optional year', () => {
    expect(
      vehicleFormSchema.safeParse({
        customerId: '',
        type: 'car',
        brand: '',
        model: '',
        year: '1800',
        plate: '',
        color: '',
        notes: '',
      }).success,
    ).toBe(false);
    expect(
      vehicleFormSchema.safeParse({
        customerId: '6b05c50a-44cf-4d95-80a7-e0ff8b17c1c8',
        type: 'car',
        brand: 'Fiat',
        model: 'Uno',
        year: '',
        plate: '',
        color: '',
        notes: '',
      }).success,
    ).toBe(true);
  });
});
