import { AppDatabaseError } from '@/database/errors/DatabaseError';
import { isValidCents, MAX_CURRENCY_CENTS } from '@/utils/currency';

export interface PaymentAmount {
  amountCents: number;
  reversed: boolean;
}

export interface DebtFinancialSummary {
  originalCents: number;
  grossPaidCents: number;
  reversedCents: number;
  netPaidCents: number;
  pendingCents: number;
  paidPercentage: number;
  isPaid: boolean;
}

function assertMoney(value: number, allowZero = true): void {
  if (
    !isValidCents(value) ||
    value > MAX_CURRENCY_CENTS ||
    (!allowZero && value <= 0) ||
    value < 0
  ) {
    throw new AppDatabaseError('INVALID_AMOUNT', 'Valor monetário inválido.');
  }
}

function safeAdd(total: number, amount: number): number {
  const result = total + amount;
  assertMoney(result);
  return result;
}

export function calculateDebtSummary(
  originalCents: number,
  payments: readonly PaymentAmount[],
): DebtFinancialSummary {
  assertMoney(originalCents, false);
  let grossPaidCents = 0;
  let reversedCents = 0;

  for (const payment of payments) {
    assertMoney(payment.amountCents, false);
    grossPaidCents = safeAdd(grossPaidCents, payment.amountCents);
    if (payment.reversed) reversedCents = safeAdd(reversedCents, payment.amountCents);
  }

  return calculateDebtSummaryFromTotals(originalCents, grossPaidCents, reversedCents);
}

export function calculateDebtSummaryFromTotals(
  originalCents: number,
  grossPaidCents: number,
  reversedCents: number,
): DebtFinancialSummary {
  assertMoney(originalCents, false);
  assertMoney(grossPaidCents);
  assertMoney(reversedCents);
  const netPaidCents = grossPaidCents - reversedCents;
  const pendingCents = originalCents - netPaidCents;
  if (netPaidCents < 0 || pendingCents < 0) {
    throw new AppDatabaseError(
      'INVALID_AMOUNT',
      'O histórico financeiro produz um saldo inválido.',
    );
  }

  return {
    originalCents,
    grossPaidCents,
    reversedCents,
    netPaidCents,
    pendingCents,
    paidPercentage: (netPaidCents / originalCents) * 100,
    isPaid: pendingCents === 0,
  };
}
