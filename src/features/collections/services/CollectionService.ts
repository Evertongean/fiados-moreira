import type { CollectionRepository } from '@/database/repositories/collection.repository';
import type { SettingsRepository } from '@/database/repositories/settings.repository';
import {
  buildWhatsAppUrl,
  calculateOverdueDays,
  COLLECTION_TEMPLATES_KEY,
  DEFAULT_COLLECTION_TEMPLATES,
  recommendCollectionTemplate,
  renderCollectionMessage,
} from '@/features/collections/domain/collectionMessages';
import { normalizeWhatsAppPhone } from '@/features/collections/domain/collectionPhone';
import type {
  CollectionDebtContext,
  CollectionDraft,
  CollectionScope,
  CollectionTemplateType,
  CollectionTemplates,
  CollectionVariables,
} from '@/features/collections/domain/collectionTypes';
import { getCivilDate } from '@/utils/date';

export interface WhatsAppGateway {
  canOpen(url: string): Promise<boolean>;
  open(url: string): Promise<void>;
}

export class CollectionError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'NO_OUTSTANDING_BALANCE'
      | 'DEBT_CANCELED'
      | 'INVALID_PHONE'
      | 'EMPTY_MESSAGE'
      | 'BALANCE_CHANGED'
      | 'WHATSAPP_UNAVAILABLE',
    message: string,
  ) {
    super(message);
    this.name = 'CollectionError';
  }
}

export class CollectionService {
  constructor(
    private readonly repository: CollectionRepository,
    private readonly settings: SettingsRepository,
    private readonly gateway: WhatsAppGateway,
  ) {}

  async getTemplates(workspaceId: string): Promise<CollectionTemplates> {
    const stored = await this.settings.get<Partial<CollectionTemplates>>(
      workspaceId,
      COLLECTION_TEMPLATES_KEY,
    );
    return { ...DEFAULT_COLLECTION_TEMPLATES, ...stored };
  }

  async saveTemplates(
    workspaceId: string,
    templates: CollectionTemplates,
  ): Promise<CollectionTemplates> {
    const normalized = Object.fromEntries(
      Object.entries(templates).map(([key, value]) => [key, value.trim()]),
    ) as unknown as CollectionTemplates;
    if (Object.values(normalized).some((value) => !value)) {
      throw new CollectionError('EMPTY_MESSAGE', 'Os modelos não podem ficar vazios.');
    }
    await this.settings.set(workspaceId, COLLECTION_TEMPLATES_KEY, normalized);
    return normalized;
  }

  async prepareDebt(
    workspaceId: string,
    debtId: string,
    timezone: string,
    templateType?: CollectionTemplateType,
    now = new Date(),
  ): Promise<CollectionDraft> {
    const context = await this.repository.findDebtContext(workspaceId, debtId);
    if (!context) throw new CollectionError('NOT_FOUND', 'Fiado não encontrado.');
    this.assertDebtEligible(context);
    const templates = await this.getTemplates(workspaceId);
    const selected = templateType ?? recommendCollectionTemplate(context.dueDate, timezone, now);
    const variables = this.toVariables(context, timezone, now);
    return this.toDraft('debt', debtId, context, selected, templates, variables);
  }

  async prepareCustomer(
    workspaceId: string,
    customerId: string,
    timezone: string,
    templateType?: CollectionTemplateType,
    now = new Date(),
  ): Promise<CollectionDraft> {
    const rows = await this.repository.listCustomerDebtContexts(workspaceId, customerId);
    if (!rows.length) throw new CollectionError('NOT_FOUND', 'Cliente não encontrado.');
    const eligible = rows.filter((row) => !row.canceledAt && row.pendingCents > 0);
    if (!eligible.length) {
      throw new CollectionError('NO_OUTSTANDING_BALANCE', 'O cliente não possui saldo pendente.');
    }
    const first = eligible[0] as CollectionDebtContext;
    const today = getCivilDate(now, timezone);
    const mostRelevant =
      eligible.find((row) => row.dueDate && row.dueDate < today) ??
      eligible.find((row) => row.dueDate === today) ??
      eligible.find((row) => row.dueDate) ??
      first;
    const templates = await this.getTemplates(workspaceId);
    const selected =
      templateType ?? recommendCollectionTemplate(mostRelevant.dueDate, timezone, now);
    const variables: CollectionVariables = {
      customerName: first.customerName,
      workshopName: first.workshopName,
      serviceDescription:
        eligible.length === 1 ? first.description : `${eligible.length} serviços em aberto`,
      originalCents: eligible.reduce((total, row) => total + row.totalCents, 0),
      paidCents: eligible.reduce((total, row) => total + row.paidCents, 0),
      pendingCents: eligible.reduce((total, row) => total + row.pendingCents, 0),
      dueDate: mostRelevant.dueDate,
      overdueDays: Math.max(0, ...eligible.map((row) => calculateOverdueDays(row.dueDate, today))),
    };
    return this.toDraft('customer', customerId, first, selected, templates, variables);
  }

  async openWhatsApp(input: {
    workspaceId: string;
    scope: CollectionScope;
    targetId: string;
    timezone: string;
    templateType: CollectionTemplateType;
    message: string;
    expectedPendingCents: number;
  }): Promise<void> {
    const message = input.message.trim();
    if (!message) throw new CollectionError('EMPTY_MESSAGE', 'Informe uma mensagem.');
    const current =
      input.scope === 'debt'
        ? await this.prepareDebt(
            input.workspaceId,
            input.targetId,
            input.timezone,
            input.templateType,
          )
        : await this.prepareCustomer(
            input.workspaceId,
            input.targetId,
            input.timezone,
            input.templateType,
          );
    if (current.variables.pendingCents !== input.expectedPendingCents) {
      throw new CollectionError(
        'BALANCE_CHANGED',
        'O saldo mudou. Atualize a mensagem antes de continuar.',
      );
    }
    const url = buildWhatsAppUrl(current.recipient, message);
    try {
      if (!(await this.gateway.canOpen(url))) {
        throw new CollectionError('WHATSAPP_UNAVAILABLE', 'O WhatsApp não está disponível.');
      }
      await this.gateway.open(url);
    } catch (error) {
      if (error instanceof CollectionError) throw error;
      throw new CollectionError('WHATSAPP_UNAVAILABLE', 'Não foi possível abrir o WhatsApp.');
    }
    await this.repository.recordAttempt({
      workspaceId: input.workspaceId,
      customerId: current.customerId,
      debtId: input.scope === 'debt' ? input.targetId : null,
      templateType: input.templateType,
    });
  }

  private assertDebtEligible(context: CollectionDebtContext): void {
    if (context.canceledAt) {
      throw new CollectionError('DEBT_CANCELED', 'Fiados cancelados não podem ser cobrados.');
    }
    if (context.pendingCents <= 0) {
      throw new CollectionError('NO_OUTSTANDING_BALANCE', 'Este fiado não possui saldo pendente.');
    }
  }

  private toVariables(
    context: CollectionDebtContext,
    timezone: string,
    now: Date,
  ): CollectionVariables {
    return {
      customerName: context.customerName,
      workshopName: context.workshopName,
      serviceDescription: context.description,
      originalCents: context.totalCents,
      paidCents: context.paidCents,
      pendingCents: context.pendingCents,
      dueDate: context.dueDate,
      overdueDays: calculateOverdueDays(context.dueDate, getCivilDate(now, timezone)),
    };
  }

  private toDraft(
    scope: CollectionScope,
    targetId: string,
    context: CollectionDebtContext,
    templateType: CollectionTemplateType,
    templates: CollectionTemplates,
    variables: CollectionVariables,
  ): CollectionDraft {
    const recipient =
      normalizeWhatsAppPhone(context.whatsapp) ?? normalizeWhatsAppPhone(context.phone);
    if (!recipient) {
      throw new CollectionError('INVALID_PHONE', 'O cliente não possui um telefone válido.');
    }
    return {
      scope,
      targetId,
      customerId: context.customerId,
      customerName: context.customerName,
      recipient,
      templateType,
      templates,
      variables,
      message: renderCollectionMessage(templates[templateType], variables),
    };
  }
}
