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
