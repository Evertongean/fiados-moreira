import { AppDatabaseError } from '@/database/errors/DatabaseError';
import { AuditRepository } from '@/database/repositories/audit.repository';
import { CustomerRepository } from '@/database/repositories/customer.repository';
import type { CustomerRow } from '@/database/schema';
import type { SqlExecutor } from '@/database/types/executor';
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type NormalizedCustomerInput,
  type UpdateCustomerInput,
} from '@/features/customers/domain/customerSchemas';
import type { PotentialDuplicate } from '@/features/customers/domain/customerTypes';
import { createUuid } from '@/utils/uuid';

const EDITABLE_FIELDS = ['name', 'phone', 'whatsapp', 'address', 'notes'] as const;

function sameCustomer(customer: CustomerRow, input: NormalizedCustomerInput): boolean {
  return EDITABLE_FIELDS.every((field) => customer[field] === input[field]);
}

export class CustomerService {
  constructor(private readonly executor: SqlExecutor) {}

  normalize(input: CreateCustomerInput): NormalizedCustomerInput {
    const parsed = createCustomerSchema.safeParse(input);
    if (!parsed.success)
      throw new AppDatabaseError('CUSTOMER_VALIDATION_ERROR', 'Dados do cliente inválidos.');
    return parsed.data;
  }

  findPotentialDuplicates(
    workspaceId: string,
    input: CreateCustomerInput,
    excludeId?: string,
  ): Promise<PotentialDuplicate[]> {
    const normalized = this.normalize(input);
    return new CustomerRepository(this.executor).findPotentialDuplicates(
      workspaceId,
      normalized,
      excludeId,
    );
  }

  create(
    workspaceId: string,
    input: CreateCustomerInput,
    customerId = createUuid(),
  ): Promise<CustomerRow> {
    const normalized = this.normalize(input);
    return this.executor.transaction(async (transaction) => {
      const customers = new CustomerRepository(transaction);
      const existing = await customers.findById(workspaceId, customerId);
      if (existing) {
        if (sameCustomer(existing, normalized)) return existing;
        throw new AppDatabaseError(
          'IDEMPOTENCY_CONFLICT',
          'A tentativa de cadastro já foi utilizada com outros dados.',
        );
      }
      const customer = await customers.insertWithId(workspaceId, customerId, normalized);
      await new AuditRepository(transaction).record(workspaceId, {
        entityType: 'customer',
        entityId: customer.id,
        action: 'create',
        operationId: `customer:create:${customer.id}`,
        metadata: { fields: EDITABLE_FIELDS.filter((field) => customer[field] !== null).join(',') },
      });
      return customer;
    });
  }

  update(workspaceId: string, id: string, input: UpdateCustomerInput): Promise<CustomerRow> {
    const parsed = updateCustomerSchema.safeParse(input);
    if (!parsed.success)
      throw new AppDatabaseError('CUSTOMER_VALIDATION_ERROR', 'Dados do cliente inválidos.');
    return this.executor.transaction(async (transaction) => {
      const customers = new CustomerRepository(transaction);
      const current = await customers.findById(workspaceId, id);
      if (!current) throw new AppDatabaseError('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.');
      const changedFields = EDITABLE_FIELDS.filter(
        (field) => parsed.data[field] !== undefined && current[field] !== parsed.data[field],
      );
      if (!changedFields.length) return current;
      const updated = await customers.update(workspaceId, id, parsed.data);
      await new AuditRepository(transaction).record(workspaceId, {
        entityType: 'customer',
        entityId: id,
        action: 'update',
        operationId: createUuid(),
        metadata: { fields: changedFields.join(',') },
      });
      return updated;
    });
  }

  archive(workspaceId: string, id: string): Promise<CustomerRow> {
    return this.executor.transaction(async (transaction) => {
      const customers = new CustomerRepository(transaction);
      const customer = await customers.findById(workspaceId, id);
      if (!customer) throw new AppDatabaseError('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.');
      if (customer.archivedAt)
        throw new AppDatabaseError('CUSTOMER_ALREADY_ARCHIVED', 'O cliente já está arquivado.');
      if (await customers.hasOutstandingDebt(workspaceId, id)) {
        throw new AppDatabaseError(
          'CUSTOMER_HAS_OUTSTANDING_DEBT',
          'Este cliente possui fiados em aberto. Regularize o saldo antes de arquivá-lo.',
        );
      }
      await customers.archive(workspaceId, id);
      await new AuditRepository(transaction).record(workspaceId, {
        entityType: 'customer',
        entityId: id,
        action: 'archive',
        operationId: createUuid(),
      });
      return (await customers.findById(workspaceId, id)) as CustomerRow;
    });
  }

  restore(workspaceId: string, id: string): Promise<CustomerRow> {
    return this.executor.transaction(async (transaction) => {
      const customers = new CustomerRepository(transaction);
      const customer = await customers.findById(workspaceId, id);
      if (!customer) throw new AppDatabaseError('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.');
      if (!customer.archivedAt)
        throw new AppDatabaseError('CUSTOMER_NOT_ARCHIVED', 'O cliente não está arquivado.');
      await customers.restore(workspaceId, id);
      await new AuditRepository(transaction).record(workspaceId, {
        entityType: 'customer',
        entityId: id,
        action: 'restore',
        operationId: createUuid(),
      });
      return (await customers.findById(workspaceId, id)) as CustomerRow;
    });
  }
}
