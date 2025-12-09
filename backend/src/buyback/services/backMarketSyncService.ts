import { BackMarketService } from './backMarketService';
import { pool } from '../../db';
import { drizzle } from 'drizzle-orm/mysql2';
import { backmarket_orders, backmarket_listings } from '../../db/backmarket.schema';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

const db = drizzle(pool);

export class BackMarketSyncService {
  private apiService: BackMarketService;

  constructor(apiService?: BackMarketService) {
    this.apiService = apiService || new BackMarketService();
  }

  /**
   * Sync all orders from Back Market to the database
   */
  async syncOrders(fullSync: boolean = false) {
    console.log('Starting order sync...');
    let page = 1;
    let hasMore = true;
    let totalSynced = 0;

    while (hasMore) {
      console.log(`Fetching orders page ${page}...`);
      const response = await this.apiService.getBuyBackOrders({ page, limit: 50 });
      
      if (response.status !== 200) {
        console.error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
        break;
      }

      const data = await response.json();
      const orders = data.results;

      if (!orders || orders.length === 0) {
        hasMore = false;
        break;
      }

      for (const order of orders) {
        await this.upsertOrder(order);
        totalSynced++;
      }

      // If not full sync, stop after first page or if we hit existing orders?
      // For now, let's just sync everything if fullSync is true, or just first 5 pages if false?
      // Or check modification date.
      if (!fullSync && page >= 5) {
        hasMore = false;
      } else if (data.next) {
        page++;
      } else {
        hasMore = false;
      }
    }
    console.log(`Order sync completed. Total synced: ${totalSynced}`);
    return { totalSynced };
  }

  /**
   * Sync all listings from Back Market to the database
   */
  async syncListings() {
    console.log('Starting listing sync...');
    let page = 1;
    let hasMore = true;
    let totalSynced = 0;

    while (hasMore) {
      console.log(`Fetching listings page ${page}...`);
      const response = await this.apiService.getListings({ page, limit: 50 });

      if (response.status !== 200) {
        console.error(`Failed to fetch listings: ${response.status} ${response.statusText}`);
        break;
      }

      const data = await response.json();
      const listings = data.results;

      if (!listings || listings.length === 0) {
        hasMore = false;
        break;
      }

      for (const listing of listings) {
        await this.upsertListing(listing);
        totalSynced++;
      }

      if (data.next) {
        page++;
      } else {
        hasMore = false;
      }
    }
    console.log(`Listing sync completed. Total synced: ${totalSynced}`);
    return { totalSynced };
  }

  private async upsertOrder(order: any) {
    const orderData = {
      order_id: Number(order.order_id),
      creation_date: new Date(order.creation_date),
      modification_date: new Date(order.modification_date),
      status: order.status,
      currency: order.currency,
      shipping_first_name: order.shipping_address?.first_name,
      shipping_last_name: order.shipping_address?.last_name,
      shipping_address1: order.shipping_address?.address1,
      shipping_address2: order.shipping_address?.address2,
      shipping_zipcode: order.shipping_address?.zipcode,
      shipping_city: order.shipping_address?.city,
      shipping_country: order.shipping_address?.country,
      tracking_number: order.tracking_number,
      tracking_url: order.tracking_url,
      lines: order.lines,
      synced_at: new Date()
    };

    await db.insert(backmarket_orders)
      .values(orderData)
      .onDuplicateKeyUpdate({ set: orderData });
  }

  private async upsertListing(listing: any) {
    const listingData = {
      listing_id: listing.listing_id,
      product_id: listing.product_id,
      sku: listing.sku,
      title: listing.title,
      price: listing.price ? listing.price.toString() : null,
      currency: listing.currency,
      quantity: listing.quantity,
      state: listing.state,
      grade: listing.grade,
      publication_state: listing.publication_state,
      synced_at: new Date()
    };

    await db.insert(backmarket_listings)
      .values(listingData)
      .onDuplicateKeyUpdate({ set: listingData });
  }

  async getOrders(page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    return await db.select().from(backmarket_orders).limit(limit).offset(offset);
  }

  async getListings(page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    return await db.select().from(backmarket_listings).limit(limit).offset(offset);
  }

  verifySignature(payload: string, signature: string): boolean {
    const secret = process.env.BACKMARKET_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('BACKMARKET_WEBHOOK_SECRET not set. Skipping signature verification.');
      return true;
    }
    
    // Back Market uses HMAC-SHA256
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');
    return signature === digest;
  }

  /**
   * Handle incoming webhooks from Back Market
   */
  async handleWebhook(type: string, payload: any) {
    console.log(`[Webhook] Received event: ${type}`);
    
    try {
      switch (type) {
        case 'order.created':
        case 'order.updated':
          // Payload might contain the order ID or the full order
          // To be safe, we fetch the latest version from API if ID is present
          const orderId = payload.order_id || payload.id;
          if (orderId) {
            console.log(`[Webhook] Syncing order ${orderId}`);
            // Use Priority.HIGH (1) for webhook updates
            const response = await this.apiService.getBuyBackOrder(orderId, 1); 
            if (response.ok) {
              const order = await response.json();
              await this.upsertOrder(order);
              console.log(`[Webhook] Order ${orderId} synced successfully`);
            } else {
              console.error(`[Webhook] Failed to fetch order ${orderId}: ${response.status}`);
            }
          } else {
            console.warn('[Webhook] No order ID found in payload');
          }
          break;

        case 'listing.updated':
          const listingId = payload.listing_id || payload.id;
          if (listingId) {
             console.log(`[Webhook] Syncing listing ${listingId}`);
             const response = await this.apiService.getListing(listingId, 1);
             if (response.ok) {
                const listing = await response.json();
                await this.upsertListing(listing);
                console.log(`[Webhook] Listing ${listingId} synced successfully`);
             }
          }
          break;

        default:
          console.log(`[Webhook] Unhandled event type: ${type}`);
      }
    } catch (error) {
      console.error('[Webhook] Error processing webhook:', error);
      throw error;
    }
  }
}
