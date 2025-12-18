import { config } from 'dotenv';
import { BackMarketService } from '../src/buyback/services/backMarketService';
import { pool } from '../src/db';

// Load environment variables
config();

async function main() {
  console.log('🚀 Starting Back Market Integration Demo...\n');

  if (!process.env.BACKMARKET_API_TOKEN) {
    console.error('❌ Error: BACKMARKET_API_TOKEN is missing in .env');
    process.exit(1);
  }

  const service = new BackMarketService();

  try {
    // 1. Fetch BuyBack Orders
    console.log('📦 Fetching recent BuyBack orders...');
    const ordersResponse = await service.getBuyBackOrders({ limit: 5 });
    
    if (ordersResponse.ok) {
      const orders = await ordersResponse.json();
      console.log(`   ✅ Found ${orders.results.length} orders.`);
      if (orders.results.length > 0) {
        console.log('   Latest Order ID:', orders.results[0].order_id);
        console.log('   Status:', orders.results[0].status);
      }
    } else {
      console.error('   ❌ Failed to fetch orders:', ordersResponse.status);
    }

    console.log('\n-----------------------------------\n');

    // 2. Fetch Listings
    console.log('wm Fetching Listings...');
    const listingsResponse = await service.getListings({ limit: 5 });

    if (listingsResponse.ok) {
      const listings = await listingsResponse.json();
      console.log(`   ✅ Found ${listings.results.length} listings.`);
      if (listings.results.length > 0) {
        const item = listings.results[0];
        console.log(`   Example: ${item.title} (SKU: ${item.sku})`);
        console.log(`   Price: ${item.price} ${item.currency}`);
        console.log(`   Quantity: ${item.quantity}`);
      }
    } else {
      console.error('   ❌ Failed to fetch listings:', listingsResponse.status);
    }

  } catch (error) {
    console.error('❌ An unexpected error occurred:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
