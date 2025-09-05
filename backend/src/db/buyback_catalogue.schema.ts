import { sql } from 'drizzle-orm';
import { int, mysqlTable, serial, tinyint, timestamp, varchar, boolean, bigint, json, text, mysqlEnum, date, decimal, datetime, primaryKey, index, unique, float, foreignKey } from 'drizzle-orm/mysql-core';
import { shops } from './shops.schema';
import { tenants } from './circtek.schema';
export const device_categories = mysqlTable("device_categories", {
  id: serial("id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 255 }),
  description: text("description"),
  meta_title: varchar("meta_title", { length: 255 }),
  sef_url: varchar("sef_url", { length: 255 }).notNull(),
  order_no: int("order_no").default(0),
  meta_canonical_url: varchar("meta_canonical_url", { length: 255 }),
  meta_description: text("meta_description"),
  meta_keywords: varchar("meta_keywords", { length: 255 }),
  tenant_id: bigint("tenant_id", { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  createdAt: datetime("created_at", { mode: 'string' }),
  updatedAt: datetime("updated_at", { mode: 'string' }),
},
(table) => [
  primaryKey({ columns: [table.id], name: "device_categories_id"}),
  index("device_categories_tenant_id_idx").on(table.tenant_id),
  unique().on(table.sef_url, table.tenant_id)
]);

export const brands = mysqlTable("brands", {
  id: serial("id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 255 }),
  description: text("description"),
  meta_title: varchar("meta_title", { length: 255 }),
  sef_url: varchar("sef_url", { length: 255 }).notNull(),
  meta_canonical_url: varchar("meta_canonical_url", { length: 255 }),
  meta_description: text("meta_description"),
  meta_keywords: varchar("meta_keywords", { length: 255 }),
  order_no: int("order_no").default(0),
  tenant_id: bigint("tenant_id", { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  createdAt: datetime("created_at", { mode: 'string' }),
  updatedAt: datetime("updated_at", { mode: 'string' }),
},
(table) => [
  primaryKey({ columns: [table.id], name: "brands_id"}),
  index("brands_tenant_id_idx").on(table.tenant_id),
  unique().on(table.sef_url, table.tenant_id)
]);

export const model_series = mysqlTable("model_series", {
  id: serial("id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  icon_image: varchar("icon_image", { length: 255 }),
  image: varchar("image", { length: 255 }),
  description: text("description"),
  meta_title: varchar("meta_title", { length: 255 }),
  sef_url: varchar("sef_url", { length: 255 }).notNull(),
  meta_canonical_url: varchar("meta_canonical_url", { length: 255 }),
  meta_description: text("meta_description"),
  meta_keywords: varchar("meta_keywords", { length: 255 }),
  order_no: int("order_no").default(0),
  tenant_id: bigint("tenant_id", { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  createdAt: datetime("created_at", { mode: 'string' }),
  updatedAt: datetime("updated_at", { mode: 'string' }),
},
(table) => [
  primaryKey({ columns: [table.id], name: "model_series_id"}),
  index("model_series_tenant_id_idx").on(table.tenant_id),
  unique().on(table.sef_url, table.tenant_id)
]);

export const models = mysqlTable("models", {
  id: serial("id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  sef_url: varchar("sef_url", { length: 255 }).notNull(),
  base_price: float("base_price"),
  searchable_words: text("searchable_words"),
  tooltip_of_model: varchar("tooltip_of_model", { length: 255 }),
  model_image: varchar("model_image", { length: 255 }),
  category_id: bigint("category_id", { mode: 'number', unsigned: true }).references(() => device_categories.id).notNull(),
  brand_id: bigint("brand_id", { mode: 'number', unsigned: true }).references(() => brands.id).notNull(),
  model_series_id: bigint("model_series_id", { mode: 'number', unsigned: true }).references(() => model_series.id),
  tenant_id: bigint("tenant_id", { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  meta_canonical_url: varchar("meta_canonical_url", { length: 255 }),
  meta_description: text("meta_description"),
  meta_keywords: varchar("meta_keywords", { length: 255 }),
  createdAt: datetime("created_at", { mode: 'string' }),
  updatedAt: datetime("updated_at", { mode: 'string' }),
},
(table) => [
  primaryKey({ columns: [table.id], name: "models_id"}),
 
  index("models_tenant_id_idx").on(table.tenant_id),
  index("models_category_id_idx").on(table.category_id),
  index("models_brand_id_idx").on(table.brand_id),
  index("models_model_series_id_idx").on(table.model_series_id),
  unique().on(table.sef_url, table.tenant_id)
]);

// Translation tables for multilingual support
export const languages = mysqlTable("languages", {
  id: serial("id").notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  is_default: tinyint("is_default").default(0),
  is_active: tinyint("is_active").default(1),
  createdAt: datetime("created_at", { mode: 'string' }),
  updatedAt: datetime("updated_at", { mode: 'string' }),
},
(table) => [
  primaryKey({ columns: [table.id], name: "languages_id"}),
  unique().on(table.code)
]);

// Translations moved to generic translations table in i18n.schema.ts

// Shop catalog relationships for publishing status
// Shop publishing relationships moved to generic shop_catalog table in shop_catalog.schema.ts

// Device Condition Question Set System

// Question Sets (templates)
export const question_sets = mysqlTable("question_sets", {
  id: serial("id").notNull(),
  internal_name: varchar("internal_name", { length: 255 }).notNull(),
  display_name: varchar("display_name", { length: 255 }).notNull(),
  description: text("description"),
  tenant_id:  bigint('tenant_id', { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  createdAt: datetime("created_at", { mode: 'string' }),
  updatedAt: datetime("updated_at", { mode: 'string' }),
},
(table) => [
  primaryKey({ columns: [table.id], name: "question_sets_id"}),
 
  index("question_sets_tenant_id_idx").on(table.tenant_id),
  unique().on(table.internal_name, table.tenant_id)
]);

// Individual Questions
export const device_questions = mysqlTable("device_questions", {
  id:serial("id").notNull(),
  question_set_id: bigint("question_set_id", { mode: 'number', unsigned: true }).references(() => question_sets.id).notNull(),
  key: varchar("key", { length: 100 }),
  title: varchar("title", { length: 255 }).notNull(),
  input_type: mysqlEnum("input_type", ["SINGLE_SELECT_RADIO", "SINGLE_SELECT_DROPDOWN", "MULTI_SELECT_CHECKBOX", "TEXT_INPUT", "NUMBER_INPUT"]).notNull(),
  tooltip: text("tooltip"),
  category: varchar("category", { length: 100 }),
  is_required: tinyint("is_required").default(1).notNull(),
  order_no: int("order_no").notNull(),
  metadata: json("metadata"),
  created_at: datetime("created_at", { mode: 'string' }),
  updated_at: datetime("updated_at", { mode: 'string' }),
},
(table) => [
  primaryKey({ columns: [table.id], name: "device_questions_id"}),
 
  index("questions_question_set_id_idx").on(table.question_set_id),
  index("questions_key_idx").on(table.key)
]);

// Question Options
export const question_options = mysqlTable("question_options", {
  id: serial("id").notNull(),
  question_id: bigint("question_id", { mode: 'number', unsigned: true }).references(() => device_questions.id).notNull(),
  key: varchar("key", { length: 100 }),
  title: varchar("title", { length: 255 }).notNull(),
  price_modifier: float("price_modifier").default(0),
  icon: varchar("icon", { length: 255 }),
  is_default: tinyint("is_default").default(0).notNull(),
  order_no: int("order_no").notNull(),
  metadata: json("metadata"),
  created_at: datetime("created_at", { mode: 'string' }),
  updated_at: datetime("updated_at", { mode: 'string' }),
},
(table) => [
  primaryKey({ columns: [table.id], name: "question_options_id"}),
  index("question_options_question_id_idx").on(table.question_id),
  index("question_options_key_idx").on(table.key)
]);

// Device Model Question Set Assignments (many-to-many)
export const deviceModelQuestionSetAssignments = mysqlTable("device_model_question_set_assignments", {
  id: serial("id").notNull(),
  model_id: bigint("model_id", { mode: 'number', unsigned: true }).notNull(),
  question_set_id: bigint("question_set_id", { mode: 'number', unsigned: true }).notNull(),
  assignment_order: int("assignment_order").default(0).notNull(),
  created_at: datetime("created_at", { mode: 'string' }),
  updated_at: datetime("updated_at", { mode: 'string' }),
},
(table) => [
  primaryKey({ columns: [table.id], name: "device_model_question_set_assignments_id"}),
  
  // Short, explicit FK names to avoid MySQL 64-char identifier limit
  foreignKey({
    columns: [table.model_id],
    foreignColumns: [models.id],
    name: 'fk_dmqsa_model_id',
  }),
  foreignKey({
    columns: [table.question_set_id],
    foreignColumns: [question_sets.id],
    name: 'fk_dmqsa_question_set_id',
  }),
  index("device_model_question_set_assignments_model_id_idx").on(table.model_id),
  index("device_model_question_set_assignments_question_set_id_idx").on(table.question_set_id),
  unique("uq_model_question_set").on(table.model_id, table.question_set_id)
]);

// Translation tables for question sets system

export const questionSetTranslations = mysqlTable("question_set_translations", {
  id: serial("id").notNull(),
  question_set_id: bigint("question_set_id", { mode: 'number', unsigned: true }).references(() => question_sets.id).notNull(),
  language_id: bigint("language_id", { mode: 'number', unsigned: true }).references(() => languages.id).notNull(),
  display_name: varchar("display_name", { length: 255 }).notNull(),
  description: text("description"),
},
(table) => [
  primaryKey({ columns: [table.id], name: "question_set_translations_id"}),


  unique().on(table.question_set_id, table.language_id)
]);

// Question translations moved to generic translations table in i18n.schema.ts

export const featured_devices = mysqlTable("featured_devices", {
  id: serial("id").notNull(),
  modelId: bigint("model_id", { mode: 'number', unsigned: true }).references(() => models.id).notNull(),
  shopId: bigint("shop_id", { mode: 'number', unsigned: true }).references(() => shops.id).notNull(),
  tenantId: bigint("tenant_id", { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: datetime("created_at", { mode: 'string'}).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime("updated_at", { mode: 'string'}).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
  primaryKey({ columns: [table.id], name: "featured_devices_id"}),

  
 
  index("featured_devices_tenant_id_idx").on(table.tenantId),
  index("featured_devices_model_id_idx").on(table.modelId),
  index("featured_devices_shop_id_idx").on(table.shopId),
  unique("featured_devices_model_shop_tenant_unique").on(table.modelId, table.shopId, table.tenantId)
]);

// Device Model Test Price Drops
export const model_test_price_drops = mysqlTable("model_test_price_drops", {
  id: serial("id").notNull(),
  model_id: bigint("model_id", { mode: 'number', unsigned: true }).references(() => models.id).notNull(),
  test_name: varchar("test_name", { length: 255 }).notNull(),
  price_drop: float("price_drop").default(0).notNull(),
  created_at: datetime("created_at", { mode: 'string' }),
  updated_at: datetime("updated_at", { mode: 'string' }),
},
(table) => [
  primaryKey({ columns: [table.id], name: "model_test_price_drops_id" }),

  unique("uq_model_test_name").on(table.model_id, table.test_name),
  index("model_test_price_drops_model_id_idx").on(table.model_id)
]);