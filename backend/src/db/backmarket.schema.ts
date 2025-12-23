import { mysqlTable, int, varchar, text, decimal, timestamp, json, primaryKey, index, unique, boolean, bigint } from "drizzle-orm/mysql-core";

// Back Market Orders
export const backmarket_orders = mysqlTable("backmarket_orders", {
  order_id: bigint("order_id", { mode: 'number' }).primaryKey().notNull(), // Back Market Order ID
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
  index("idx_bm_orders_status").on(table.status),
  index("idx_bm_orders_creation_date").on(table.creation_date),
]));

// Back Market Listings
export const backmarket_listings = mysqlTable("backmarket_listings", {
  listing_id: varchar("listing_id", { length: 50 }).primaryKey().notNull(), // Can be UUID or Int depending on endpoint, using string to be safe
  product_id: varchar("product_id", { length: 50 }),
  sku: varchar("sku", { length: 255 }),
  title: varchar("title", { length: 255 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  base_price: decimal("base_price", { precision: 10, scale: 2 }), // Manual base price override
  currency: varchar("currency", { length: 3 }),
  quantity: int("quantity"),
  state: int("state"), // 0=New, 1=Refurbished
  grade: int("grade"), // Aesthetic grade
  publication_state: int("publication_state"),
  last_dip_at: timestamp("last_dip_at"), // Track when the last price probe (Dip) was run
  synced_at: timestamp("synced_at").defaultNow().notNull(),
}, (table) => ([
  index("idx_bm_listings_sku").on(table.sku),
]));

// Back Market Listing Prices (Geo-Targeting)
export const backmarket_listing_prices = mysqlTable("backmarket_listing_prices", {
  id: bigint("id", { mode: 'number' }).autoincrement().primaryKey().notNull(),
  listing_id: varchar("listing_id", { length: 50 }).notNull(), // FK to backmarket_listings
  country_code: varchar("country_code", { length: 5 }).notNull(), // e.g. "fr-fr"
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: boolean("status").default(true), // Is active in this country
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ([
  unique("uq_listing_country").on(table.listing_id, table.country_code),
  index("idx_listing_prices_listing").on(table.listing_id)
]));

// Back Market Pricing Parameters (PFCS Inputs)
export const backmarket_pricing_parameters = mysqlTable("backmarket_pricing_parameters", {
  id: bigint("id", { mode: 'number' }).autoincrement().primaryKey().notNull(),
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

  // Strategy Params
  price_step: decimal("price_step", { precision: 10, scale: 2 }).default("1.00"), // Amount to beat competitor by
  min_price: decimal("min_price", { precision: 10, scale: 2 }), // Manual Lower Bound
  max_price: decimal("max_price", { precision: 10, scale: 2 }), // Manual Upper Bound

  updated_at: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ([
  unique("uq_pricing_sku_grade_country").on(table.sku, table.grade, table.country_code),
  index("idx_pricing_sku").on(table.sku)
]));

// Back Market Competitors
export const backmarket_competitors = mysqlTable("backmarket_competitors", {
  id: bigint("id", { mode: 'number' }).autoincrement().primaryKey().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  backmarket_seller_id: varchar("backmarket_seller_id", { length: 100 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  unique("uq_competitor_name").on(table.name)
]));

// Back Market Price History
export const backmarket_price_history = mysqlTable("backmarket_price_history", {
  id: bigint("id", { mode: 'number' }).autoincrement().primaryKey().notNull(),
  listing_id: varchar("listing_id", { length: 50 }).notNull(),
  competitor_id: bigint("competitor_id", { mode: 'number' }), // Null if it's OUR price
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  is_winner: boolean("is_winner").default(false),
}, (table) => ([
  index("idx_history_listing").on(table.listing_id),
  index("idx_history_timestamp").on(table.timestamp)
]));

// Back Market Test Competitors (For Simulation)
export const backmarket_test_competitors = mysqlTable("backmarket_test_competitors", {
  id: bigint("id", { mode: 'number' }).autoincrement().primaryKey().notNull(),
  listing_id: varchar("listing_id", { length: 50 }).notNull(),
  competitor_name: varchar("competitor_name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ([
  index("idx_test_competitors_listing").on(table.listing_id)
]));
