import { randomUUID } from 'node:crypto';

import { CustomerRepository } from '@/database/repositories/customer.repository';
import { PaymentRepository } from '@/database/repositories/payment.repository';
import { WorkspaceRepository } from '@/database/repositories/workspace.repository';
import {
  buildPaymentReceiptHtml,
  escapeReceiptHtml,
  getPaymentReceiptId,
} from '@/features/payments/domain/paymentReceipt';
import type { PaymentReceiptDetails } from '@/features/payments/domain/paymentTypes';
import { DebtService } from '@/features/debts/services/DebtService';
import { PaymentReceiptService } from '@/features/payments/services/PaymentReceiptService';
import { PaymentReversalService } from '@/features/payments/services/PaymentReversalService';
import { PaymentService } from '@/features/payments/services/PaymentService';
import { VehicleService } from '@/features/vehicles/services/VehicleService';

import { createTestDatabase } from '../database/createTestDatabase';

async function receiptFixture() {
  const database = await createTestDatabase();
  const workspace = await new WorkspaceRepository(database).initializeLocal();
  const customer = await new CustomerRepository(database).create(workspace.id, {
    name: 'João & Filhos',
  });
  const vehicle = await new VehicleService(database).create(workspace.id, {
    customerId: customer.id,
    type: 'car',
    brand: 'Chevrolet',
    model: 'Onix',
    year: 2024,
    plate: 'ABC1D23',
    color: 'Prata',
    notes: null,
  });
  const debt = await new DebtService(database).create(workspace.id, {
    customerId: customer.id,
    vehicleId: vehicle.id,
    description: 'Troca de óleo & filtro',
    totalCents: 10_000,
    serviceDate: '2026-11-20',
  });
  return { database, workspace, customer, vehicle, debt };
}

describe('payment receipts', () => {
  it('recovers stable partial and total payment snapshots without using the current balance', async () => {
    const { database, workspace, customer, vehicle, debt } = await receiptFixture();
    const service = new PaymentService(database);
    const first = await service.register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 4_000,
      paymentMethod: 'pix',
      paidAt: '2026-11-21T12:00:00.000Z',
    });
    const second = await service.register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 6_000,
      paymentMethod: 'cash',
      paidAt: '2026-11-22T12:00:00.000Z',
    });
    const repository = new PaymentRepository(database);

    await expect(repository.findReceiptDetails(workspace.id, first.id)).resolves.toMatchObject({
      customerId: customer.id,
      vehiclePlate: vehicle.plate,
      workshopName: 'Oficina Moreira',
      originalDebtCents: 10_000,
      debtTotalAtPaymentCents: 10_000,
      totalPaidAtPaymentCents: 4_000,
      remainingAtPaymentCents: 6_000,
    });
    await expect(repository.findReceiptDetails(workspace.id, second.id)).resolves.toMatchObject({
      originalDebtCents: 10_000,
      totalPaidAtPaymentCents: 10_000,
      remainingAtPaymentCents: 0,
    });
    await expect(repository.findReceiptDetails(randomUUID(), first.id)).resolves.toBeNull();
    await expect(repository.findReceiptDetails(workspace.id, randomUUID())).resolves.toBeNull();
    database.close();
  });

  it('identifies a persisted payment as reversed when reissuing its receipt', async () => {
    const { database, workspace, debt } = await receiptFixture();
    const payment = await new PaymentService(database).register(workspace.id, {
      operationId: randomUUID(),
      debtId: debt.id,
      amountCents: 4_000,
      paymentMethod: 'credit_card',
      paidAt: '2026-11-21T12:00:00.000Z',
    });
    await new PaymentReversalService(database).reverse(workspace.id, {
      operationId: randomUUID(),
      paymentId: payment.id,
      reason: 'Pagamento duplicado',
      reversedAt: '2026-11-23T12:00:00.000Z',
    });

    const receipt = await new PaymentRepository(database).findReceiptDetails(
      workspace.id,
      payment.id,
    );
    expect(receipt).toMatchObject({
      reversalReason: 'Pagamento duplicado',
      reversedAt: '2026-11-23T12:00:00.000Z',
    });
    expect(
      buildPaymentReceiptHtml(
        receipt as PaymentReceiptDetails,
        workspace.timezone,
        new Date('2026-11-24T12:00:00.000Z'),
      ),
    ).toContain('Pagamento estornado');
    database.close();
  });

  it('escapes personal data and omits unavailable historical balances', () => {
    const receipt: PaymentReceiptDetails = {
      id: 'payment-id',
      workspaceId: 'workspace-id',
      debtId: 'debt-id',
      operationId: 'operation-id',
      amountCents: 12_345,
      paymentMethod: 'bank_transfer',
      paidAt: '2026-11-21T12:00:00.000Z',
      notes: null,
      createdAt: '2026-11-21T12:00:00.000Z',
      debtDescription: '<script>alert("x")</script>',
      debtCanceledAt: null,
      customerId: 'customer-id',
      customerName: 'Cliente & Filhos',
      reversalId: null,
      reversalReason: null,
      reversedAt: null,
      workshopName: 'Oficina <Moreira>',
      originalDebtCents: null,
      debtTotalAtPaymentCents: null,
      totalPaidAtPaymentCents: null,
      remainingAtPaymentCents: null,
      vehicleBrand: null,
      vehicleModel: null,
      vehiclePlate: null,
    };

    const html = buildPaymentReceiptHtml(
      receipt,
      'America/Fortaleza',
      new Date('2026-11-24T12:00:00.000Z'),
    );
    expect(escapeReceiptHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
    expect(html).toContain('Oficina &lt;Moreira&gt;');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('R$ 123,45');
    expect(html).toContain('snapshot histórico suficiente');
    expect(html).not.toContain('Saldo após a operação');
    expect(html).toContain('não é nota fiscal');
  });

  it('uses the persisted payment id on generation, sharing and cleanup', async () => {
    const createPdf = jest.fn().mockResolvedValue({
      uri: 'file:///cache/receipt.pdf',
      receiptId: 'FM-PAYMENT-ID',
    });
    const sharePdf = jest.fn().mockResolvedValue(undefined);
    const removePdf = jest.fn().mockResolvedValue(undefined);
    const service = new PaymentReceiptService({ createPdf, sharePdf, removePdf });
    const receipt = {
      id: 'payment-id',
      workshopName: 'Oficina Moreira',
      debtDescription: 'Serviço',
      customerName: 'Cliente',
      amountCents: 1_000,
      paymentMethod: 'cash',
      paidAt: '2026-11-21T12:00:00.000Z',
      originalDebtCents: 1_000,
      debtTotalAtPaymentCents: 1_000,
      totalPaidAtPaymentCents: 1_000,
      remainingAtPaymentCents: 0,
      reversalId: null,
      reversedAt: null,
      vehicleBrand: null,
      vehicleModel: null,
      vehiclePlate: null,
    } as PaymentReceiptDetails;

    const generated = await service.generate(
      receipt,
      'America/Fortaleza',
      new Date('2026-11-24T12:00:00.000Z'),
    );
    expect(getPaymentReceiptId(receipt.id)).toBe('FM-PAYMENT-ID');
    expect(createPdf).toHaveBeenCalledWith(
      expect.stringContaining('FM-PAYMENT-ID'),
      'FM-PAYMENT-ID',
    );
    await service.share(generated);
    await service.remove(generated);
    expect(sharePdf).toHaveBeenCalledWith(generated);
    expect(removePdf).toHaveBeenCalledWith(generated);
  });
});
