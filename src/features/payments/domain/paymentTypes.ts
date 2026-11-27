import type { PaymentMethod } from '@/database/schema';

export interface PaymentDetails {
  id: string;
  workspaceId: string;
  debtId: string;
  operationId: string;
  amountCents: number;
  paymentMethod: PaymentMethod;
  paidAt: string;
  notes: string | null;
  createdAt: string;
  debtDescription: string;
  debtCanceledAt: string | null;
  customerId: string;
  customerName: string;
  reversalId: string | null;
  reversalReason: string | null;
  reversedAt: string | null;
}

export interface PaymentReceiptDetails extends PaymentDetails {
  workshopName: string;
  originalDebtCents: number | null;
  debtTotalAtPaymentCents: number | null;
  totalPaidAtPaymentCents: number | null;
  remainingAtPaymentCents: number | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehiclePlate: string | null;
}
