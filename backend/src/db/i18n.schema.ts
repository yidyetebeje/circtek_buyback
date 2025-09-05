import { mysqlTable, int, varchar, json, datetime, primaryKey, index, mysqlEnum, unique, serial } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { languages } from "./buyback_catalogue.schema";

// Generic translations table to unify entity-specific translation tables
export const TRANSLATABLE_ENTITY = [
  "device_category",
  "brand",
  "model_series",
  "model",
  "question",
  "question_option",
] as const;
const translatableEntityValues = [...TRANSLATABLE_ENTITY] as [string, ...string[]];

export const translations = mysqlTable("translations", {
  id: serial("id").notNull(),
  entityType: mysqlEnum("entity_type", translatableEntityValues).notNull(),
  entityId: int("entity_id").notNull(),
  languageId: int("language_id").notNull(),
  // Arbitrary map of translated fields, e.g. { title, description, meta_title, ... }
  fields: json("fields").notNull(),
  createdAt: datetime("created_at", { mode: 'string'}).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime("updated_at", { mode: 'string'}).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
}, (table) => ([
  primaryKey({ columns: [table.id], name: "translations_id" }),
  index("translations_entity_idx").on(table.entityType, table.entityId),
  index("translations_language_idx").on(table.languageId),
  unique("translations_entity_language_unique").on(table.entityType, table.entityId, table.languageId),
]));


