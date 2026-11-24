import { relations } from 'drizzle-orm';

import { auditLogs } from './audit-logs';
import { customers } from './customers';
import { debts } from './debts';
import { paymentReversals } from './payment-reversals';
import { payments } from './payments';
import { reminders } from './reminders';
import { settings } from './settings';
import { syncQueue } from './sync-queue';
import { vehicles } from './vehicles';
import { workspaces } from './workspaces';

export const workspaceRelations = relations(workspaces, ({ many }) => ({
  customers: many(customers),
  vehicles: many(vehicles),
  debts: many(debts),
  payments: many(payments),
  paymentReversals: many(paymentReversals),
  reminders: many(reminders),
  settings: many(settings),
  syncQueue: many(syncQueue),
  auditLogs: many(auditLogs),
}));

export const customerRelations = relations(customers, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [customers.workspaceId], references: [workspaces.id] }),
  vehicles: many(vehicles),
  debts: many(debts),
}));

export const vehicleRelations = relations(vehicles, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [vehicles.workspaceId], references: [workspaces.id] }),
  customer: one(customers, { fields: [vehicles.customerId], references: [customers.id] }),
  debts: many(debts),
}));

export const debtRelations = relations(debts, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [debts.workspaceId], references: [workspaces.id] }),
  customer: one(customers, { fields: [debts.customerId], references: [customers.id] }),
  vehicle: one(vehicles, { fields: [debts.vehicleId], references: [vehicles.id] }),
  payments: many(payments),
  reminders: many(reminders),
}));

export const paymentRelations = relations(payments, ({ one }) => ({
  workspace: one(workspaces, { fields: [payments.workspaceId], references: [workspaces.id] }),
  debt: one(debts, { fields: [payments.debtId], references: [debts.id] }),
  reversal: one(paymentReversals),
}));

export const reversalRelations = relations(paymentReversals, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentReversals.paymentId],
    references: [payments.id],
  }),
}));

export const reminderRelations = relations(reminders, ({ one }) => ({
  debt: one(debts, { fields: [reminders.debtId], references: [debts.id] }),
}));
