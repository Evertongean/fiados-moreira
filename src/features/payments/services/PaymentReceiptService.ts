import {
  buildPaymentReceiptHtml,
  getPaymentReceiptId,
} from '@/features/payments/domain/paymentReceipt';
import type { PaymentReceiptDetails } from '@/features/payments/domain/paymentTypes';

export interface GeneratedPaymentReceipt {
  uri: string;
  receiptId: string;
}

export interface PaymentReceiptPdfGateway {
  createPdf(html: string, receiptId: string): Promise<GeneratedPaymentReceipt>;
  sharePdf(file: GeneratedPaymentReceipt): Promise<void>;
  removePdf(file: GeneratedPaymentReceipt): Promise<void>;
}

export class PaymentReceiptService {
  constructor(private readonly gateway: PaymentReceiptPdfGateway) {}

  generate(
    receipt: PaymentReceiptDetails,
    timezone: string,
    issuedAt = new Date(),
  ): Promise<GeneratedPaymentReceipt> {
    return this.gateway.createPdf(
      buildPaymentReceiptHtml(receipt, timezone, issuedAt),
      getPaymentReceiptId(receipt.id),
    );
  }

  share(file: GeneratedPaymentReceipt): Promise<void> {
    return this.gateway.sharePdf(file);
  }

  remove(file: GeneratedPaymentReceipt): Promise<void> {
    return this.gateway.removePdf(file);
  }
}
