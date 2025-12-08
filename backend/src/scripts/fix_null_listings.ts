import { db } from "../db";
import { backmarket_listings } from "../db/backmarket.schema";
import { isNull, eq } from "drizzle-orm";

async function main() {
  console.log("Fixing null listings...");

  await db.update(backmarket_listings)
    .set({
      sku: "IPHONE12-64-BLK-A",
      grade: 10, // Mint
      publication_state: 1,
      price: "400.00" // Ensure price exists
    })
    .where(isNull(backmarket_listings.sku));
    
  // Also update any that have SKU but might have bad state
  await db.update(backmarket_listings)
    .set({ publication_state: 1 })
    .where(eq(backmarket_listings.sku, "IPHONE12-64-BLK-A"));

  console.log("Fixed listings.");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
