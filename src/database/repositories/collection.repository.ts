import type { SqlExecutor } from '@/database/types/executor';
import type {
  CollectionAttempt,
  CollectionDebtContext,
  CollectionTemplateType,
} from '@/features/collections/domain/collectionTypes';
import { createUuid } from '@/utils/uuid';

type CustomerDebtContext = CollectionDebtContext;

const CONTEXT_SELECT = `select d.id as debtId, d.customer_id as customerId,
  c.name as customerName, c.whatsapp, c.phone, w.name as workshopName,
  d.description, d.total_cents as totalCents, d.due_date as dueDate,
  d.canceled_at as canceledAt,
  coalesce(sum(case when r.id is null then p.amount_cents else 0 end), 0) as paidCents,
  d.total_cents - coalesce(sum(case when r.id is null then p.amount_cents else 0 end), 0) as pendingCents
  from debts d
  inner join customers c on c.workspace_id = d.workspace_id and c.id = d.customer_id
  inner join workspaces w on w.id = d.workspace_id
  left join payments p on p.workspace_id = d.workspace_id and p.debt_id = d.id
  left join payment_reversals r on r.workspace_id = p.workspace_id and r.payment_id = p.id`;

const CONTEXT_GROUP = `group by d.id, d.customer_id, c.name, c.whatsapp, c.phone, w.name,
  d.description, d.total_cents, d.due_date, d.canceled_at`;

export class CollectionRepository {
  constructor(private readonly executor: SqlExecutor) {}

  findDebtContext(workspaceId: string, debtId: string): Promise<CollectionDebtContext | null> {
    return this.executor.get<CollectionDebtContext>(
      `${CONTEXT_SELECT} where d.workspace_id = ? and d.id = ? ${CONTEXT_GROUP}`,
      [workspaceId, debtId],
    );
  }

  listCustomerDebtContexts(
    workspaceId: string,
    customerId: string,
  ): Promise<CustomerDebtContext[]> {
    return this.executor.all<CustomerDebtContext>(
      `${CONTEXT_SELECT} where d.workspace_id = ? and d.customer_id = ? ${CONTEXT_GROUP}
       order by d.due_date is null, d.due_date, d.created_at`,
      [workspaceId, customerId],
    );
  }

  async recordAttempt(input: {
    workspaceId: string;
    customerId: string;
    debtId: string | null;
    templateType: CollectionTemplateType;
    attemptedAt?: string;
  }): Promise<string> {
    const id = createUuid();
    const attemptedAt = input.attemptedAt ?? new Date().toISOString();
    await this.executor.run(
      `insert into collection_attempts
       (id, workspace_id, customer_id, debt_id, template_type, attempted_at, created_at)
       values (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.workspaceId,
        input.customerId,
        input.debtId,
        input.templateType,
        attemptedAt,
        attemptedAt,
      ],
    );
    return id;
  }

  listAttempts(workspaceId: string, customerId: string, limit = 20): Promise<CollectionAttempt[]> {
    return this.executor.all<CollectionAttempt>(
      `select a.id, a.debt_id as debtId, d.description as debtDescription,
       a.template_type as templateType, a.attempted_at as attemptedAt
       from collection_attempts a
       left join debts d on d.workspace_id = a.workspace_id and d.id = a.debt_id
       where a.workspace_id = ? and a.customer_id = ?
       order by a.attempted_at desc, a.id desc limit ?`,
      [workspaceId, customerId, Math.max(1, Math.min(limit, 100))],
    );
  }
}
