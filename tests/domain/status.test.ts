import { calculateDebtStatus } from '@/features/debts/domain/status';
import { calculateDebtSummary } from '@/features/debts/domain/finance';

const referenceDate = new Date('2026-01-15T01:30:00.000Z');
const timezone = 'America/Fortaleza';

function status(
  total: number,
  paid: number,
  dueDate: string | null,
  canceledAt: string | null = null,
) {
  return calculateDebtStatus({
    summary: calculateDebtSummary(total, paid ? [{ amountCents: paid, reversed: false }] : []),
    canceledAt,
    dueDate,
    timezone,
    referenceDate,
  });
}

describe('derived debt status', () => {
  it('distinguishes pending, partial, paid and canceled', () => {
    expect(status(100, 0, null).financialStatus).toBe('pending');
    expect(status(100, 50, null).financialStatus).toBe('partially_paid');
    expect(status(100, 100, null).financialStatus).toBe('paid');
    expect(status(100, 0, null, '2026-01-01T00:00:00Z').financialStatus).toBe('canceled');
  });

  it('treats partial debts as overdue but not debts due today', () => {
    expect(status(100, 50, '2026-01-13').isOverdue).toBe(true);
    expect(status(100, 50, '2026-01-14').isOverdue).toBe(false);
  });

  it('does not mark no-due-date, paid or canceled debts overdue', () => {
    expect(status(100, 0, null).isOverdue).toBe(false);
    expect(status(100, 100, '2020-01-01').isOverdue).toBe(false);
    expect(status(100, 0, '2020-01-01', '2026-01-01T00:00:00Z').isOverdue).toBe(false);
  });

  it('uses the workspace civil day across a UTC boundary', () => {
    expect(status(100, 0, '2026-01-14').isOverdue).toBe(false);
  });
});
