import { mysqlTable, int, boolean, json, datetime, primaryKey, index, mysqlEnum, unique, serial } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { shops } from "./shops.schema";

// Polymorphic association for shop publishing of brands/categories/series/models
export const CATALOG_ENTITY = [
  "brand",
  "device_category",
  "model_series",
  "model",
] as const;
const catalogEntityValues = [...CATALOG_ENTITY] as [string, ...string[]];

export const shopCatalog = mysqlTable("shop_catalog", {
  id: serial("id").notNull(),
  shopId: int("shop_id").notNull(),
  entity_type: mysqlEnum("entity_type", catalogEntityValues).notNull(),
  entity_id: int("entity_id").notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  // Per-entity overrides (e.g., base_price for models), stored flexibly
  metadata: json("metadata"),
  created_at: datetime("created_at", { mode: 'string'}).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: datetime("updated_at", { mode: 'string'}).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
}, (table) => ([
  primaryKey({ columns: [table.id], name: "shop_catalog_id" }),
  unique("shop_catalog_unique").on(table.shopId, table.entity_type, table.entity_id),
  index("shop_catalog_shop_id_idx").on(table.shopId),
  index("shop_catalog_entity_idx").on(table.entity_type, table.entity_id),
]));


