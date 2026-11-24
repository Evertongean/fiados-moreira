import { AppDatabaseError } from '@/database/errors/DatabaseError';
import { calculateDebtSummary } from '@/features/debts/domain/finance';
import { MAX_CURRENCY_CENTS } from '@/utils/currency';

describe('debt financial calculations', () => {
  it('calculates partial payments using integer cents', () => {
    expect(
      calculateDebtSummary(50_000, [
        { amountCents: 10_000, reversed: false },
        { amountCents: 15_000, reversed: false },
      ]),
    ).toEqual({
      originalCents: 50_000,
      grossPaidCents: 25_000,
      reversedCents: 0,
      netPaidCents: 25_000,
      pendingCents: 25_000,
      paidPercentage: 50,
      isPaid: false,
    });
  });

  it('excludes fully reversed payments from net paid', () => {
    const summary = calculateDebtSummary(50_000, [{ amountCents: 20_000, reversed: true }]);
    expect(summary).toMatchObject({
      grossPaidCents: 20_000,
      reversedCents: 20_000,
      pendingCents: 50_000,
    });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, MAX_CURRENCY_CENTS + 1])(
    'rejects invalid original amount %p',
    (amount) => expect(() => calculateDebtSummary(amount, [])).toThrow(AppDatabaseError),
  );

  it('does not hide a negative balance', () => {
    expect(() => calculateDebtSummary(100, [{ amountCents: 101, reversed: false }])).toThrow(
      'saldo inválido',
    );
  });
});
