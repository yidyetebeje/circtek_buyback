import { TrafficController, Priority } from '../../lib/bm-traffic-control';
import { loadRateLimitConfig } from '../../lib/bm-traffic-control/config';
import { logRateLimitRequest } from './rateLimitLogger';

const config = loadRateLimitConfig();
// const traffic = new TrafficController(config, logRateLimitRequest); // Moved to class

export class BackMarketService {
  private baseUrl = process.env.BACKMARKET_API_URL || 'https://www.backmarket.fr';
  private apiToken = process.env.BACKMARKET_API_TOKEN;
  private traffic: TrafficController;

  constructor(traffic?: TrafficController) {
    this.traffic = traffic || new TrafficController(config, logRateLimitRequest);
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
  async updatePrice(listingId: string, price: number, priority: Priority = Priority.NORMAL): Promise<Response> {
    return this.updateListing(listingId, { price }, priority);
  }

  /**
   * Get competitor data
   */
  async getCompetitors(listingId: string): Promise<any> {
    const response = await this.traffic.scheduleRequest(
      `${this.baseUrl}/ws/backbox/v1/competitors/${listingId}`,
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
}
