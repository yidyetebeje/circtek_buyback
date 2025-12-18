import { mysqlTable, int, varchar, text, decimal, timestamp, json, primaryKey, index, unique, foreignKey, tinyint, mysqlEnum, bigint, serial } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { shops } from "./shops.schema";
import { devices, tenants, users, transfers } from "./circtek.schema";
import { models } from "./buyback_catalogue.schema";
import { relations } from "drizzle-orm";

// Define the order status enum - simplified to 4 states
export const ORDER_STATUS = {
  PENDING: "PENDING",
  ARRIVED: "ARRIVED",
  PAID: "PAID",
  REJECTED: "REJECTED"
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// Define the shipping provider enum
export const SHIPPING_PROVIDER = {
  DHL: "DHL",
  FEDEX: "FEDEX",
  UPS: "UPS",
  USPS: "USPS"
} as const;

export type ShippingProvider = typeof SHIPPING_PROVIDER[keyof typeof SHIPPING_PROVIDER];

// Convert object values to array for mysqlEnum
const orderStatusValues = Object.values(ORDER_STATUS) as [string, ...string[]];
const shippingProviderValues = Object.values(SHIPPING_PROVIDER) as [string, ...string[]];

// Main orders table
export const orders = mysqlTable("orders", {
  id: varchar("id", { length: 36 }).notNull(), // UUID format
  order_number: varchar("order_number", { length: 50 }).notNull(),
  device_id: int("device_id").notNull(),
  device_snapshot: json("device_snapshot").notNull(),
  estimated_price: decimal("estimated_price", { precision: 10, scale: 2 }).notNull(),
  final_price: decimal("final_price", { precision: 10, scale: 2 }),
  imei: varchar("imei", { length: 255 }),
  sku: varchar("sku", { length: 255 }),
  serial_number: varchar("serial_number", { length: 255 }),
  testing_info: json("testing_info"),
  status: mysqlEnum("status", orderStatusValues).notNull().default(ORDER_STATUS.PENDING),
  seller_notes: text("seller_notes"),
  admin_notes: text("admin_notes"),
  tenant_id: bigint("tenant_id", { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  shop_id: bigint("shop_id", { mode: 'number', unsigned: true }).references(() => shops.id).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  primaryKey({ columns: [table.id], name: "orders_id" }),
  unique("order_number_unique").on(table.order_number),
  index("orders_device_id_idx").on(table.device_id),
  index("orders_status_idx").on(table.status),
  foreignKey({ columns: [table.tenant_id], foreignColumns: [tenants.id], name: "orders_tenant_id_fk" }),
  index("orders_tenant_id_idx").on(table.tenant_id),

  foreignKey({ columns: [table.tenant_id, table.imei], foreignColumns: [devices.tenant_id, devices.imei], name: "orders_tenant_imei_devices_fk" })
]));

// Order device condition answers table
export const order_device_condition_answers = mysqlTable("order_device_condition_answers", {
  id: varchar("id", { length: 36 }).notNull(), // UUID format
  order_id: varchar("order_id", { length: 36 }).notNull(),
  question_key: varchar("question_key", { length: 100 }).notNull(),
  question_text_snapshot: text("question_text_snapshot").notNull(),
  answer_value: json("answer_value").notNull(),
  answer_text_snapshot: text("answer_text_snapshot"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  primaryKey({ columns: [table.id], name: "order_device_condition_answers_id" }),
  index("order_device_condition_answers_order_id_idx").on(table.order_id),
  index("order_device_condition_answers_question_key_idx").on(table.question_key),
  foreignKey({
    columns: [table.order_id],
    foreignColumns: [orders.id],
    name: "order_device_condition_answers_order_id_fk"
  })
]));

// Shipping details table
export const shipping_details = mysqlTable("shipping_details", {
  id: varchar("id", { length: 36 }).notNull(), // UUID format
  orderId: varchar("order_id", { length: 36 }).notNull(),
  sellerName: varchar("seller_name", { length: 255 }).notNull(),
  seller_street1: varchar("seller_street1", { length: 255 }).notNull(),
  seller_street2: varchar("seller_street2", { length: 255 }),
  seller_city: varchar("seller_city", { length: 100 }).notNull(),
  seller_state_province: varchar("seller_state_province", { length: 100 }).notNull(),
  seller_postal_code: varchar("seller_postal_code", { length: 20 }).notNull(),
  seller_country_code: varchar("seller_country_code", { length: 2 }).notNull(),
  seller_phone_number: varchar("seller_phone_number", { length: 20 }),
  seller_email: varchar("seller_email", { length: 255 }),
  shipping_label_url: text("shipping_label_url"),
  tracking_number: varchar("tracking_number", { length: 100 }),
  shipping_provider: mysqlEnum("shipping_provider", shippingProviderValues),
  label_data: json("label_data"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  primaryKey({ columns: [table.id], name: "shipping_details_id" }),
  unique("shipping_details_order_id_unique").on(table.orderId),
  foreignKey({
    columns: [table.orderId],
    foreignColumns: [orders.id],
    name: "shipping_details_order_id_fk"
  })
]));

// Order status history table
export const order_status_history = mysqlTable("order_status_history", {
  id: varchar("id", { length: 36 }).notNull(), // UUID format
  order_id: varchar("order_id", { length: 36 }).notNull(),
  status: mysqlEnum("status", orderStatusValues).notNull(),
  changed_at: timestamp("changed_at").defaultNow().notNull(),
  changed_by_user_id: bigint("changed_by_user_id", { mode: 'number', unsigned: true }),
  notes: text("notes"),
}, (table) => ([
  primaryKey({ columns: [table.id], name: "order_status_history_id" }),
  index("order_status_history_order_id_idx").on(table.order_id),
  index("order_status_history_changed_by_user_id_idx").on(table.changed_by_user_id),
  foreignKey({
    columns: [table.order_id],
    foreignColumns: [orders.id],
    name: "order_status_history_order_id_fk"
  }),
  foreignKey({
    columns: [table.changed_by_user_id],
    foreignColumns: [users.id],
    name: "order_status_history_changed_by_user_id_fk"
  })
]));

export const order_relations = relations(orders, ({ one, many }) => ({
  device: one(models, {
    fields: [orders.device_id],
    references: [models.id],
  }),
  tenant: one(tenants, {
    fields: [orders.tenant_id],
    references: [tenants.id],
  }),
  shop: one(shops, {
    fields: [orders.shop_id],
    references: [shops.id],
  }),
  condition_answers: many(order_device_condition_answers),
  shipping_details: one(shipping_details, {
    fields: [orders.id],
    references: [shipping_details.orderId],
  }),
  status_history: many(order_status_history),
}));

// Junction table to track which orders have been included in transfers
// Ensures each order can only be transferred once via unique constraint on order_id
export const order_transfers = mysqlTable("order_transfers", {
  id: serial('id').primaryKey(),
  order_id: varchar("order_id", { length: 36 }).notNull(),
  transfer_id: bigint('transfer_id', { mode: 'number', unsigned: true }).references(() => transfers.id).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("order_transfers_order_id_idx").on(table.order_id),
  index("order_transfers_transfer_id_idx").on(table.transfer_id),
  unique("order_transfers_order_id_unique").on(table.order_id),
  foreignKey({
    columns: [table.order_id],
    foreignColumns: [orders.id],
    name: "order_transfers_order_id_fk"
  })
])); 