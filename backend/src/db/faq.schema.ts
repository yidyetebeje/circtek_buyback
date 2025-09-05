import { mysqlTable, int, varchar, text, datetime, tinyint, primaryKey, index, foreignKey, unique, bigint, serial } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { shops } from "./shops.schema";
import { tenants } from "./circtek.schema";
import { languages } from "./buyback_catalogue.schema";

// Main FAQ table
export const faqs = mysqlTable("faqs", {
  id: serial("id").notNull(),
  question: varchar({ length: 500 }).notNull(),
  answer: text().notNull(),
  order_no: int().default(0),
  is_published: tinyint().default(1).notNull(),
  shop_id:  bigint('shop_id', { mode: 'number', unsigned: true }).references(() => shops.id).notNull(),
  tenant_id: bigint({ mode: 'number', unsigned: true }).references(() => tenants.id).notNull(),
  created_at: datetime({ mode: 'string' }),
  updated_at: datetime({ mode: 'string' }),
},
(table) => [
  primaryKey({ columns: [table.id], name: "faqs_id"}),
  index("faqs_shop_id_idx").on(table.shop_id),
    
  index("faqs_tenant_id_idx").on(table.tenant_id),
  index("faqs_order_no_idx").on(table.order_no),
  index("faqs_is_published_idx").on(table.is_published),

]);

// FAQ Translations table
export const faqTranslations = mysqlTable("faq_translations", {
  id: serial("id").notNull(),
  faq_id: bigint('faq_id', { mode: 'number', unsigned: true }).references(() => faqs.id).notNull(),
  language_id:  bigint('language_id', { mode: 'number', unsigned: true }).references(() => languages.id).notNull(),
  question: varchar({ length: 500 }).notNull(),
  answer: text().notNull(),
},
(table) => [
  primaryKey({ columns: [table.id], name: "faq_translations_id"}),
  unique().on(table.faq_id, table.language_id)
]); 