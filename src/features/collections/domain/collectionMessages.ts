import { formatBRLCents } from '@/utils/currency';
import { formatCivilDate, getCivilDate } from '@/utils/date';

import type {
  CollectionTemplateType,
  CollectionTemplates,
  CollectionVariables,
} from './collectionTypes';

export const COLLECTION_TEMPLATES_KEY = 'collection.templates.v1';

export const COLLECTION_TEMPLATE_LABELS: Record<CollectionTemplateType, string> = {
  before_due: 'Lembrete antes do vencimento',
  due_date: 'Cobrança no dia do vencimento',
  overdue: 'Cobrança de fiado atrasado',
  no_due: 'Cobrança amigável sem vencimento',
};

export const DEFAULT_COLLECTION_TEMPLATES: CollectionTemplates = {
  before_due:
    'Olá, {cliente}! Tudo bem? Passando para lembrar que o serviço {servico}, com saldo de {saldo_pendente}, vence em {vencimento}. Se precisar, estamos à disposição. {oficina}',
  due_date:
    'Olá, {cliente}! Tudo bem? O saldo de {saldo_pendente}, referente a {servico}, vence hoje. Quando puder, entre em contato para combinarmos o pagamento. {oficina}',
  overdue:
    'Olá, {cliente}! Tudo bem? Identificamos um saldo pendente de {saldo_pendente}, referente a {servico}, vencido há {dias_atraso} dia(s). Podemos combinar a melhor forma de regularização? {oficina}',
  no_due:
    'Olá, {cliente}! Tudo bem? Gostaríamos de lembrar, de forma amigável, do saldo de {saldo_pendente}, referente a {servico}. Quando puder, entre em contato para combinarmos o pagamento. {oficina}',
};

export const COLLECTION_VARIABLES = [
  '{cliente}',
  '{oficina}',
  '{servico}',
  '{valor_original}',
  '{valor_pago}',
  '{saldo_pendente}',
  '{vencimento}',
  '{dias_atraso}',
] as const;

export function calculateOverdueDays(dueDate: string | null, today: string): number {
  if (!dueDate || dueDate >= today) return 0;
  const due = Date.parse(`${dueDate}T12:00:00.000Z`);
  const current = Date.parse(`${today}T12:00:00.000Z`);
  return Math.max(0, Math.round((current - due) / 86_400_000));
}

export function recommendCollectionTemplate(
  dueDate: string | null,
  timezone: string,
  now = new Date(),
): CollectionTemplateType {
  if (!dueDate) return 'no_due';
  const today = getCivilDate(now, timezone);
  if (dueDate < today) return 'overdue';
  return dueDate === today ? 'due_date' : 'before_due';
}

export function renderCollectionMessage(template: string, variables: CollectionVariables): string {
  const values: Record<string, string> = {
    cliente: variables.customerName,
    oficina: variables.workshopName,
    servico: variables.serviceDescription || 'serviços em aberto',
    valor_original: formatBRLCents(variables.originalCents),
    valor_pago: formatBRLCents(variables.paidCents),
    saldo_pendente: formatBRLCents(variables.pendingCents),
    vencimento: formatCivilDate(variables.dueDate) ?? 'sem vencimento definido',
    dias_atraso: String(Math.max(0, variables.overdueDays)),
  };
  return template
    .replace(/\{([a-z_]+)\}/g, (match, name: string) => values[name] ?? match)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export function buildWhatsAppUrl(internationalPhone: string, message: string): string {
  return `https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`;
}
