import { sql } from 'drizzle-orm';
import { int, mysqlTable, serial, tinyint, timestamp, varchar, boolean, bigint, json, text, mysqlEnum, date, decimal, datetime, primaryKey, index, unique, float, foreignKey, uniqueIndex } from 'drizzle-orm/mysql-core';
import { shops } from './shops.schema';
export const device_types = mysqlEnum('device_types', ['iPhone', 'Macbook', 'Airpods', 'Android']);
export const stock_movement_reasons = mysqlEnum('stock_movement_reasons', ['purchase', 'dead_imei', 'transfer_out', 'transfer_in', 'repair', 'adjustment', 'buyback']);

export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  user_name: varchar('user_name', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  status: boolean('status').default(true),
  wifi_profile_id: bigint('wifi_profile_id', { mode: 'number', unsigned: true }).references(() => wifi_profile.id),
  workflow_id: bigint('workflow_id', { mode: 'number', unsigned: true }).references(() => workflows.id),
  label_template_id: bigint('label_template_id', { mode: 'number', unsigned: true }).references(() => label_templates.id),
  role_id: bigint('role_id', { mode: 'number', unsigned: true }).references(() => roles.id),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  warehouse_id: bigint('warehouse_id', { mode: 'number', unsigned: true }).references(() => warehouses.id),
  managed_shop_id: bigint('managed_shop_id', { mode: 'number', unsigned: true }).references(() => shops.id),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_users_tenant').on(table.tenant_id),
]);

export const roles = mysqlTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  status: boolean('status').default(true),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const warehouses = mysqlTable('warehouses', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  shop_id: bigint('shop_id', { mode: 'number', unsigned: true }).references(() => shops.id),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_warehouses_tenant').on(table.tenant_id),
]);

export const tenants = mysqlTable('tenants', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  logo: text('logo'),
  description: varchar('description', { length: 255 }).notNull(),
  status: boolean('status').default(true),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const test_results = mysqlTable('test_results', {
  id: serial('id').primaryKey(),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  device_id: bigint('device_id', { mode: 'number', unsigned: true }).references(() => devices.id).notNull(),
  warehouse_id: bigint('warehouse_id', { mode: 'number', unsigned: true }).references(() => warehouses.id).notNull(),
  tester_id: bigint('tester_id', { mode: 'number', unsigned: true }).references(() => users.id).notNull(),
  battery_info: json('battery_info'),
  passed_components: text('passed_components'),
  failed_components: text('failed_components'),
  pending_components: text('pending_components'),
  oem_status: varchar('oem_status', { length: 255 }),
  oem_info: json('oem_info'),
  lpn: varchar('lpn', { length: 255 }),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
  label_printed: boolean('label_printed').default(false),
  status: boolean('status').default(true),
  os_version: varchar('os_version', { length: 255 }),
  device_lock: varchar('device_lock', { length: 255 }),
  carrier_lock: json('carrier_lock'),
  sim_lock: json('sim_lock'),
  ESN: varchar('ESN', { length: 255 }),
  iCloud: json('iCloud'),
  eSIM: boolean('eSIM'),
  eSIM_erasure: boolean('eSIM_erasure'),
  serial_number: varchar('serial_number', { length: 255 }),
  imei: varchar('imei', { length: 255 }),
}, (table) => [
  index('idx_test_results_tenant_created_at').on(table.tenant_id, table.created_at),
  index('idx_test_results_tenant_warehouse_created_at').on(table.tenant_id, table.warehouse_id, table.created_at),
  index('idx_test_results_tenant_tester_created_at').on(table.tenant_id, table.tester_id, table.created_at),
  index('idx_test_results_device_id').on(table.device_id),
  index('idx_test_results_identifiers').on(table.serial_number, table.imei, table.lpn),
]);

export const devices = mysqlTable('devices', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 255 }),
  lpn: varchar('lpn', { length: 255 }),
  make: varchar('make', { length: 255 }),
  model_no: varchar('model_no', { length: 255 }),
  model_name: varchar('model_name', { length: 255 }),
  storage: varchar('storage', { length: 255 }),
  memory: varchar('memory', { length: 255 }),
  color: varchar('color', { length: 255 }),
  device_type: mysqlEnum('device_type', ['iPhone', 'Macbook', 'Airpods', 'Android']),
  serial: varchar('serial', { length: 255 }),
  imei: varchar('imei', { length: 255 }),
  imei2: varchar('imei2', { length: 255 }),
  guid: varchar('guid', { length: 255 }),
  description: varchar('description', { length: 255 }),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  warehouse_id: bigint('warehouse_id', { mode: 'number', unsigned: true }).references(() => warehouses.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_devices_tenant_serial').on(table.tenant_id, table.serial),
  index('idx_devices_tenant_imei').on(table.tenant_id, table.imei),
  unique('uq_devices_tenant_imei').on(table.tenant_id, table.imei),
  index('idx_devices_tenant_created_at').on(table.tenant_id, table.created_at),
  index('idx_devices_tenant_device_type').on(table.tenant_id, table.device_type),
  index('idx_devices_lpn').on(table.lpn),
  index('idx_devices_sku').on(table.sku, table.warehouse_id),
]);

export const sku_specs = mysqlTable('sku_specs', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 255 }).notNull(),
  make: varchar('make', { length: 255 }),
  model_no: varchar('model_no', { length: 255 }),
  model_name: varchar('model_name', { length: 255 }),
  is_part: boolean('is_part').default(false),
  storage: varchar('storage', { length: 255 }),
  memory: varchar('memory', { length: 255 }),
  color: varchar('color', { length: 255 }),
  device_type: mysqlEnum('device_type', ['iPhone', 'Macbook', 'Airpods', 'Android']),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const stock = mysqlTable('stock', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 255 }).notNull(),
  is_part: boolean('is_part').default(false),
  quantity: int('quantity').notNull(),
  warehouse_id: bigint('warehouse_id', { mode: 'number', unsigned: true }).references(() => warehouses.id).notNull(),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (stock) => [
 uniqueIndex('stock_unique').on(stock.sku, stock.warehouse_id),
]);

export const stock_movements = mysqlTable('stock_movements', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 255 }),
  warehouse_id: bigint('warehouse_id', { mode: 'number', unsigned: true }).references(() => warehouses.id).notNull(),
  delta: int('delta').notNull(),
  reason: stock_movement_reasons.notNull(),
  ref_type: varchar('ref_type', { length: 255 }).notNull(),
  ref_id: bigint('ref_id', { mode: 'number', unsigned: true }).notNull(),
  actor_id: bigint('actor_id', { mode: 'number', unsigned: true }).references(() => users.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
});

export const purchases = mysqlTable('purchases', {
  id: serial('id').primaryKey(),
  purchase_order_no: varchar('purchase_order_no', { length: 255 }).notNull(),
  supplier_name: varchar('supplier_name', { length: 255 }).notNull(),
  supplier_order_no: varchar('supplier_order_no', { length: 255 }).notNull(),
  expected_delivery_date: date('expected_delivery_date').notNull(),
  remarks: text('remarks'),
  invoice: text('invoice'),
  transport_doc: text('transport_doc'),
  receiving_picture: text('receiving_picture'),
  tracking_number: varchar('tracking_number', { length: 255 }),
  customer_name: varchar('customer_name', { length: 255 }),
  order_confirmation_doc: text('order_confirmation_doc'),
  tracking_url: text('tracking_url'),
  status: boolean('status').default(true),
  warehouse_id: bigint('warehouse_id', { mode: 'number', unsigned: true }).references(() => warehouses.id).notNull(),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const purchase_items = mysqlTable('purchase_items', {
  id: serial('id').primaryKey(),
  purchase_id: bigint('purchase_id', { mode: 'number', unsigned: true }).references(() => purchases.id).notNull(),
  sku: varchar('sku', { length: 255 }),
  quantity: int('quantity').notNull(),
  quantity_used_for_repair: int('quantity_used_for_repair').default(0),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  is_part: boolean('is_part').default(false),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Consolidated receiving table (replaces recieved_items and recieved_devices)
export const received_items = mysqlTable('received_items', {
  id: serial('id').primaryKey(),
  purchase_id: bigint('purchase_id', { mode: 'number', unsigned: true }).references(() => purchases.id).notNull(),
  purchase_item_id: bigint('purchase_item_id', { mode: 'number', unsigned: true }).references(() => purchase_items.id),
  sku: varchar('sku', { length: 255 }),
  device_id: bigint('device_id', { mode: 'number', unsigned: true }).references(() => devices.id),
  quantity: int('quantity').default(1).notNull(),
  received_at: timestamp('received_at').default(sql`CURRENT_TIMESTAMP`),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const transfers = mysqlTable('transfers', {
  id: serial('id').primaryKey(),
  from_warehouse_id: bigint('from_warehouse_id', { mode: 'number', unsigned: true }).references(() => warehouses.id).notNull(),
  to_warehouse_id: bigint('to_warehouse_id', { mode: 'number', unsigned: true }).references(() => warehouses.id).notNull(),
  tracking_number: varchar('tracking_number', { length: 255 }),
  tracking_url: text('tracking_url'),
  status: boolean('status').default(false),
  created_by: bigint('created_by', { mode: 'number', unsigned: true }).references(() => users.id).notNull(),
  completed_by: bigint('completed_by', { mode: 'number', unsigned: true }).references(() => users.id),
  completed_at: timestamp('completed_at'),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const transfer_items = mysqlTable('transfer_items', {
  id: serial('id').primaryKey(),
  transfer_id: bigint('transfer_id', { mode: 'number', unsigned: true }).references(() => transfers.id).notNull(),
  sku: varchar('sku', { length: 255 }).notNull(),
  device_id: bigint('device_id', { mode: 'number', unsigned: true }).references(() => devices.id).notNull(),
  is_part: boolean('is_part').default(false),
  quantity: int('quantity').default(1),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const grades = mysqlTable('grades', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 255 }).notNull(),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const device_grades = mysqlTable('device_grades', {
  id: serial('id').primaryKey(),
  device_id: bigint('device_id', { mode: 'number', unsigned: true }).references(() => devices.id).notNull(),
  grade_id: bigint('grade_id', { mode: 'number', unsigned: true }).references(() => grades.id).notNull(),
  status: boolean('status').default(true),
  actor_id: bigint('actor_id', { mode: 'number', unsigned: true }).references(() => users.id).notNull(),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
export const repair_reasons = mysqlTable('repair_reasons', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
});

export const repairs = mysqlTable('repairs', {
  id: serial('id').primaryKey(),
  device_id: bigint('device_id', { mode: 'number', unsigned: true }).references(() => devices.id).notNull(),
  remarks: text('remarks'),
  status: boolean('status').default(true),
  actor_id: bigint('actor_id', { mode: 'number', unsigned: true }).references(() => users.id).notNull(),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  warehouse_id: bigint('warehouse_id', {mode: 'number', unsigned: true}).references(() => warehouses.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const repair_items = mysqlTable('repair_items', {
  id: serial('id').primaryKey(),
  repair_id: bigint('repair_id', { mode: 'number', unsigned: true }).references(() => repairs.id).notNull(),
  // relate the sku with the stock table
  sku: varchar('sku', { length: 255 }),
  quantity: int('quantity').notNull(),
  reason_id: bigint('reason_id', { mode: 'number', unsigned: true }).references(() => repair_reasons.id).notNull(),
  cost: decimal('cost', { precision: 10, scale: 2 }).notNull(),
  purchase_items_id: bigint('purchase_items_id', { mode: 'number', unsigned: true }).references(() => purchase_items.id),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Generic device events ledger (replaces dead_imei)
export const device_events = mysqlTable('device_events', {
  id: serial('id').primaryKey(),
  device_id: bigint('device_id', { mode: 'number', unsigned: true }).references(() => devices.id).notNull(),
  actor_id: bigint('actor_id', { mode: 'number', unsigned: true }).references(() => users.id).notNull(),
  event_type: mysqlEnum('device_event_type', ['DEAD_IMEI','REPAIR_STARTED','REPAIR_COMPLETED','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT','TEST_COMPLETED']).notNull(),
  details: json('details'),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const wifi_profile = mysqlTable('wifi_profile', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  ssid: varchar('ssid', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});



export const workflows = mysqlTable('workflows', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  canvas_state: json('canvas_state').notNull(),
  position_x: float('position_x').default(0),
  position_y: float('position_y').default(0),
  scale: float('scale').default(1),
  viewport_position_x: float('viewport_position_x').default(0),
  viewport_position_y: float('viewport_position_y').default(0),
  viewport_scale: float('viewport_scale').default(1),
  grid_visible: boolean('grid_visible').default(true),
  grid_size: int('grid_size').default(20),
  is_published: boolean('is_published').default(false),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});



export const label_templates = mysqlTable('label_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: boolean('status').default(true),
  canvas_state: json('canvas_state').notNull(),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});



// buybacks tables

