import { TrafficController, Priority } from '../../lib/bm-traffic-control';
import { loadRateLimitConfig, saveRateLimitConfig, DEFAULT_BACKMARKET_LIMITS } from '../../lib/bm-traffic-control/config';
import { logRateLimitRequest } from './rateLimitLogger';
import { PricingRepository } from '../pricing/PricingRepository';
import { OutlierDetectionService } from '../pricing/OutlierDetectionService';
import { ProfitabilityConstraintService } from '../pricing/ProfitabilityConstraintService';
import { DynamicPricingEngine } from '../pricing/DynamicPricingEngine';
import { RateLimitConfig } from '../../lib/bm-traffic-control/types';
import { db } from '../../db';
import { backmarket_listings, backmarket_test_competitors } from '../../db/backmarket.schema';
import { eq } from 'drizzle-orm';

export class BackMarketService {
  private baseUrl = process.env.BACKMARKET_API_URL || 'https://www.backmarket.fr';
  private apiToken = process.env.BACKMARKET_API_TOKEN;
  private traffic: TrafficController;
  
  // Pricing Services
  private pricingRepo: PricingRepository;
  private ods: OutlierDetectionService;
  private pfcs: ProfitabilityConstraintService;
  private dpo: DynamicPricingEngine;

  constructor(
    traffic?: TrafficController,
    pricingRepo?: PricingRepository,
    ods?: OutlierDetectionService,
    pfcs?: ProfitabilityConstraintService,
    dpo?: DynamicPricingEngine
  ) {
    if (traffic) {
      this.traffic = traffic;
    } else {
      this.traffic = new TrafficController(DEFAULT_BACKMARKET_LIMITS, logRateLimitRequest);
      // Async update from DB
      loadRateLimitConfig().then(config => {
        this.traffic.updateConfig(config);
      }).catch(err => {
        console.error('Failed to load rate limit config:', err);
      });
    }
    this.pricingRepo = pricingRepo || new PricingRepository();
    this.ods = ods || new OutlierDetectionService();
    this.pfcs = pfcs || new ProfitabilityConstraintService();
    this.dpo = dpo || new DynamicPricingEngine();
  }

  private getHeaders() {
    return {
      'Authorization': `Basic ${this.apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  public getRateLimitStatus() {
    return this.traffic.getStatus();
  }

  public getDefaultRateLimits() {
    return DEFAULT_BACKMARKET_LIMITS;
  }

  public async updateRateLimitConfig(config: RateLimitConfig) {
    await saveRateLimitConfig(config);
    this.traffic.updateConfig(config);
    return { success: true };
  }

  /**
   * Get BuyBack orders
   */
  async getBuyBackOrders(params?: Record<string, any>, priority: Priority = Priority.NORMAL): Promise<Response> {
    const url = new URL(`${this.baseUrl}/ws/buyback/v1/orders`);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, String(params[key])));
    }
    return this.traffic.scheduleRequest(
      url.toString(),
      {
        method: 'GET',
        headers: this.getHeaders()
      },
      priority,
      1
    );
  }

  /**
   * Get a single BuyBack order
   */
  async getBuyBackOrder(orderId: string, priority: Priority = Priority.NORMAL): Promise<Response> {
    return this.traffic.scheduleRequest(
      `${this.baseUrl}/ws/buyback/v1/orders/${orderId}`,
      {
        method: 'GET',
        headers: this.getHeaders()
      },
      priority,
      1
    );
  }

  /**
   * Get BuyBack orders pending reply
   */
  async getBuyBackOrdersPendingReply(params?: Record<string, any>, priority: Priority = Priority.NORMAL): Promise<Response> {
    const url = new URL(`${this.baseUrl}/ws/buyback/v1/orders/pending-reply`);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, String(params[key])));
    }
    return this.traffic.scheduleRequest(
      url.toString(),
      {
        method: 'GET',
        headers: this.getHeaders()
      },
      priority,
      1
    );
  }

  /**
   * Create a new listing on Back Market
   */
  async createListing(data: any, priority: Priority = Priority.HIGH): Promise<Response> {
    return this.traffic.scheduleRequest(
      `${this.baseUrl}/ws/listings`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      },
      priority,
      1
    );
  }

  /**
   * Upload bulk CSV for data ingestion
   */
  async uploadBulkCsv(
    catalog: string,
    quotechar: string = '"',
    delimiter: string = ',',
    encoding: string = 'utf-8',
    priority: Priority = Priority.LOW
  ): Promise<Response> {
    const headers = this.getHeaders();
    headers['Content-Type'] = 'application/json';
    const body = JSON.stringify({ catalog, quotechar, delimiter, encoding });
    return this.traffic.scheduleRequest(
      `${this.baseUrl}/ws/listings/bulk`,
      {
        method: 'POST',
        headers: headers,
        body
      },
      priority,
      1
    );
  }

  /**
   * Get task status for async batch operations
   */
  async getTaskStatus(taskId: number | string, priority: Priority = Priority.NORMAL): Promise<Response> {
    return this.traffic.scheduleRequest(
      `${this.baseUrl}/ws/tasks/${taskId}`,
      {
        method: 'GET',
        headers: this.getHeaders()
      },
      priority,
      1
    );
  }

  /**
   * Update base price for a listing (Local DB only)
   */
  async updateBasePrice(listingId: string, price: number): Promise<void> {
    await this.pricingRepo.updateBasePrice(listingId, price);
  }

  /**
   * Get price history for a listing
   */
  async getPriceHistory(listingId: string): Promise<any[]> {
    return this.pricingRepo.getPriceHistory(listingId);
  }

  /**
   * Get suspend reasons
   */
  async getSuspendReasons(priority: Priority = Priority.NORMAL): Promise<Response> {
    return this.traffic.scheduleRequest(
      `${this.baseUrl}/ws/buyback/v1/orders/suspend-reasons`,
      {
        method: 'GET',
        headers: this.getHeaders()
      },
      priority,
      1
    );
  }

  /**
   * Get messages for a BuyBack order
   */
  async getBuyBackOrderMessages(orderId: string, params?: Record<string, any>, priority: Priority = Priority.NORMAL): Promise<Response> {
    const url = new URL(`${this.baseUrl}/ws/buyback/v1/orders/${orderId}/messages`);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, String(params[key])));
    }
    return this.traffic.scheduleRequest(
      url.toString(),
      {
        method: 'GET',
        headers: this.getHeaders()
      },
      priority,
      1
    );
  }

  /**
   * Post a message to a BuyBack order
   */
  async postBuyBackOrderMessage(orderId: string, message: any, priority: Priority = Priority.NORMAL): Promise<Response> {
    return this.traffic.scheduleRequest(
      `${this.baseUrl}/ws/buyback/v1/orders/${orderId}/messages`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(message)
      },
      priority,
      1
    );
  }

  /**
   * Suspend a BuyBack order
   */
  async suspendBuyBackOrder(orderId: string, reasons: any, priority: Priority = Priority.NORMAL): Promise<Response> {
    return this.traffic.scheduleRequest(
      `${this.baseUrl}/ws/buyback/v1/orders/${orderId}/suspend`,
      {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(reasons)
      },
      priority,
      1
    );
  }

  /**
   * Get all listings
   */
  async getListings(params?: Record<string, any>, priority: Priority = Priority.NORMAL): Promise<Response> {
    const url = new URL(`${this.baseUrl}/ws/listings`);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, String(params[key])));
    }
    return this.traffic.scheduleRequest(
      url.toString(),
      {
        method: 'GET',
        headers: this.getHeaders()
      },
      priority,
      1
    );
  }

  /**
   * Get a specific listing
   */
  async getListing(listingId: string, priority: Priority = Priority.NORMAL): Promise<Response> {
    return this.traffic.scheduleRequest(
      `${this.baseUrl}/ws/listings/${listingId}`,
      {
        method: 'GET',
        headers: this.getHeaders()
      },
      priority,
      1
    );
  }

  /**
   * Update listing (generalized)
   */
  async updateListing(listingId: string, data: any, priority: Priority = Priority.NORMAL): Promise<Response> {
    return this.traffic.scheduleRequest(
      `${this.baseUrl}/ws/listings/${listingId}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      },
      priority,
      1
    );
  }

  /**
   * Update listing price
   */
  async updatePrice(listingId: string, price: number, priority: Priority = Priority.NORMAL, countryCode?: string): Promise<Response> {
    const data: any = { price };
    if (countryCode) {
      data.country_code = countryCode;
    }
    
    // Update local database first to reflect changes immediately in UI
    try {
        await db.update(backmarket_listings)
            .set({ price: price.toString() })
            .where(eq(backmarket_listings.listing_id, listingId));
            
        // Also update country specific price if applicable
        if (countryCode) {
            // This table might not be fully populated yet, but good to try
            // await db.update(backmarket_listing_prices)... 
        }
    } catch (error) {
        console.error(`Failed to update local price for ${listingId}:`, error);
    }

    return this.updateListing(listingId, data, priority);
  }

  /**
   * Get competitor data
   */
  async getCompetitors(listingId: string, countryCode?: string): Promise<any> {
    // Check for test competitors first
    const testCompetitors = await db.select()
        .from(backmarket_test_competitors)
        .where(eq(backmarket_test_competitors.listing_id, listingId));

    if (testCompetitors.length > 0) {
        console.log(`Using ${testCompetitors.length} test competitors for listing ${listingId}`);
        return {
            competitors: testCompetitors.map(tc => ({
                seller_id: tc.competitor_name, // Use name as ID for test
                price: Number(tc.price),
                feedback_count: 1000 // Mock feedback
            }))
        };
    }

    let url = `${this.baseUrl}/ws/backbox/v1/competitors/${listingId}`;
    if (countryCode) {
        url += `?country=${countryCode}`; // Hypothetical param
    }
    const response = await this.traffic.scheduleRequest(
      url,
      {
        method: 'GET',
        headers: this.getHeaders()
      },
      Priority.HIGH,
      1
    );
    return response.json();
  }

  /**
   * Add a test competitor
   */
  async addTestCompetitor(listingId: string, name: string, price: number) {
    await db.insert(backmarket_test_competitors).values({
        listing_id: listingId,
        competitor_name: name,
        price: price.toString()
    });
    return { success: true };
  }

  /**
   * Remove all test competitors for a listing
   */
  async clearTestCompetitors(listingId: string) {
    await db.delete(backmarket_test_competitors)
        .where(eq(backmarket_test_competitors.listing_id, listingId));
    return { success: true };
  }

  /**
   * Reprice a listing using the full DPO pipeline (P1 -> P8)
   */
  async repriceListing(listingId: string): Promise<{ success: boolean; message: string }> {
    console.log(`Starting repricing for listing ${listingId}`);
    try {
      // 1. Get Listing Details (Internal)
      const listing = await this.pricingRepo.getListingDetails(listingId);
      if (!listing) {
        console.warn(`Listing ${listingId} not found locally. Skipping repricing.`);
        return { success: false, message: `Listing ${listingId} not found locally.` };
      }

      // 1.1 Get Active Countries
      const countries = await this.pricingRepo.getActiveCountries(listingId);
      if (countries.length === 0) {
        // Fallback to default if no specific countries found
        countries.push("fr-fr");
      }
      console.log(`Active countries for ${listingId}:`, countries);

      // Pre-check for parameters to fail fast if configuration is missing
      let hasConfiguredStrategy = false;
      
      // Check default strategy first
      const defaultParams = await this.pricingRepo.getParameters(listing.sku!, listing.grade!, 'fr-fr');
      if (defaultParams) {
          hasConfiguredStrategy = true;
      } else {
          // Check specific countries
          for (const countryCode of countries) {
              const params = await this.pricingRepo.getParameters(listing.sku!, listing.grade!, countryCode);
              if (params) {
                  hasConfiguredStrategy = true;
                  break;
              }
          }
      }

      if (!hasConfiguredStrategy) {
          const msg = `No pricing strategy configured for SKU ${listing.sku} (Grade ${listing.grade}). Please configure strategy first.`;
          console.warn(msg);
          return { success: false, message: msg };
      }

      // Fetch acquisition cost (placeholder for IMS integration)
      // This is constant across countries for the same SKU
      const acquisitionCost = await this.pricingRepo.getAverageAcquisitionCost(listing.sku!);
      const velocity = await this.pricingRepo.getSalesVelocity(listing.sku!);

      let updatedCount = 0;

      // Loop through each country
      for (const countryCode of countries) {
        console.log(`Processing country ${countryCode} for ${listingId}`);
        
        // 4. Get Cost Parameters & Calculate Floor (P4)
        // We fetch again here, but it's fast (DB)
        let params = await this.pricingRepo.getParameters(listing.sku!, listing.grade!, countryCode);
        
        // Fallback to fr-fr if specific country params are missing
        if (!params && countryCode !== 'fr-fr') {
             console.log(`No parameters for ${countryCode}, falling back to fr-fr`);
             params = await this.pricingRepo.getParameters(listing.sku!, listing.grade!, 'fr-fr');
        }
        
        if (!params) {
            console.warn(`No pricing parameters for SKU ${listing.sku} / Grade ${listing.grade} / Country ${countryCode}. Skipping.`);
            continue;
        }

        // 2. Get Competitors (External P2)
        const competitorData = await this.getCompetitors(listingId, countryCode);
        console.log(`Competitors found:`, competitorData.competitors?.length || 0);
        
        const competitors = (competitorData.competitors || []).map((c: any) => ({
            competitorId: c.seller_id,
            price: c.price,
            updatedAt: new Date(), 
            feedbackCount: c.feedback_count
        }));

        // 3. Filter Outliers (P3)
        const validCompetitors = this.ods.filterPrices(competitors);
        const validPrices = validCompetitors.map(c => c.price);
        console.log(`Valid prices after outlier detection:`, validPrices);

        console.log(`Pricing parameters found:`, params);

        // Calculate Max Price (Ceiling) - The most we can pay
        // Priority: Manual Max Price > Calculated Buyback Price > PFCS Fallback
        let maxPrice = params.max_price ? Number(params.max_price) : 0;
        
        if (!maxPrice) {
             maxPrice = (await this.pricingRepo.getBuybackPrice(listing.sku!, listing.grade!)) || 0;
        }

        if (!maxPrice) {
            // Fallback: Calculate using PFCS
            maxPrice = this.pfcs.calculateFloorPrice({
                acquisitionCost: acquisitionCost,
                refurbishmentCost: Number(params.c_refurb),
                operationalCost: Number(params.c_op),
                warrantyRiskCost: Number(params.c_risk)
            }, {
                backMarketFeeRate: Number(params.f_bm),
                targetMarginRate: Number(params.m_target)
            });
        }
        console.log(`Calculated max price (ceiling): ${maxPrice}`);

        // Calculate Min Price (Floor) - The least we want to offer
        // Priority: Manual Min Price > Listing Base Price > 0
        let minPrice = params.min_price ? Number(params.min_price) : 0;
        
        if (!minPrice) {
            minPrice = listing.base_price ? Number(listing.base_price) : 0;
        }
        console.log(`Calculated min price (floor): ${minPrice}`);

        // 5. Calculate Target (P5)
        // Use OVERCUT_HIGHEST strategy for Buyback (pay more than competitor)
        // Default step is 1.00 if not configured
        const stepAmount = params.price_step ? Number(params.price_step) : 1.00;
        
        const result = this.dpo.calculatePrice(validPrices, minPrice, { 
            type: 'OVERCUT_HIGHEST', 
            amount: stepAmount 
        }, maxPrice);
        console.log(`Calculated target price: ${result.targetPrice}`);

        // Calculate Priority based on Margin and Velocity
        // Margin calculation is tricky for Buyback. 
        // Let's assume higher priority if we are winning (targetPrice > competitors)
        let priority = Priority.NORMAL;
        if (velocity > 10) {
            priority = Priority.HIGH;
        }

        // 6. Update BM (P8)
        console.log(`Repricing ${listingId} [${countryCode}]: Target ${result.targetPrice} (Min: ${minPrice}, Max: ${maxPrice}) Priority: ${priority}`);
        
        await this.updatePrice(listingId, result.targetPrice, priority, countryCode);
        updatedCount++;

        // 7. Log History
        await this.pricingRepo.addPriceHistory({
            listing_id: listingId,
            price: result.targetPrice,
            currency: "EUR", // Default to EUR for now
            is_winner: result.targetPrice < Math.min(...validPrices),
            competitor_id: undefined // We don't track specific competitor ID yet
        });
      }

      // Update last_dip_at (Last Reprice Time)
      try {
          await db.update(backmarket_listings)
              .set({ last_dip_at: new Date() })
              .where(eq(backmarket_listings.listing_id, listingId));
      } catch (error) {
          console.error(`Failed to update last_dip_at for listing ${listingId}:`, error);
      }

      return { success: true, message: `Repricing completed for ${updatedCount} countries.` };

    } catch (error) {
      console.error(`Failed to reprice listing ${listingId}:`, error);
      return { success: false, message: `Repricing failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Run price probe (Dip-Peek-Peak)
   */
  async runPriceProbe(listingId: string, currentPrice: number): Promise<number> {
    // Dip: Set to 1 EUR
    // Reserve 2 tokens: 1 for Dip, 1 for Peak
    await this.traffic.scheduleRequest(
      `${this.baseUrl}/ws/listings/${listingId}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ price: 1.00 })
      },
      Priority.NORMAL,
      2 
    );

    // Update last_dip_at in database
    try {
        await db.update(backmarket_listings)
            .set({ last_dip_at: new Date() })
            .where(eq(backmarket_listings.listing_id, listingId));
    } catch (error) {
        console.error(`Failed to update last_dip_at for listing ${listingId}:`, error);
    }
    
    // Wait for competitors to react
    await Bun.sleep(3000);
    
    // Peek: Get competitor data
    let competitorData;
    try {
        competitorData = await this.getCompetitors(listingId);
    } catch (e) {
        console.error("Failed to peek competitors, recovering blindly");
        competitorData = null;
    }
    
    // Peak: Reprice to optimal
    await this.repriceListing(listingId);

    // Fetch the new price from DB to return it
    const updatedListing = await this.pricingRepo.getListingDetails(listingId);
    return updatedListing?.price ? Number(updatedListing.price) : currentPrice;
  }

  /**
   * Emergency price recovery
   */
  async emergencyRecovery(listingId: string, targetPrice: number): Promise<void> {
    await this.updatePrice(listingId, targetPrice, Priority.CRITICAL);
  }

  public updateTrafficConfig(config: any) {
    this.traffic.updateConfig(config);
  }
}

export const backMarketService = new BackMarketService();
