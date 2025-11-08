import { sql } from 'drizzle-orm';
import { int, mysqlTable, serial, tinyint, timestamp, varchar, boolean, bigint, json, text, mysqlEnum, date, decimal, datetime, primaryKey, index, unique, float, foreignKey, uniqueIndex } from 'drizzle-orm/mysql-core';
import { shops } from './shops.schema';
export const device_types = mysqlEnum('device_types', ['iPhone', 'Macbook', 'Airpods', 'Android']);
export const stock_movement_reasons = mysqlEnum('stock_movement_reasons', ['purchase', 'dead_imei', 'transfer_out', 'transfer_in', 'repair', 'adjustment', 'buyback']);

export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  user_name: varchar('user_name', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  status: boolean('status').default(true),
  wifi_profile_id: bigint('wifi_profile_id', { mode: 'number', unsigned: true }).references(() => wifi_profile.id),
  workflow_id: bigint('workflow_id', { mode: 'number', unsigned: true }).references(() => workflows.id),
  label_template_id: bigint('label_template_id', { mode: 'number', unsigned: true }).references(() => label_templates.id),
  ota_update_id: bigint('ota_update_id', { mode: 'number', unsigned: true }).references(() => ota_update.id),
  diagnostic_question_set_id: bigint('diagnostic_question_set_id', { mode: 'number', unsigned: true }).references(() => diagnostic_question_sets.id),
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
  account_type: mysqlEnum('account_type', ['prepaid', 'credit']).default('prepaid').notNull(),
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
  rooted: boolean('rooted'),
  erased: boolean('erased'),
  grade: varchar('grade', { length: 255 }),
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
  grade: varchar('grade', { length: 255 }),
  model_name: varchar('model_name', { length: 255 }),
  storage: varchar('storage', { length: 255 }),
  memory: varchar('memory', { length: 255 }),
  color: varchar('color', { length: 255 }),
  edited_color: varchar('edited_color', {length: 255}),
  device_type: mysqlEnum('device_type', ['iPhone', 'Macbook', 'Airpods', 'Android']),
  serial: varchar('serial', { length: 255 }),
  imei: varchar('imei', { length: 255 }),
  imei2: varchar('imei2',  { length: 255 }),
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
export const stock_device_ids = mysqlTable('stock_device_ids', {
  id: serial('id').primaryKey(),
  stock_id: bigint('stock_id', { mode: 'number', unsigned: true }).references(() => stock.id).notNull(),
  device_id: bigint('device_id', { mode: 'number', unsigned: true }).references(() => devices.id).notNull(),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

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
  device_id: bigint('device_id', { mode: 'number', unsigned: true }).references(() => devices.id).default(sql`NULL`),
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
  fixed_price: decimal('fixed_price', { precision: 10, scale: 2 }),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
});

export const repair_reason_model_prices = mysqlTable('repair_reason_model_prices', {
  id: serial('id').primaryKey(),
  repair_reason_id: bigint('repair_reason_id', { mode: 'number', unsigned: true }).references(() => repair_reasons.id).notNull(),
  model_name: varchar('model_name', { length: 255 }).notNull(),
  fixed_price: decimal('fixed_price', { precision: 10, scale: 2 }).notNull(),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_repair_reason_model_prices_tenant').on(table.tenant_id),
  index('idx_repair_reason_model_prices_reason').on(table.repair_reason_id),
  unique('uq_repair_reason_model').on(table.repair_reason_id, table.model_name, table.tenant_id),
]);

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
// parts sku used in repair for the device 
export const repair_items = mysqlTable('repair_items', {
  id: serial('id').primaryKey(),
  repair_id: bigint('repair_id', { mode: 'number', unsigned: true }).references(() => repairs.id).notNull(),
  // relate the sku with the stock table
  sku: varchar('sku', { length: 255 }),
  quantity: int('quantity').notNull(),
  reason_id: bigint('reason_id', { mode: 'number', unsigned: true }).references(() => repair_reasons.id),
  description: text('description'),
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
  event_type: mysqlEnum('device_event_type', ['DEAD_IMEI','REPAIR_STARTED','REPAIR_COMPLETED','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT','TEST_COMPLETED', 'REPAIR_DELETED']).notNull(),
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
// target_Os window,macos
export const ota_update = mysqlTable('ota_update', {
  id: serial('id').primaryKey(),
  version: varchar('version', { length: 255 }).notNull(),
  url: text('url').notNull(),
  target_os: mysqlEnum('target_os', ['window', 'macos']).notNull(),
  target_architecture: mysqlEnum('target_architecture', ['x86', 'arm']).notNull(),
  release_channel: mysqlEnum('release_channel', ['stable', 'beta', 'dev']).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// API Keys for external API access
export const currency_symbols = mysqlTable('currency_symbols', {
  id: serial('id').primaryKey(),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  code: varchar('code', { length: 10 }).notNull(), // e.g., USD, EUR
  symbol: varchar('symbol', { length: 10 }).notNull(), // e.g., $, €
  label: varchar('label', { length: 100 }).notNull(), // e.g., US Dollar, Euro
  is_default: boolean('is_default').default(false),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  created_by: bigint('created_by', { mode: 'number', unsigned: true }).references(() => users.id),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
  updated_by: bigint('updated_by', { mode: 'number', unsigned: true }).references(() => users.id),
}, (table) => [
  index('idx_currency_symbols_tenant').on(table.tenant_id),
  unique('uq_currency_symbols_tenant_code').on(table.tenant_id, table.code),
]);

export const tenant_currency_preferences = mysqlTable('tenant_currency_preferences', {
  id: serial('id').primaryKey(),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull().unique(),
  currency_code: varchar('currency_code', { length: 10 }).notNull(),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_tenant_currency_preferences').on(table.tenant_id),
]);
export const api_keys = mysqlTable('api_keys', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  key_hash: varchar('key_hash', { length: 255 }).notNull().unique(),
  key_prefix: varchar('key_prefix', { length: 20 }).notNull(),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_by: bigint('created_by', { mode: 'number', unsigned: true }).references(() => users.id).notNull(),
  rate_limit: int('rate_limit').default(1000), // requests per hour
  expires_at: timestamp('expires_at'),
  last_used_at: timestamp('last_used_at'),
  last_used_ip: varchar('last_used_ip', { length: 45 }),
  usage_count: bigint('usage_count', { mode: 'number', unsigned: true }).default(0),
  is_active: boolean('is_active').default(true),
  revoked_at: timestamp('revoked_at'),
  revoked_by: bigint('revoked_by', { mode: 'number', unsigned: true }).references(() => users.id),
  revoked_reason: text('revoked_reason'),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_api_keys_tenant').on(table.tenant_id),
  index('idx_api_keys_key_hash').on(table.key_hash),
  index('idx_api_keys_prefix').on(table.key_prefix),
  index('idx_api_keys_active').on(table.is_active),
  index('idx_api_keys_expires').on(table.expires_at),
]);

// API Key usage logs for audit and rate limiting
export const api_key_usage_logs = mysqlTable('api_key_usage_logs', {
  id: serial('id').primaryKey(),
  api_key_id: bigint('api_key_id', { mode: 'number', unsigned: true }).references(() => api_keys.id).notNull(),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  request_size: int('request_size'),
  response_status: int('response_status'),
  response_time_ms: int('response_time_ms'),
  error_message: text('error_message'),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_api_usage_key_time').on(table.api_key_id, table.created_at),
  index('idx_api_usage_tenant_time').on(table.tenant_id, table.created_at),
  index('idx_api_usage_endpoint').on(table.endpoint),
]);

// buybacks tables

// Licensing System Tables

// License Types - defines available license products
export const license_types = mysqlTable('license_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  product_category: varchar('product_category', { length: 100 }).notNull(), // e.g., "iPhone", "MacBook", "AirPods"
  test_type: varchar('test_type', { length: 100 }).notNull(), // e.g., "Diagnostic", "Erasure"
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  status: boolean('status').default(true),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_license_types_category').on(table.product_category, table.test_type),
]);

// License Ledger - tracks all license transactions (purchases and usage)
export const license_ledger = mysqlTable('license_ledger', {
  id: serial('id').primaryKey(),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  license_type_id: bigint('license_type_id', { mode: 'number', unsigned: true }).references(() => license_types.id).notNull(),
  amount: int('amount').notNull(), // +N for purchase, -1 for usage
  transaction_type: mysqlEnum('transaction_type', ['purchase', 'usage', 'refund', 'adjustment']).notNull(),
  reference_type: varchar('reference_type', { length: 100 }), // e.g., "order", "test_result", "manual"
  reference_id: bigint('reference_id', { mode: 'number', unsigned: true }), // ID of related record
  device_identifier: varchar('device_identifier', { length: 255 }), // IMEI/Serial for usage tracking
  notes: text('notes'),
  created_by: bigint('created_by', { mode: 'number', unsigned: true }).references(() => users.id),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_license_ledger_tenant').on(table.tenant_id, table.license_type_id),
  index('idx_license_ledger_device').on(table.device_identifier),
  index('idx_license_ledger_created_at').on(table.created_at),
]);

// Device Licenses - tracks 30-day retest windows per device
export const device_licenses = mysqlTable('device_licenses', {
  id: serial('id').primaryKey(),
  device_identifier: varchar('device_identifier', { length: 255 }).notNull(), // IMEI or Serial
  license_type_id: bigint('license_type_id', { mode: 'number', unsigned: true }).references(() => license_types.id).notNull(),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  license_activated_at: timestamp('license_activated_at').notNull(),
  retest_valid_until: timestamp('retest_valid_until').notNull(),
  ledger_entry_id: bigint('ledger_entry_id', { mode: 'number', unsigned: true }).references(() => license_ledger.id),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_device_licenses_device').on(table.device_identifier, table.license_type_id),
  index('idx_device_licenses_tenant').on(table.tenant_id),
  index('idx_device_licenses_validity').on(table.retest_valid_until),
]);

// License Requests - tracks license requests from tenants
export const license_requests = mysqlTable('license_requests', {
  id: serial('id').primaryKey(),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  requested_by: bigint('requested_by', { mode: 'number', unsigned: true }).references(() => users.id).notNull(),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected']).default('pending').notNull(),
  items: json('items').notNull(), // Array of {license_type_id, quantity, justification}
  notes: text('notes'),
  reviewed_by: bigint('reviewed_by', { mode: 'number', unsigned: true }).references(() => users.id),
  reviewed_at: timestamp('reviewed_at'),
  rejection_reason: text('rejection_reason'),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_license_requests_tenant').on(table.tenant_id),
  index('idx_license_requests_status').on(table.status),
  index('idx_license_requests_created_at').on(table.created_at),
]);

// Diagnostic Question System Tables

// Individual questions library
export const diagnostic_questions = mysqlTable('diag_questions', {
  id: serial('id').primaryKey(),
  question_text: text('question_text').notNull(),
  description: text('description'), // Optional explanation of what the question assesses
  status: boolean('status').default(true),
  models: json('models').$type<string[]>(), // Array of model names; null/empty = all models
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_diagnostic_questions_tenant').on(table.tenant_id),
]);

// Options for each question
export const diagnostic_question_options = mysqlTable('diagn_qn_options', {
  id: serial('id').primaryKey(),
  question_id: bigint('question_id', { mode: 'number', unsigned: true }).references(() => diagnostic_questions.id).notNull(),
  option_text: varchar('option_text', { length: 255 }).notNull(),
  message: text('message'), // Optional message/description for the option
  display_order: int('display_order').default(0), // For ordering options
  status: boolean('status').default(true),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_diagnostic_question_options_question').on(table.question_id),
]);

// Question sets (groups of related questions)
export const diagnostic_question_sets = mysqlTable('diag_qn_sets', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: boolean('status').default(true),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_diagnostic_question_sets_tenant').on(table.tenant_id),
]);

// Many-to-many relationship between sets and questions
export const diagnostic_question_set_questions = mysqlTable('diag_qn_set_qns', {
  id: serial('id').primaryKey(),
  question_set_id: bigint('question_set_id', { mode: 'number', unsigned: true }).references(() => diagnostic_question_sets.id).notNull(),
  question_id: bigint('question_id', { mode: 'number', unsigned: true }).references(() => diagnostic_questions.id).notNull(),
  display_order: int('display_order').default(0), // For ordering questions within a set
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_question_set_questions').on(table.question_set_id, table.question_id),
  unique('uq_set_question').on(table.question_set_id, table.question_id),
]);


// Answers submitted by testers (during diagnostic upload)
export const diagnostic_question_answers = mysqlTable('diag_answers', {
  id: serial('id').primaryKey(),
  question_text: varchar('question_text', { length: 500 }).notNull(),
  answer_text: varchar('answer_text', { length: 255 }).notNull(),
  device_id: bigint('device_id', { mode: 'number', unsigned: true }).references(() => devices.id, { onDelete: 'set null' }),
  test_result_id: bigint('test_result_id', { mode: 'number', unsigned: true }).references(() => test_results.id, { onDelete: 'set null' }),
  answered_by: bigint('answered_by', { mode: 'number', unsigned: true }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_diag_ans_device').on(table.device_id),
  index('idx_diag_ans_test_result').on(table.test_result_id),
  index('idx_diag_ans_tenant').on(table.tenant_id),
]);

// Translations for diagnostic questions and options
export const diagnostic_translations = mysqlTable('diag_translations', {
  id: serial('id').primaryKey(),
  entity_type: mysqlEnum('entity_type', ['question', 'option']).notNull(), // What is being translated
  entity_id: bigint('entity_id', { mode: 'number', unsigned: true }).notNull(), // ID of question or option
  language_code: varchar('language_code', { length: 10 }).notNull(), // e.g., 'es', 'de', 'pt', 'fr'
  translated_text: text('translated_text').notNull(), // The translation
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_diag_translations_entity').on(table.entity_type, table.entity_id),
  index('idx_diag_translations_lang').on(table.language_code),
  unique('uq_diag_translation').on(table.entity_type, table.entity_id, table.language_code),
]);

// SKU Mapping Rules - Dynamic mapping from device properties to SKU codes
export const sku_mappings = mysqlTable('sku_mappings', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID
  sku: varchar('sku', { length: 255 }).notNull(),
  conditions: json('conditions').notNull(), // Dynamic conditions as JSON object
  canonical_key: varchar('canonical_key', { length: 512 }).notNull(), // Normalized key for uniqueness
  tenant_id: bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('uq_sku_mappings_canonical_tenant').on(table.canonical_key, table.tenant_id),
  index('idx_sku_mappings_sku').on(table.sku),
  index('idx_sku_mappings_tenant').on(table.tenant_id),
]);

