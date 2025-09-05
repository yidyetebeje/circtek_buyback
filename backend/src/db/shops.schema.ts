import { boolean,mysqlTable, mysqlSchema, AnyMySqlColumn, primaryKey, int, varchar, datetime, json, unique, tinyint, char, index, foreignKey, longtext, bigint, float, mysqlEnum, text, double, mysqlView, serial } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"
import { tenants, users } from "./circtek.schema"
export const shops = mysqlTable("shops", {
	id: serial("id").notNull(),
	name: varchar("name", { length: 255 }),
	tenant_id: bigint("tenant_id", { mode: 'number', unsigned: true }),
	owner_id: int("owner_id"),
	logo: varchar("logo", { length: 255 }),
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
	foreignKey({
		columns: [table.tenant_id],
		foreignColumns: [tenants.id],
		name: "shops_tenant_id_fk"
	}),
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