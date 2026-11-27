import type { collectionTemplateTypes } from '@/database/schema';

export type CollectionTemplateType = (typeof collectionTemplateTypes)[number];
export type CollectionScope = 'debt' | 'customer';

export interface CollectionTemplates {
  before_due: string;
  due_date: string;
  overdue: string;
  no_due: string;
}

export interface CollectionVariables {
  customerName: string;
  workshopName: string;
  serviceDescription: string;
  originalCents: number;
  paidCents: number;
  pendingCents: number;
  dueDate: string | null;
  overdueDays: number;
}

export interface CollectionDraft {
  scope: CollectionScope;
  targetId: string;
  customerId: string;
  customerName: string;
  recipient: string;
  templateType: CollectionTemplateType;
  templates: CollectionTemplates;
  variables: CollectionVariables;
  message: string;
}

export interface CollectionAttempt {
  id: string;
  debtId: string | null;
  debtDescription: string | null;
  templateType: CollectionTemplateType;
  attemptedAt: string;
}

export interface CollectionDebtContext {
  debtId: string;
  customerId: string;
  customerName: string;
  whatsapp: string | null;
  phone: string | null;
  workshopName: string;
  description: string;
  totalCents: number;
  paidCents: number;
  pendingCents: number;
  dueDate: string | null;
  canceledAt: string | null;
}
