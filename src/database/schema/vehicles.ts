import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  text,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import { customers } from './customers';
import { workspaces } from './workspaces';

export const vehicleTypes = ['motorcycle', 'car', 'truck', 'van', 'other'] as const;
export type VehicleType = (typeof vehicleTypes)[number];

export const vehicles = sqliteTable(
  'vehicles',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    customerId: text('customer_id').notNull(),
    type: text('type', { enum: vehicleTypes }).notNull(),
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    year: integer('year'),
    plate: text('plate'),
    color: text('color'),
    notes: text('notes'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    archivedAt: text('archived_at'),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    foreignKey({
      columns: [table.workspaceId, table.customerId],
      foreignColumns: [customers.workspaceId, customers.id],
      name: 'vehicles_workspace_customer_fk',
    }).onDelete('restrict'),
    uniqueIndex('vehicles_workspace_id_unique').on(table.workspaceId, table.id),
    uniqueIndex('vehicles_workspace_customer_id_unique').on(
      table.workspaceId,
      table.customerId,
      table.id,
    ),
    index('vehicles_workspace_customer_idx').on(table.workspaceId, table.customerId),
    index('vehicles_workspace_plate_idx').on(table.workspaceId, table.plate),
    check('vehicles_type_check', sql`${table.type} in ('motorcycle','car','truck','van','other')`),
    check('vehicles_year_check', sql`${table.year} is null or ${table.year} between 1886 and 9999`),
  ],
);

export type VehicleRow = typeof vehicles.$inferSelect;
export type NewVehicleRow = typeof vehicles.$inferInsert;
