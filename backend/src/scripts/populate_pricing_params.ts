import { db } from "../db";
import { backmarket_listings, backmarket_pricing_parameters } from "../db/backmarket.schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Starting population of pricing parameters...");

  // 1. Get all unique SKUs from listings
  const listings = await db.select({
    sku: backmarket_listings.sku,
    grade: backmarket_listings.grade
  }).from(backmarket_listings);

  console.log(`Fetched ${listings.length} listings from DB.`);
  if (listings.length > 0) {
    console.log('Sample listing:', listings[0]);
  }

  // Filter out duplicates based on SKU + Grade
  const uniqueItems = new Map<string, { sku: string, grade: number }>();
  
  for (const item of listings) {
    if (!item.sku || item.grade === null) continue;
    const key = `${item.sku}-${item.grade}`;
    if (!uniqueItems.has(key)) {
      uniqueItems.set(key, { sku: item.sku, grade: item.grade });
    }
  }

  console.log(`Found ${uniqueItems.size} unique SKU/Grade combinations.`);

  let insertedCount = 0;

  for (const item of uniqueItems.values()) {
    // Check if exists
    const existing = await db.select().from(backmarket_pricing_parameters)
      .where(eq(backmarket_pricing_parameters.sku, item.sku)) // Simplified check, ideally check grade too but let's just ensure we have coverage
      .limit(1);

    // We want to insert for specific grade if not exists
    // But let's just do a safe insert ignore or check properly
    // Actually, let's just insert for this specific SKU+Grade+Country
    // We'll assume 'fr-fr' as default country for now
    const countryCode = 'fr-fr';

    try {
      await db.insert(backmarket_pricing_parameters).values({
        sku: item.sku,
        grade: item.grade,
        country_code: countryCode,
        c_refurb: "20.00",
        c_op: "10.00",
        c_risk: "5.00",
        m_target: "0.1500",
        f_bm: "0.1000"
      }).onDuplicateKeyUpdate({
        set: {
          updated_at: new Date()
        }
      });
      insertedCount++;
    } catch (e) {
      console.error(`Failed to insert for ${item.sku}:`, e);
    }
  }

  console.log(`Populated parameters for ${insertedCount} items.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
