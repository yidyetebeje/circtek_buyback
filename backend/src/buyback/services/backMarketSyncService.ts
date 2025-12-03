import { BackMarketService } from './backMarketService';
import { pool } from '../../db';
import { drizzle } from 'drizzle-orm/mysql2';
import { backmarket_orders, backmarket_listings } from '../../db/backmarket.schema';
import { sql } from 'drizzle-orm';

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

      if (data.next) {
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
}
