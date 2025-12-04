import { mysqlTable, int, varchar, text, decimal, timestamp, json, primaryKey, index, unique, boolean, bigint } from "drizzle-orm/mysql-core";

// Back Market Orders
export const backmarket_orders = mysqlTable("backmarket_orders", {
  order_id: bigint("order_id", { mode: 'number' }).notNull(), // Back Market Order ID
  creation_date: timestamp("creation_date").notNull(),
  modification_date: timestamp("modification_date").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  shipping_first_name: varchar("shipping_first_name", { length: 255 }),
  shipping_last_name: varchar("shipping_last_name", { length: 255 }),
  shipping_address1: varchar("shipping_address1", { length: 255 }),
  shipping_address2: varchar("shipping_address2", { length: 255 }),
  shipping_zipcode: varchar("shipping_zipcode", { length: 20 }),
  shipping_city: varchar("shipping_city", { length: 100 }),
  shipping_country: varchar("shipping_country", { length: 2 }),
  tracking_number: varchar("tracking_number", { length: 100 }),
  tracking_url: text("tracking_url"),
  lines: json("lines"), // Store order lines as JSON for simplicity
  synced_at: timestamp("synced_at").defaultNow().notNull(),
}, (table) => ([
  primaryKey({ columns: [table.order_id], name: "backmarket_orders_pk" }),
  index("idx_bm_orders_status").on(table.status),
  index("idx_bm_orders_creation_date").on(table.creation_date),
]));

// Back Market Listings
export const backmarket_listings = mysqlTable("backmarket_listings", {
  listing_id: varchar("listing_id", { length: 50 }).notNull(), // Can be UUID or Int depending on endpoint, using string to be safe
  product_id: varchar("product_id", { length: 50 }),
  sku: varchar("sku", { length: 255 }),
  title: varchar("title", { length: 255 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }),
  quantity: int("quantity"),
  state: int("state"), // 0=New, 1=Refurbished
  grade: int("grade"), // Aesthetic grade
  publication_state: int("publication_state"),
  synced_at: timestamp("synced_at").defaultNow().notNull(),
}, (table) => ([
  primaryKey({ columns: [table.listing_id], name: "backmarket_listings_pk" }),
  index("idx_bm_listings_sku").on(table.sku),
]));
