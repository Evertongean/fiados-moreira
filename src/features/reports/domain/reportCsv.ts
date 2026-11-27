import { PAYMENT_METHOD_LABELS } from '@/features/payments/domain/paymentUtils';
import type { FinancialReportSnapshot, ReportKind } from '@/features/reports/domain/reportTypes';
import { formatCivilDate } from '@/utils/date';

const CSV_SEPARATOR = ';';
const CSV_LINE_BREAK = '\r\n';

export function buildReportCsv(
  kind: ReportKind,
  snapshot: FinancialReportSnapshot,
  timezone: string,
): string {
  const rows =
    kind === 'summary'
      ? buildSummaryRows(snapshot)
      : kind === 'received'
        ? buildMovementRows(snapshot, timezone)
        : buildDebtRows(kind, snapshot);
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(CSV_SEPARATOR)).join(CSV_LINE_BREAK)}${CSV_LINE_BREAK}`;
}

export function buildReportFilename(kind: ReportKind, snapshot: FinancialReportSnapshot): string {
  const label: Record<ReportKind, string> = {
    summary: 'resumo-financeiro',
    receivables: 'valores-a-receber',
    received: 'recebimentos',
    overdue: 'fiados-atrasados',
  };
  const end = previousCivilDay(snapshot.range.endCivilDateExclusive);
  return `${label[kind]}-${snapshot.range.startCivilDate}-${end}.csv`;
}

export function escapeCsvCell(value: string | number): string {
  const raw = String(value);
  const protectedValue = /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}

function buildSummaryRows(snapshot: FinancialReportSnapshot): (string | number)[][] {
  const { summary, range } = snapshot;
  return [
    ['Indicador', 'Valor', 'Período'],
    ['Saldo atual a receber', csvMoney(summary.currentReceivableCents), 'Posição atual'],
    ['Saldo atual em atraso', csvMoney(summary.currentOverdueCents), 'Posição atual'],
    ['Fiados em aberto', summary.currentOpenDebtCount, 'Posição atual'],
    ['Recebimentos brutos', csvMoney(summary.grossReceivedCents), range.label],
    ['Estornos efetivados', csvMoney(summary.reversedCents), range.label],
    ['Recebimentos líquidos', csvMoney(summary.netReceivedCents), range.label],
    ['Pagamentos no período', summary.paymentCount, range.label],
    ['Estornos no período', summary.reversalCount, range.label],
  ];
}

function buildDebtRows(
  kind: 'receivables' | 'overdue',
  snapshot: FinancialReportSnapshot,
): (string | number)[][] {
  const items = kind === 'overdue' ? snapshot.overdueDebts : snapshot.receivables;
  return [
    ['Cliente', 'Serviço', 'Vencimento', 'Valor original', 'Valor pago', 'Saldo atual', 'Situação'],
    ...items.map((item) => [
      item.customerName,
      item.description,
      formatCivilDate(item.dueDate) ?? 'Sem vencimento',
      csvMoney(item.originalCents),
      csvMoney(item.paidCents),
      csvMoney(item.pendingCents),
      item.financialStatus === 'partially_paid' ? 'Parcialmente pago' : 'Pendente',
    ]),
  ];
}

function buildMovementRows(
  snapshot: FinancialReportSnapshot,
  timezone: string,
): (string | number)[][] {
  return [
    ['Evento', 'Data efetiva', 'Cliente', 'Serviço', 'Método', 'Bruto', 'Estorno', 'Líquido'],
    ...snapshot.movements.map((item) => {
      const isPayment = item.type === 'payment';
      return [
        isPayment ? 'Pagamento' : 'Estorno',
        formatInstant(item.occurredAt, timezone),
        item.customerName,
        item.debtDescription,
        PAYMENT_METHOD_LABELS[item.paymentMethod],
        csvMoney(isPayment ? item.amountCents : 0),
        csvMoney(isPayment ? 0 : item.amountCents),
        csvMoney(isPayment ? item.amountCents : -item.amountCents),
      ];
    }),
  ];
}

function csvMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)},${String(absolute % 100).padStart(2, '0')}`;
}

function formatInstant(value: string, timezone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(date);
}

function previousCivilDay(exclusiveDate: string): string {
  const date = new Date(`${exclusiveDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
