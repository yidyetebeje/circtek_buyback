import { db } from "../../db";
import { backmarket_pricing_parameters, backmarket_listings, backmarket_orders, backmarket_listing_prices } from "../../db/backmarket.schema";
import { devices, received_items, purchase_items } from "../../db/circtek.schema";
import { eq, and, sql, gte } from "drizzle-orm";

export class PricingRepository {
  async getParameters(sku: string, grade: number, countryCode: string) {
    const result = await db.select().from(backmarket_pricing_parameters)
      .where(and(
        eq(backmarket_pricing_parameters.sku, sku),
        eq(backmarket_pricing_parameters.grade, grade),
        eq(backmarket_pricing_parameters.country_code, countryCode)
      ))
      .limit(1);
    
    return result[0] || null;
  }

  async upsertParameters(params: {
    sku: string;
    grade: number;
    country_code: string;
    c_refurb?: string;
    c_op?: string;
    c_risk?: string;
    m_target?: string;
    f_bm?: string;
  }) {
    const existing = await this.getParameters(params.sku, params.grade, params.country_code);
    
    if (existing) {
      await db.update(backmarket_pricing_parameters)
        .set({
          ...params,
          updated_at: new Date()
        })
        .where(eq(backmarket_pricing_parameters.id, existing.id));
    } else {
      await db.insert(backmarket_pricing_parameters).values({
        ...params,
        updated_at: new Date()
      });
    }
  }

  async getListingDetails(listingId: string) {
     const result = await db.select().from(backmarket_listings)
      .where(eq(backmarket_listings.listing_id, listingId))
      .limit(1);
      return result[0] || null;
  }

  /**
   * Get all active listings IDs.
   */
  async getAllActiveListings(): Promise<string[]> {
    const result = await db.select({
      listingId: backmarket_listings.listing_id
    })
    .from(backmarket_listings)
    .where(eq(backmarket_listings.publication_state, 1)); // Assuming 1 is active

    return result.map(r => r.listingId);
  }

  /**
   * Get active countries for a listing.
   * Returns array of country codes (e.g. ['fr-fr', 'de-de'])
   */
  async getActiveCountries(listingId: string): Promise<string[]> {
    const result = await db.select({
      countryCode: backmarket_listing_prices.country_code
    })
    .from(backmarket_listing_prices)
    .where(and(
      eq(backmarket_listing_prices.listing_id, listingId),
      eq(backmarket_listing_prices.status, true)
    ));

    return result.map(r => r.countryCode);
  }

  /**
   * Calculates sales velocity (units sold) for a SKU in the last 30 days.
   * Note: Since lines are stored as JSON, this fetches recent orders and filters in memory.
   */
  async getSalesVelocity(sku: string, days: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentOrders = await db.select({
        lines: backmarket_orders.lines
      })
      .from(backmarket_orders)
      .where(gte(backmarket_orders.creation_date, cutoffDate));

      let totalSold = 0;
      for (const order of recentOrders) {
        const lines = order.lines as any[]; 
        if (Array.isArray(lines)) {
          for (const line of lines) {
            // Check if line matches SKU. 
            // Assuming line.sku or line.listing.sku based on typical BM API response
            if (line.sku === sku || line.listing?.sku === sku) {
              totalSold += (line.quantity || 1);
            }
          }
        }
      }
      return totalSold;
    } catch (error) {
      console.error(`Error calculating sales velocity for SKU ${sku}:`, error);
      return 0;
    }
  }

  /**
   * Calculates the average acquisition cost for a SKU based on current stock.
   * Joins devices -> received_items -> purchase_items to find the cost of each device.
   */
  async getAverageAcquisitionCost(sku: string): Promise<number> {
    try {
      // We want the average price of devices that are currently in stock (status = true)
      // and match the given SKU.
      const result = await db
        .select({
          avgCost: sql<string>`AVG(${purchase_items.price})`
        })
        .from(devices)
        .innerJoin(received_items, eq(devices.id, received_items.device_id))
        .innerJoin(purchase_items, eq(received_items.purchase_item_id, purchase_items.id))
        .where(and(
          eq(devices.sku, sku),
          eq(devices.status, true) // Only count active/in-stock devices
        ));

      if (result[0] && result[0].avgCost) {
        return parseFloat(result[0].avgCost);
      }
      
      // Fallback: If no devices in stock, check purchase history for this SKU generally
      const historyResult = await db
        .select({
          avgCost: sql<string>`AVG(${purchase_items.price})`
        })
        .from(purchase_items)
        .where(eq(purchase_items.sku, sku));

      if (historyResult[0] && historyResult[0].avgCost) {
        return parseFloat(historyResult[0].avgCost);
      }

      return 0;
    } catch (error) {
      console.error(`Error calculating acquisition cost for SKU ${sku}:`, error);
      return 0;
    }
  }
}
