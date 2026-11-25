import {
  customerFormSchema,
  createCustomerSchema,
} from '@/features/customers/domain/customerSchemas';
import {
  normalizeCustomerName,
  normalizeSearchText,
} from '@/features/customers/domain/customerUtils';
import { formatBrazilianPhone, normalizeBrazilianPhone, normalizePhoneSearch } from '@/utils/phone';

describe('customer validation and normalization', () => {
  it.each(['João', "D'Ávila", 'Ana-Maria', 'Édson'])('accepts valid Brazilian name %s', (name) => {
    expect(
      customerFormSchema.safeParse({
        name,
        phone: '',
        whatsapp: '',
        address: '',
        notes: '',
        usePhoneForWhatsapp: true,
      }).success,
    ).toBe(true);
  });

  it.each(['', ' ', 'A'])('rejects missing or too short name %p', (name) => {
    const result = customerFormSchema.safeParse({
      name,
      phone: '',
      whatsapp: '',
      address: '',
      notes: '',
      usePhoneForWhatsapp: true,
    });
    expect(result.success).toBe(false);
  });

  it('normalizes names and optional fields before persistence', () => {
    expect(
      createCustomerSchema.parse({
        name: '  João   da   Silva  ',
        phone: '(84) 99999-9999',
        whatsapp: '',
        address: '  Rua   Principal, 10 ',
        notes: '  Linha 1\nLinha 2  ',
      }),
    ).toEqual({
      name: 'João da Silva',
      phone: '+5584999999999',
      whatsapp: null,
      address: 'Rua Principal, 10',
      notes: 'Linha 1\nLinha 2',
    });
    expect(normalizeCustomerName('  Maria   José ')).toBe('Maria José');
    expect(normalizeSearchText('  JOÃO  ')).toBe('joao');
  });

  it('normalizes and formats Brazilian landlines and mobile phones', () => {
    expect(normalizeBrazilianPhone('(84) 3333-3333')).toBe('+558433333333');
    expect(normalizeBrazilianPhone('+55 (84) 99999-9999')).toBe('+5584999999999');
    expect(normalizeBrazilianPhone('5584999999999')).toBe('+5584999999999');
    expect(formatBrazilianPhone('+558433333333')).toBe('(84) 3333-3333');
    expect(formatBrazilianPhone('+5584999999999')).toBe('(84) 99999-9999');
    expect(normalizePhoneSearch('+55 84 99999-9999')).toBe('84999999999');
  });

  it.each(['123', '(00) 99999-9999', '(84) 7777-7777'])('rejects invalid phone %s', (phone) => {
    expect(normalizeBrazilianPhone(phone)).toBeNull();
    expect(createCustomerSchema.safeParse({ name: 'Cliente', phone }).success).toBe(false);
  });
});
