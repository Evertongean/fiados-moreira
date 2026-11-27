import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type {
  GeneratedPaymentReceipt,
  PaymentReceiptPdfGateway,
} from '@/features/payments/services/PaymentReceiptService';

export class ExpoPaymentReceiptPdfGateway implements PaymentReceiptPdfGateway {
  async createPdf(html: string, receiptId: string): Promise<GeneratedPaymentReceipt> {
    const result = await Print.printToFileAsync({ html, base64: false });
    return { uri: result.uri, receiptId };
  }

  async sharePdf(file: GeneratedPaymentReceipt): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Compartilhamento indisponível neste dispositivo.');
    }
    await Sharing.shareAsync(file.uri, {
      dialogTitle: 'Compartilhar comprovante de pagamento',
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
    });
  }

  async removePdf(file: GeneratedPaymentReceipt): Promise<void> {
    const temporaryFile = new File(file.uri);
    if (temporaryFile.exists) temporaryFile.delete();
  }
}
