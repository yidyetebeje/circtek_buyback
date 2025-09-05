import { boolean,mysqlTable, mysqlSchema, AnyMySqlColumn, primaryKey, int, varchar, datetime, json, unique, tinyint, char, index, foreignKey, longtext, bigint, float, mysqlEnum, text, double, mysqlView, serial } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"
import { tenants, users } from "./circtek.schema"
import { brands, device_categories, languages, model_series, models } from "./buyback_catalogue.schema";
export const shops = mysqlTable("shops", {
	id: serial("id").notNull(),
	name: varchar("name", { length: 255 }),
	tenant_id:bigint("tenant_id", { mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
	owner_id: int("owner_id"),
	logo: text("logo"),
	organization: varchar("organization", { length: 255 }),
	config: json("config"),
	phone: varchar("phone", { length: 255 }),
	active: tinyint("active").default(1),
	created_at: datetime("created_at", { mode: 'string'}),
	updated_at: datetime("updated_at", { mode: 'string'}),
	deleted_at: datetime("deleted_at", { mode: 'string'}),
},
(table) => [
	primaryKey({ columns: [table.id], name: "shops_id"}),
	index("shops_tenant_id_idx").on(table.tenant_id),
	index("shops_owner_id_idx").on(table.owner_id),
	unique("shops_name_unique").on(table.name)
]);

export const user_shop_access = mysqlTable("user_shop_access", {
	id: serial("id").notNull(),
	user_id:  bigint('user_id', { mode: 'number', unsigned: true }).references(() => users.id).notNull(),
	shop_id: bigint("shop_id", { mode: 'number', unsigned: true }).references(() => shops.id).notNull(),
	can_view: boolean("can_view").default(true).notNull(),
	can_edit: boolean("can_edit").default(false).notNull(),
	created_at: datetime("created_at", { mode: 'string'}).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updated_at: datetime("updated_at", { mode: 'string'}).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
	created_by: bigint('created_by', { mode: 'number', unsigned: true }).references(() => users.id),
},
(table) => [
	primaryKey({ columns: [table.id], name: "user_shop_access_id"}),
	unique("user_shop_unique").on(table.user_id, table.shop_id),
	index("user_shop_access_user_id_idx").on(table.user_id),
	index("user_shop_access_shop_id_idx").on(table.shop_id),


	
]);

export const shop_locations = mysqlTable("shop_locations", {
	id: serial("id").notNull(),
	shop_id: bigint("shop_id", { mode: 'number', unsigned: true }).references(() => shops.id).notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	address: text("address").notNull(),
	city: varchar("city", { length: 100 }).notNull(),
	state: varchar("state", { length: 100 }),
	postal_code: varchar("postal_code", { length: 20 }),
	country: varchar("country", { length: 100 }).notNull(),
	latitude: double("latitude").notNull(),
	longitude: double("longitude").notNull(),
	description: text("description"),
	operating_hours: json("operating_hours"), // JSON field for flexible hours structure
	is_active: boolean("is_active").default(true).notNull(),
	display_order: int("display_order").default(0),
	created_at: datetime("created_at", { mode: 'string'}).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updated_at: datetime("updated_at", { mode: 'string'}).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "shop_locations_id"}),
	index("shop_locations_shop_id_idx").on(table.shop_id),
	index("shop_locations_active_idx").on(table.is_active),
	index("shop_locations_coordinates_idx").on(table.latitude, table.longitude),

]);

export const shop_location_phones = mysqlTable("shop_location_phones", {
	id: serial("id").notNull(),
	location_id: bigint("location_id", { mode: 'number', unsigned: true }).references(() => shop_locations.id).notNull(),
	phone_number: varchar("phone_number", { length: 20 }).notNull(),
	phone_type: mysqlEnum("phone_type", ["main", "mobile", "fax", "whatsapp"]).default("main").notNull(),
	is_primary: boolean("is_primary").default(false).notNull(),
	created_at: datetime("created_at", { mode: 'string'}).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updated_at: datetime("updated_at", { mode: 'string'}).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "shop_location_phones_id"}),
	index("shop_location_phones_location_id_idx").on(table.location_id),
	index("shop_location_phones_primary_idx").on(table.is_primary),
	
]);


export const device_categories_translations = mysqlTable("device_category_translations", {
	id: int().autoincrement().notNull(),
	category_id: bigint("category_id", { mode: 'number', unsigned: true }).references(() => device_categories.id).notNull(),
	language_id: bigint("language_id", { mode: 'number', unsigned: true }).references(() => languages.id).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	meta_title: varchar({ length: 255 }),
	meta_description: text(),
	meta_keywords: varchar({ length: 255 }),
  },
  (table) => [
	primaryKey({ columns: [table.id], name: "device_category_translations_id"}),
	unique().on(table.category_id, table.language_id)
  ]);
  
  export const brand_translations = mysqlTable("brand_translations", {
	id: int().autoincrement().notNull(),
	brand_id: bigint("brand_id", { mode: 'number', unsigned: true }).references(() => brands.id).notNull(),
	language_id: bigint("language_id", { mode: 'number', unsigned: true }).references(() => languages.id).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	meta_title: varchar({ length: 255 }),
	meta_description: text(),
	meta_keywords: varchar({ length: 255 }),
  },
  (table) => [
	primaryKey({ columns: [table.id], name: "brand_translations_id"}),
	unique().on(table.brand_id, table.language_id)
  ]);
  
  export const model_series_translations = mysqlTable("model_series_translations", {
	id: int().autoincrement().notNull(),
	series_id: bigint("series_id", { mode: 'number', unsigned: true }).references(() => model_series.id).notNull(),
	language_id: bigint("language_id", { mode: 'number', unsigned: true }).references(() => languages.id).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	meta_title: varchar({ length: 255 }),
	meta_description: text(),
	meta_keywords: varchar({ length: 255 }),
  },
  (table) => [
	primaryKey({ columns: [table.id], name: "model_series_translations_id"}),
	
	unique().on(table.series_id, table.language_id)
  ]);
  
  export const model_translations = mysqlTable("model_translations", {
	id: int().autoincrement().notNull(),
	model_id: bigint("model_id", { mode: 'number', unsigned: true }).references(() => models.id).notNull(),
	language_id: bigint("language_id", { mode: 'number', unsigned: true }).references(() => languages.id).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	meta_title: varchar({ length: 255 }),
	meta_description: text(),
	meta_keywords: varchar({ length: 255 }),
	specifications: json(),
	tooltip_of_model: varchar({ length: 255 }),
	searchable_words: text(),
  },
  (table) => [
	primaryKey({ columns: [table.id], name: "model_translations_id"}),
	
	unique().on(table.model_id, table.language_id)
  ]);
  
  // Shop catalog relationships for publishing status
  export const shop_brands = mysqlTable("shop_brands", {
	id: int().autoincrement().notNull(),
	shop_id: bigint("shop_id", { mode: 'number', unsigned: true }).references(() => shops.id).notNull(),
	brand_id: bigint("brand_id", { mode: 'number', unsigned: true }).references(() => brands.id).notNull(),
	is_published: tinyint().default(0).notNull(),
	createdAt: datetime({ mode: 'string' }),
	updatedAt: datetime({ mode: 'string' }),
  },
  (table) => [
	primaryKey({ columns: [table.id], name: "shop_brands_id" }),
	unique().on(table.shop_id, table.brand_id)
  ]);
  
  export const shop_device_categories = mysqlTable("shop_device_categories", {
	id: int().autoincrement().notNull(),
	shop_id: bigint("shop_id", { mode: 'number', unsigned: true }).references(() => shops.id).notNull(),
	category_id: bigint("category_id", { mode: 'number', unsigned: true }).references(() => device_categories.id).notNull(),
	is_published: tinyint().default(0).notNull(),
	createdAt: datetime({ mode: 'string' }),
	updatedAt: datetime({ mode: 'string' }),
  },
  (table) => [
	primaryKey({ columns: [table.id], name: "shop_device_categories_id" }),
	unique().on(table.shop_id, table.category_id),
  ]);
  
  export const shop_model_series = mysqlTable("shop_model_series", {
	id: int().autoincrement().notNull(),
	shop_id: bigint("shop_id", { mode: 'number', unsigned: true }).references(() => shops.id).notNull(),
	series_id: bigint("series_id", { mode: 'number', unsigned: true }).references(() => model_series.id).notNull(),
	is_published: tinyint().default(0).notNull(),
	createdAt: datetime({ mode: 'string' }),
	updatedAt: datetime({ mode: 'string' }),
  },
  (table) => [
	primaryKey({ columns: [table.id], name: "shop_model_series_id" }),
	unique().on(table.shop_id, table.series_id),
	
  ]);
  
  export const shop_models = mysqlTable("shop_models", {
	id: int().autoincrement().notNull(),
	shop_id: bigint("shop_id", { mode: 'number', unsigned: true }).references(() => shops.id).notNull(),
	model_id: bigint("model_id", { mode: 'number', unsigned: true }).references(() => models.id).notNull(),
	is_published: tinyint().default(0).notNull(),
	base_price: float(),
	createdAt: datetime({ mode: 'string' }),
	updatedAt: datetime({ mode: 'string' }),
  },
  (table) => [
	primaryKey({ columns: [table.id], name: "shop_models_id" }),
	unique().on(table.shop_id, table.model_id),
	
  ]);
  