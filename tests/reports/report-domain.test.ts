import {
  buildReportCsv,
  buildReportFilename,
  escapeCsvCell,
} from '@/features/reports/domain/reportCsv';
import { resolveReportDateRange } from '@/features/reports/domain/reportPeriods';
import { bucketReceiptSeries } from '@/features/reports/domain/reportSeries';
import type { FinancialReportSnapshot } from '@/features/reports/domain/reportTypes';
import {
  ReportExportService,
  type ReportFileGateway,
} from '@/features/reports/services/ReportExportService';

const timezone = 'America/Fortaleza';

describe('report periods', () => {
  const reference = new Date('2026-11-27T12:00:00.000Z');
  const resolve = (period: Parameters<typeof resolveReportDateRange>[0]['period']) =>
    resolveReportDateRange(
      { period, paymentMethod: 'all', financialStatus: 'all' },
      timezone,
      reference,
    );

  it.each([
    ['today', '2026-11-27', '2026-11-28'],
    ['last_7_days', '2026-11-21', '2026-11-28'],
    ['last_30_days', '2026-10-29', '2026-11-28'],
    ['this_month', '2026-11-01', '2026-12-01'],
    ['previous_month', '2026-10-01', '2026-11-01'],
    ['this_year', '2026-01-01', '2027-01-01'],
  ] as const)('resolves %s in workspace civil time', (period, start, end) => {
    expect(resolve(period)).toMatchObject({ startCivilDate: start, endCivilDateExclusive: end });
  });

  it('validates custom inclusive limits', () => {
    expect(
      resolveReportDateRange(
        {
          period: 'custom',
          customStartDate: '2026-02-01',
          customEndDate: '2026-02-28',
          paymentMethod: 'all',
          financialStatus: 'all',
        },
        timezone,
        reference,
      ),
    ).toMatchObject({ startCivilDate: '2026-02-01', endCivilDateExclusive: '2026-03-01' });
    expect(() =>
      resolveReportDateRange(
        {
          period: 'custom',
          customStartDate: '2026-02-30',
          customEndDate: '2026-02-01',
          paymentMethod: 'all',
          financialStatus: 'all',
        },
        timezone,
        reference,
      ),
    ).toThrow('período personalizado válido');
  });
});

describe('report CSV export', () => {
  const snapshot: FinancialReportSnapshot = {
    range: {
      startCivilDate: '2026-11-01',
      endCivilDateExclusive: '2026-12-01',
      startAt: '2026-11-01T03:00:00.000Z',
      endAt: '2026-12-01T03:00:00.000Z',
      label: '01/11/2026 a 30/11/2026',
    },
    currentCivilDate: '2026-11-27',
    summary: {
      currentReceivableCents: 12_345,
      currentOverdueCents: 12_345,
      currentOpenDebtCount: 1,
      grossReceivedCents: 2_000,
      reversedCents: 0,
      netReceivedCents: 2_000,
      paymentCount: 1,
      reversalCount: 0,
    },
    dailyReceipts: [],
    methodBreakdown: [],
    customerRanking: [],
    receivables: [
      {
        debtId: 'debt-1',
        customerId: 'customer-1',
        customerName: '=SOMAR(A1:A2)',
        description: 'Troca de óleo, filtro e "limpeza"',
        dueDate: '2026-11-20',
        originalCents: 14_345,
        paidCents: 2_000,
        pendingCents: 12_345,
        financialStatus: 'partially_paid',
      },
    ],
    overdueDebts: [],
    movements: [],
  };

  it('uses UTF-8 BOM, Brazilian values, escaping and formula protection', () => {
    const csv = buildReportCsv('receivables', snapshot, timezone);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"\'=SOMAR(A1:A2)"');
    expect(csv).toContain('"Troca de óleo, filtro e ""limpeza"""');
    expect(csv).toContain('"123,45"');
    expect(csv).toContain('\r\n');
    expect(escapeCsvCell('+1+1')).toBe('"\'+1+1"');
    expect(buildReportFilename('receivables', snapshot)).toBe(
      'valores-a-receber-2026-11-01-2026-11-30.csv',
    );
  });

  it('delegates a filtered CSV to the temporary sharing gateway', async () => {
    class Gateway implements ReportFileGateway {
      filename = '';
      content = '';
      async shareTemporaryCsv(filename: string, content: string) {
        this.filename = filename;
        this.content = content;
      }
    }
    const gateway = new Gateway();
    await new ReportExportService(gateway).exportAndShare('receivables', snapshot, timezone);
    expect(gateway.filename).toContain('valores-a-receber-2026-11-01');
    expect(gateway.content).toContain('=SOMAR');
  });
});

describe('report chart buckets', () => {
  it('preserves totals while limiting chart density', () => {
    const values = Array.from({ length: 30 }, (_, index) => ({
      civilDate: `2026-11-${String(index + 1).padStart(2, '0')}`,
      grossCents: 100,
      reversedCents: index % 2 ? 25 : 0,
      netCents: index % 2 ? 75 : 100,
    }));
    const buckets = bucketReceiptSeries(values, 12);
    expect(buckets.length).toBeLessThanOrEqual(12);
    expect(buckets.reduce((total, item) => total + item.grossCents, 0)).toBe(3_000);
    expect(buckets.reduce((total, item) => total + item.reversedCents, 0)).toBe(375);
  });
});
