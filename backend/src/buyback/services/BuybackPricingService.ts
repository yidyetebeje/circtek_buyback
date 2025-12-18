import { db } from "../../db";
import { backmarket_listings, backmarket_pricing_parameters } from "../../db/backmarket.schema";
import { buyback_prices } from "../../db/circtek.schema";
import { eq, and, sql } from "drizzle-orm";

export class BuybackPricingService {
  
  // Default parameters if not found in DB
  private readonly DEFAULT_PARAMS = {
    c_refurb: 20, // Fixed cost
    c_op: 10,     // Fixed cost
    c_risk: 5,    // Fixed cost
    m_target: 0.15, // 15% margin
    f_bm: 0.10    // 10% Back Market fee
  };

  async calculateAndSyncPrices() {
    console.log("Starting Buyback Price Sync...");
    
    // 1. Get all active listings from Back Market (Forward Channel)
    // We use these as the reference for the "Market Price"
    const listings = await db.select().from(backmarket_listings).where(eq(backmarket_listings.publication_state, 1));

    let updatedCount = 0;

    for (const listing of listings) {
      if (!listing.sku || !listing.price) continue;

      // 2. Get pricing parameters for this SKU
      const params = await this.getPricingParams(listing.sku, listing.grade || 1);
      
      const marketPrice = Number(listing.price);
      
      // Costs
      const c_refurb = Number(params.c_refurb || this.DEFAULT_PARAMS.c_refurb);
      const c_op = Number(params.c_op || this.DEFAULT_PARAMS.c_op);
      const c_risk = Number(params.c_risk || this.DEFAULT_PARAMS.c_risk);
      
      // Margins & Fees (percentages)
      const m_target = Number(params.m_target || this.DEFAULT_PARAMS.m_target);
      const f_bm = Number(params.f_bm || this.DEFAULT_PARAMS.f_bm); // Fee is on the selling price
      
      // Formula:
      // Selling Price = Buyback Price + Costs + (Selling Price * Margin) + (Selling Price * Fee)
      // Buyback Price = Selling Price - Costs - (Selling Price * Margin) - (Selling Price * Fee)
      
      const costs = c_refurb + c_op + c_risk;
      const variableCosts = marketPrice * (m_target + f_bm);
      
      let buybackPrice = marketPrice - costs - variableCosts;
      
      // Ensure non-negative
      if (buybackPrice < 0) buybackPrice = 0;
      
      // Round to 2 decimals
      buybackPrice = Math.round(buybackPrice * 100) / 100;

      // 3. Update buyback_prices table
      const gradeName = this.mapGrade(listing.grade);
      
      // We need a tenant_id. Assuming tenant_id=1 for now.
      const tenantId = 1; 

      await db.insert(buyback_prices).values({
        sku: listing.sku,
        grade_name: gradeName,
        price: buybackPrice.toString(),
        market_price: marketPrice.toString(),
        tenant_id: tenantId
      }).onDuplicateKeyUpdate({
        set: {
          price: buybackPrice.toString(),
          market_price: marketPrice.toString(),
          updated_at: new Date()
        }
      });
      
      updatedCount++;
    }
    
    console.log(`Buyback Price Sync completed. Updated ${updatedCount} prices.`);
  }

  async getPrices() {
    return await db.select().from(buyback_prices);
  }

  private async getPricingParams(sku: string, grade: number) {
    const result = await db.select().from(backmarket_pricing_parameters)
      .where(and(
        eq(backmarket_pricing_parameters.sku, sku),
        eq(backmarket_pricing_parameters.grade, grade)
      ))
      .limit(1);
      
    return result[0] || {};
  }

  private mapGrade(bmGrade: number | null): string {
    // Map Back Market grades to internal names
    // 10: Mint, 11: Very Good, 12: Good, 13: Fair, 14: Stallone (Broken)
    // Note: These are example IDs, need to verify BM API docs or existing code.
    // Based on `backmarket.schema.ts`, grade is `int`.
    
    // Let's assume standard mapping for now.
    switch (bmGrade) {
      case 10: return "Mint";
      case 11: return "Very Good";
      case 12: return "Good";
      case 13: return "Fair";
      case 14: return "Stallone";
      default: return `Grade ${bmGrade}`;
    }
  }
}
