import type { PaymentReceiptDetails } from '@/features/payments/domain/paymentTypes';
import { PAYMENT_METHOD_LABELS } from '@/features/payments/domain/paymentUtils';
import { formatVehicleLabel } from '@/features/debts/domain/debtUtils';
import { formatBRLCents } from '@/utils/currency';

export function getPaymentReceiptId(paymentId: string): string {
  return `FM-${paymentId.toUpperCase()}`;
}

export function escapeReceiptHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPaymentReceiptHtml(
  receipt: PaymentReceiptDetails,
  timezone: string,
  issuedAt = new Date(),
): string {
  const vehicle = formatVehicleLabel({
    brand: receipt.vehicleBrand,
    model: receipt.vehicleModel,
    plate: receipt.vehiclePlate,
  });
  const isReversed = receipt.reversalId !== null;
  const historicalAvailable =
    receipt.debtTotalAtPaymentCents !== null &&
    receipt.totalPaidAtPaymentCents !== null &&
    receipt.remainingAtPaymentCents !== null;
  const rows: [string, string][] = [
    ['Cliente', receipt.customerName],
    ...(vehicle ? ([['Veículo', vehicle]] as [string, string][]) : []),
    ['Serviço', receipt.debtDescription],
    [
      'Valor original do fiado',
      receipt.originalDebtCents === null
        ? 'Não disponível'
        : formatBRLCents(receipt.originalDebtCents),
    ],
    ['Valor do pagamento', formatBRLCents(receipt.amountCents)],
    ['Método', PAYMENT_METHOD_LABELS[receipt.paymentMethod]],
    ['Data do recebimento', formatReceiptInstant(receipt.paidAt, timezone, false)],
    ...(historicalAvailable
      ? ([
          ['Total pago após a operação', formatBRLCents(receipt.totalPaidAtPaymentCents as number)],
          ['Saldo após a operação', formatBRLCents(receipt.remainingAtPaymentCents as number)],
          [
            'Tipo da operação',
            receipt.remainingAtPaymentCents === 0 ? 'Pagamento total' : 'Pagamento parcial',
          ],
        ] as [string, string][])
      : []),
    ['Situação', isReversed ? 'Estornado' : 'Confirmado'],
  ];
  const detailRows = rows
    .map(
      ([label, value]) =>
        `<div class="row"><span class="label">${escapeReceiptHtml(label)}</span><span class="value">${escapeReceiptHtml(value)}</span></div>`,
    )
    .join('');
  const historyNotice = historicalAvailable
    ? ''
    : '<p class="notice">Total pago e saldo após a operação foram omitidos porque o registro não contém um snapshot histórico suficiente.</p>';
  const reversalNotice = isReversed
    ? `<div class="reversal"><strong>Pagamento estornado</strong><span>Este documento identifica um pagamento que foi posteriormente estornado${receipt.reversedAt ? ` em ${escapeReceiptHtml(formatReceiptInstant(receipt.reversedAt, timezone, false))}` : ''}.</span></div>`
    : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #17211d; background: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.5; }
    .document { width: 100%; max-width: 178mm; margin: 0 auto; }
    .header { padding-bottom: 18px; border-bottom: 2px solid #184d37; }
    .brand { color: #184d37; font-size: 22px; font-weight: 700; }
    .document-title { margin: 16px 0 3px; font-size: 19px; letter-spacing: .4px; }
    .subtitle { margin: 0; color: #5c6b64; }
    .meta { margin: 18px 0; padding: 12px 14px; border-radius: 10px; background: #eef7f1; overflow-wrap: anywhere; }
    .meta div + div { margin-top: 3px; }
    .details { border: 1px solid #d7e2dc; border-radius: 10px; overflow: hidden; }
    .row { display: flex; gap: 18px; padding: 10px 12px; border-bottom: 1px solid #e5ece8; page-break-inside: avoid; }
    .row:last-child { border-bottom: 0; }
    .label { width: 42%; flex: 0 0 42%; color: #5c6b64; }
    .value { flex: 1; font-weight: 600; text-align: right; overflow-wrap: anywhere; white-space: pre-wrap; }
    .reversal { display: flex; flex-direction: column; gap: 4px; margin-top: 16px; padding: 12px 14px; border: 1px solid #b91c1c; border-radius: 10px; color: #7f1d1d; background: #fff1f2; page-break-inside: avoid; }
    .notice { margin: 16px 0 0; padding: 10px 12px; border-left: 3px solid #64748b; color: #475569; background: #f8fafc; page-break-inside: avoid; }
    .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #d7e2dc; color: #64748b; font-size: 10px; }
    .footer strong { color: #33443c; }
  </style>
</head>
<body>
  <main class="document">
    <header class="header">
      <div class="brand">${escapeReceiptHtml(receipt.workshopName)}</div>
      <h1 class="document-title">COMPROVANTE DE PAGAMENTO</h1>
      <p class="subtitle">Documento gerado localmente pelo Fiados Moreira</p>
    </header>
    <section class="meta">
      <div><strong>Identificador:</strong> ${escapeReceiptHtml(getPaymentReceiptId(receipt.id))}</div>
      <div><strong>Emitido em:</strong> ${escapeReceiptHtml(formatReceiptInstant(issuedAt.toISOString(), timezone, true))}</div>
    </section>
    <section class="details">${detailRows}</section>
    ${reversalNotice}
    ${historyNotice}
    <footer class="footer">
      <strong>Fiados Moreira</strong><br />
      Comprovante de pagamento. Este documento não é nota fiscal e não substitui documentos fiscais obrigatórios.
    </footer>
  </main>
</body>
</html>`;
}

export function formatReceiptInstant(
  value: string,
  timezone: string,
  includeTime: boolean,
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    ...(includeTime ? { timeStyle: 'short' as const } : {}),
    timeZone: timezone,
  }).format(date);
}
