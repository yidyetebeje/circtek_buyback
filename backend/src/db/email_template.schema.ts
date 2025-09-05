import { mysqlTable, int, varchar, text, timestamp, json, primaryKey, index, foreignKey, tinyint, mysqlEnum, bigint } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { shops } from "./shops.schema";

// Email template types enum
export const EMAIL_TEMPLATE_TYPE = {
  ORDER_CONFIRMATION: "ORDER_CONFIRMATION",
  SHIPMENT_RECEIVED: "SHIPMENT_RECEIVED",
  INSPECTION_COMPLETED: "INSPECTION_COMPLETED",
  OFFER_ACCEPTED: "OFFER_ACCEPTED",
  OFFER_REJECTED: "OFFER_REJECTED",
  ORDER_COMPLETED: "ORDER_COMPLETED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  CUSTOM: "CUSTOM"
} as const;

export type EmailTemplateType = typeof EMAIL_TEMPLATE_TYPE[keyof typeof EMAIL_TEMPLATE_TYPE];

// Convert to array for mysqlEnum
const emailTemplateTypeValues = Object.values(EMAIL_TEMPLATE_TYPE) as [string, ...string[]];

// Email templates table
export const emailTemplates = mysqlTable("email_templates", {
  id: varchar("id", { length: 36 }).notNull(),
  shopId: bigint("shop_id", { mode: 'number', unsigned: true }).references(() => shops.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  content: text("content").notNull(), // HTML content from TipTap editor
  templateType: mysqlEnum("template_type", emailTemplateTypeValues).notNull(),
  isActive: tinyint("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  primaryKey({ columns: [table.id], name: "email_templates_id" }),
  index("email_templates_shop_id_idx").on(table.shopId),
  index("email_templates_type_idx").on(table.templateType),
  index("email_templates_active_idx").on(table.isActive),
  
]));

// Dynamic field definitions - these are the available placeholders
export const emailTemplateDynamicFields = mysqlTable("email_template_dynamic_fields", {
  id: varchar("id", { length: 36 }).notNull(),
  fieldKey: varchar("field_key", { length: 100 }).notNull(), // e.g., "order.orderNumber"
  displayName: varchar("display_name", { length: 255 }).notNull(), // e.g., "Order Number"
  description: text("description"), // e.g., "The unique order number assigned to this order"
  category: varchar("category", { length: 100 }).notNull(), // e.g., "order", "customer", "device", "shop"
  dataType: varchar("data_type", { length: 50 }).notNull(), // e.g., "string", "number", "date", "currency"
  defaultValue: text("default_value"), // Optional default value
  isActive: tinyint("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  primaryKey({ columns: [table.id], name: "email_template_dynamic_fields_id" }),
  index("email_template_dynamic_fields_key_idx").on(table.fieldKey),
  index("email_template_dynamic_fields_category_idx").on(table.category),
  index("email_template_dynamic_fields_active_idx").on(table.isActive),
]));

// Export types for TypeScript
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;
export type EmailTemplateDynamicField = typeof emailTemplateDynamicFields.$inferSelect;
export type NewEmailTemplateDynamicField = typeof emailTemplateDynamicFields.$inferInsert; 