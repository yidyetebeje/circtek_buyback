import { Elysia } from 'elysia';
import { BackMarketService } from '../services/backMarketService';
import { BackMarketSyncService } from '../services/backMarketSyncService';

const backMarketService = new BackMarketService();
const backMarketSyncService = new BackMarketSyncService(backMarketService);

export const backMarketController = new Elysia({ prefix: '/backmarket' })
  .post('/probe/:listingId', async ({ params, body }) => {
    const { listingId } = params;
    const { currentPrice } = body as { currentPrice: number };
    
    const newPrice = await backMarketService.runPriceProbe(listingId, currentPrice);
    
    return {
      success: true,
      listingId,
      newPrice
    };
  })
  .post('/recover/:listingId', async ({ params, body }) => {
    const { listingId } = params;
    const { targetPrice } = body as { targetPrice: number };
    
    await backMarketService.emergencyRecovery(listingId, targetPrice);
    
    return {
      success: true,
      listingId,
      message: 'Price recovered'
    };
  })
  .post('/sync/orders', async () => {
    const result = await backMarketSyncService.syncOrders();
    return { success: true, ...result };
  })
  .post('/sync/listings', async () => {
    const result = await backMarketSyncService.syncListings();
    return { success: true, ...result };
  })
  .get('/orders', async ({ query }) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const orders = await backMarketSyncService.getOrders(page, limit);
    // Convert BigInt to string for JSON serialization
    const serializedOrders = orders.map(order => ({
      ...order,
      order_id: order.order_id.toString()
    }));
    return { success: true, results: serializedOrders, page, limit };
  })
  .get('/listings', async ({ query }) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const listings = await backMarketSyncService.getListings(page, limit);
    return { success: true, results: listings, page, limit };
  });
