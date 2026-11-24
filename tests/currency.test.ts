import {
  formatBRLCents,
  MAX_CURRENCY_CENTS,
  parseBRLToCents,
  parseCurrencyDigits,
} from '@/utils/currency';

describe('currency utilities', () => {
  test.each([
    [0, 'R$ 0,00'],
    [1, 'R$ 0,01'],
    [99, 'R$ 0,99'],
    [123456, 'R$ 1.234,56'],
    [100000000, 'R$ 1.000.000,00'],
  ])('formats %i cents as BRL', (cents, expected) => {
    expect(formatBRLCents(cents)).toBe(expected);
  });

  test.each([
    ['', null],
    ['   ', null],
    ['R$ 1.234,56', 123456],
    ['0,01', 1],
    ['12', 1200],
    ['12,3', 1230],
    ['abc', null],
    ['1,234', null],
    ['1.2,00', null],
  ])('parses %p safely', (input, expected) => {
    expect(parseBRLToCents(input)).toBe(expected);
  });

  it('rejects values beyond the accepted safe limit', () => {
    expect(parseBRLToCents('1.000.000.000,00')).toBeNull();
    expect(() => formatBRLCents(MAX_CURRENCY_CENTS + 1)).toThrow(RangeError);
  });

  it('converts digit-mask input directly to integer cents', () => {
    expect(parseCurrencyDigits('R$ 12,34')).toBe(1234);
    expect(parseCurrencyDigits('')).toBeNull();
  });
});
