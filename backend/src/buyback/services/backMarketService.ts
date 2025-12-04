import { TrafficController, Priority } from '../../lib/bm-traffic-control';
import { loadRateLimitConfig, DEFAULT_BACKMARKET_LIMITS } from '../../lib/bm-traffic-control/config';
import { logRateLimitRequest } from './rateLimitLogger';
import { PricingRepository } from '../pricing/PricingRepository';
import { OutlierDetectionService } from '../pricing/OutlierDetectionService';
import { ProfitabilityConstraintService } from '../pricing/ProfitabilityConstraintService';
import { DynamicPricingEngine } from '../pricing/DynamicPricingEngine';

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
      // Assuming BM API accepts country specific updates via some field or separate endpoint
      // For now, we'll just log it or append to data if we knew the field.
      // If it's a separate endpoint per country, we'd change the URL.
      // Let's assume we pass it in the body for now as 'country_code' or similar if supported,
      // OR we might need to use a different listing ID if listing IDs are country specific.
      // But based on our architecture, we are iterating over countries for a single listing ID.
      // This implies the update endpoint might need a query param or body field.
      // Let's assume body field for now.
      data.country_code = countryCode;
    }
    return this.updateListing(listingId, data, priority);
  }

  /**
   * Get competitor data
   */
  async getCompetitors(listingId: string, countryCode?: string): Promise<any> {
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
   * Reprice a listing using the full DPO pipeline (P1 -> P8)
   */
  async repriceListing(listingId: string): Promise<void> {
    try {
      // 1. Get Listing Details (Internal)
      const listing = await this.pricingRepo.getListingDetails(listingId);
      if (!listing) {
        console.warn(`Listing ${listingId} not found locally. Skipping repricing.`);
        return;
      }

      // 1.1 Get Active Countries
      const countries = await this.pricingRepo.getActiveCountries(listingId);
      if (countries.length === 0) {
        // Fallback to default if no specific countries found
        countries.push("fr-fr");
      }

      // Fetch acquisition cost (placeholder for IMS integration)
      // This is constant across countries for the same SKU
      const acquisitionCost = await this.pricingRepo.getAverageAcquisitionCost(listing.sku!);
      const velocity = await this.pricingRepo.getSalesVelocity(listing.sku!);

      // Loop through each country
      for (const countryCode of countries) {
        // 2. Get Competitors (External P2)
        const competitorData = await this.getCompetitors(listingId, countryCode);
        const competitors = (competitorData.competitors || []).map((c: any) => ({
            competitorId: c.seller_id,
            price: c.price,
            updatedAt: new Date(), 
            feedbackCount: c.feedback_count
        }));

        // 3. Filter Outliers (P3)
        const validCompetitors = this.ods.filterPrices(competitors);
        const validPrices = validCompetitors.map(c => c.price);

        // 4. Get Cost Parameters & Calculate Floor (P4)
        const params = await this.pricingRepo.getParameters(listing.sku!, listing.grade!, countryCode);
        
        if (!params) {
            console.warn(`No pricing parameters for SKU ${listing.sku} / Grade ${listing.grade} / Country ${countryCode}. Skipping.`);
            continue;
        }

        const floorPrice = this.pfcs.calculateFloorPrice({
            acquisitionCost: acquisitionCost,
            refurbishmentCost: Number(params.c_refurb),
            operationalCost: Number(params.c_op),
            warrantyRiskCost: Number(params.c_risk)
        }, {
            backMarketFeeRate: Number(params.f_bm),
            targetMarginRate: Number(params.m_target)
        });

        // 5. Calculate Target (P5)
        const result = this.dpo.calculatePrice(validPrices, floorPrice);

        // Calculate Priority based on Margin and Velocity
        const margin = result.targetPrice > 0 ? (result.targetPrice - floorPrice) / result.targetPrice : 0;
        
        let priority = Priority.NORMAL;
        if (margin > 0.2 && velocity > 10) {
            priority = Priority.HIGH;
        } else if (margin < 0.05 || velocity === 0) {
            priority = Priority.LOW;
        }

        // 6. Update BM (P8)
        console.log(`Repricing ${listingId} [${countryCode}]: Target ${result.targetPrice} (Floor: ${floorPrice}) Priority: ${priority}`);
        
        await this.updatePrice(listingId, result.targetPrice, priority, countryCode);
      }

    } catch (error) {
      console.error(`Failed to reprice listing ${listingId}:`, error);
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
    
    // Peak: Calculate and set new price
    const newPrice = this.calculateOptimalPrice(competitorData, currentPrice);
    
    // Cost 0 because we reserved it in the Dip
    await this.traffic.scheduleRequest(
      `${this.baseUrl}/ws/listings/${listingId}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ price: newPrice })
      },
      Priority.HIGH,
      0
    );
    
    return newPrice;
  }

  /**
   * Emergency price recovery
   */
  async emergencyRecovery(listingId: string, targetPrice: number): Promise<void> {
    await this.updatePrice(listingId, targetPrice, Priority.CRITICAL);
  }

  private calculateOptimalPrice(competitorData: any, fallbackPrice: number): number {
    // Your pricing algorithm here
    if (!competitorData?.competitors?.length) {
      return fallbackPrice;
    }
    
    const lowestCompetitor = Math.min(
      ...competitorData.competitors.map((c: any) => c.price)
    );
    
    // Set 1% below lowest competitor, but not below 50% of original
    return Math.max(lowestCompetitor * 0.99, fallbackPrice * 0.5);
  }

  public updateTrafficConfig(config: any) {
    this.traffic.updateConfig(config);
  }
}

export const backMarketService = new BackMarketService();
