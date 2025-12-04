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

// Back Market Listing Prices (Geo-Targeting)
export const backmarket_listing_prices = mysqlTable("backmarket_listing_prices", {
  id: bigint("id", { mode: 'number' }).autoincrement().notNull(),
  listing_id: varchar("listing_id", { length: 50 }).notNull(), // FK to backmarket_listings
  country_code: varchar("country_code", { length: 5 }).notNull(), // e.g. "fr-fr"
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: boolean("status").default(true), // Is active in this country
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ([
  primaryKey({ columns: [table.id], name: "backmarket_listing_prices_pk" }),
  unique("uq_listing_country").on(table.listing_id, table.country_code),
  index("idx_listing_prices_listing").on(table.listing_id)
]));

// Back Market Pricing Parameters (PFCS Inputs)
export const backmarket_pricing_parameters = mysqlTable("backmarket_pricing_parameters", {
  id: bigint("id", { mode: 'number' }).autoincrement().notNull(),
  sku: varchar("sku", { length: 255 }).notNull(), // Link to internal SKU
  grade: int("grade").notNull(), // Back Market Grade
  country_code: varchar("country_code", { length: 5 }).notNull(), // e.g. "fr-fr"
  
  // Cost Components
  c_refurb: decimal("c_refurb", { precision: 10, scale: 2 }).default("0.00"),
  c_op: decimal("c_op", { precision: 10, scale: 2 }).default("0.00"),
  c_risk: decimal("c_risk", { precision: 10, scale: 2 }).default("0.00"),
  
  // Market Params
  m_target: decimal("m_target", { precision: 5, scale: 4 }).default("0.1500"), // 15% = 0.15
  f_bm: decimal("f_bm", { precision: 5, scale: 4 }).default("0.1000"), // 10% = 0.10
  
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ([
  primaryKey({ columns: [table.id], name: "backmarket_pricing_parameters_pk" }),
  unique("uq_pricing_sku_grade_country").on(table.sku, table.grade, table.country_code),
  index("idx_pricing_sku").on(table.sku)
]));
