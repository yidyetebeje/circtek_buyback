import { Elysia } from 'elysia';
import { backMarketService } from '../services/backMarketService';
import { BackMarketSyncService } from '../services/backMarketSyncService';
import { BuybackPricingService } from '../services/BuybackPricingService';
import { schedulerService } from '../services/SchedulerService';
import { PricingRepository } from '../pricing/PricingRepository';
import { requireRole } from '../../auth';
import { 
  ProbeSchema, 
  RecoverSchema, 
  SyncOrdersSchema, 
  PaginationSchema, 
  OrderParamsSchema, 
  ListingParamsSchema,
  CreateListingSchema,
  UpdateBasePriceSchema,
  UpdateListingSchema,
  RepriceSchema,
  ParametersSchema,
  WebhookSchema
} from '../types/backmarket';

const backMarketSyncService = new BackMarketSyncService(backMarketService);
const pricingRepo = new PricingRepository();
const buybackPricingService = new BuybackPricingService();
// Exported handler so it can be unit-tested directly (bypasses requireRole middleware)
export const getTaskHandler = async ({ params, set }: { params: any; set?: any }) => {
  const { taskId } = params;
  const response = await backMarketService.getTaskStatus(Number(taskId));
  if (response.status !== 200) {
    if (set) set.status = response.status;
    return { success: false, status: response.status, message: response.statusText };
  }
  const data = await response.json();
  return { success: true, data };
};

export const backMarketController = new Elysia({ prefix: '/backmarket' })
  .use(requireRole(['super_admin', 'admin']))
  
  .get('/rate-limits', () => {
    return backMarketService.getRateLimitStatus();
  }, {
    detail: {
      tags: ['Back Market'],
      summary: 'Get Rate Limit Status',
      description: 'Returns the current status of the rate limit buckets.'
    }
  })

  .get('/rate-limits/defaults', () => {
    return backMarketService.getDefaultRateLimits();
  }, {
    detail: {
      tags: ['Back Market'],
      summary: 'Get Default Rate Limits',
      description: 'Returns the default hard limits for the Back Market API.'
    }
  })

  .put('/rate-limits', async ({ body }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await backMarketService.updateRateLimitConfig(body as any);
    return { success: true };
  }, {
    detail: {
      tags: ['Back Market'],
      summary: 'Update Rate Limits',
      description: 'Updates the rate limit configuration.'
    }
  })

  .post('/listings', async ({ body }) => {
    const response = await backMarketService.createListing(body);
    const data = await response.json();
    return { success: true, data };
  }, {
    body: CreateListingSchema.body,
    detail: {
      tags: ['Back Market'],
      summary: 'Create Listing',
      description: 'Creates a new listing on Back Market.'
    }
  })

  .post('/listings/bulk', async ({ body }) => {
    const { csv } = body as { csv: string };
    const response = await backMarketService.uploadBulkCsv(csv);
    const data = await response.json();
    return { success: true, data };
  }, {
    detail: {
      tags: ['Back Market'],
      summary: 'Bulk Upload Listings',
      description: 'Uploads a CSV file for bulk listing updates.'
    }
  })

  .get('/tasks/:taskId', async ({ params, set }) => {
    return getTaskHandler({ params, set });
  }, {
    params: {
      taskId: { type: 'number', description: 'Batch task id' }
    },
    detail: {
      tags: ['Back Market'],
      summary: 'Get Batch Task Status',
      description: 'Returns the status and result for an asynchronous batch ingestion task.'
    }
  })

  .patch('/listings/:listingId/base-price', async ({ params, body }) => {
    const { listingId } = params;
    const { price } = body;
    await backMarketService.updateBasePrice(listingId, price);
    return { success: true, listingId, price };
  }, {
    params: UpdateBasePriceSchema.params,
    body: UpdateBasePriceSchema.body,
    detail: {
      tags: ['Back Market'],
      summary: 'Update Base Price',
      description: 'Updates the base price for a listing in the local database.'
    }
  })

  .get('/listings/:listingId/history', async ({ params }) => {
    const { listingId } = params;
    const history = await backMarketService.getPriceHistory(listingId);
    return { success: true, data: history };
  }, {
    params: ListingParamsSchema.params,
    detail: {
      tags: ['Back Market'],
      summary: 'Get Price History',
      description: 'Retrieves price history for a listing.'
    }
  })

  .post('/probe/:listingId', async ({ params, body }) => {
    const { listingId } = params;
    const { currentPrice } = body;
    
    const newPrice = await backMarketService.runPriceProbe(listingId, currentPrice);
    
    return {
      success: true,
      listingId,
      newPrice
    };
  }, {
    params: ProbeSchema.params,
    body: ProbeSchema.body,
    detail: {
      tags: ['Back Market'],
      summary: 'Run Price Probe',
      description: 'Initiates a "Dip-Peek-Peak" price probe strategy to determine the optimal price for a listing against competitors.'
    }
  })

  .post('/recover/:listingId', async ({ params, body }) => {
    const { listingId } = params;
    const { targetPrice } = body;
    
    await backMarketService.emergencyRecovery(listingId, targetPrice);
    
    return {
      success: true,
      listingId,
      message: 'Price recovered'
    };
  }, {
    params: RecoverSchema.params,
    body: RecoverSchema.body,
    detail: {
      tags: ['Back Market'],
      summary: 'Emergency Price Recovery',
      description: 'Immediately updates a listing price to a target value with high priority, bypassing normal rate limits if necessary.'
    }
  })

  .post('/sync/orders', async ({ body }) => {
    const fullSync = body?.fullSync ?? false;
    const result = await backMarketSyncService.syncOrders(fullSync);
    return { success: true, ...result };
  }, {
    body: SyncOrdersSchema.body,
    detail: {
      tags: ['Back Market'],
      summary: 'Sync Orders',
      description: 'Triggers synchronization of orders from Back Market to the local database.'
    }
  })

  .post('/sync/buyback-prices', async () => {
    await buybackPricingService.calculateAndSyncPrices();
    return { success: true, message: 'Buyback prices sync completed' };
  }, {
    detail: {
      tags: ['Back Market'],
      summary: 'Sync Buyback Prices',
      description: 'Triggers the calculation and synchronization of buyback prices based on Back Market listings.'
    }
  })

  .get('/buyback-prices', async () => {
    const prices = await buybackPricingService.getPrices();
    return { success: true, data: prices };
  }, {
    detail: {
      tags: ['Back Market'],
      summary: 'Get Buyback Prices',
      description: 'Returns the calculated buyback prices for all SKUs.'
    }
  })

  .post('/sync/listings', async () => {
    const result = await backMarketSyncService.syncListings();
    return { success: true, ...result };
  }, {
    detail: {
      tags: ['Back Market'],
      summary: 'Sync Listings',
      description: 'Triggers synchronization of listings from Back Market to the local database.'
    }
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
  }, {
    query: PaginationSchema.query,
    detail: {
      tags: ['Back Market'],
      summary: 'List Local Orders',
      description: 'Retrieves a paginated list of Back Market orders stored in the local database.'
    }
  })

  .get('/listings', async ({ query }) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const listings = await backMarketSyncService.getListings(page, limit);
    return { success: true, results: listings, page, limit };
  }, {
    query: PaginationSchema.query,
    detail: {
      tags: ['Back Market'],
      summary: 'List Local Listings',
      description: 'Retrieves a paginated list of Back Market listings stored in the local database.'
    }
  })

  .get('/orders/:orderId/live', async ({ params, set }) => {
    const { orderId } = params;
    const response = await backMarketService.getBuyBackOrder(orderId);
    
    if (response.status !== 200) {
      set.status = response.status;
      return { success: false, status: response.status, message: response.statusText };
    }
    
    const data = await response.json();
    return { success: true, data };
  }, {
    params: OrderParamsSchema.params,
    detail: {
      tags: ['Back Market'],
      summary: 'Get Live Order',
      description: 'Fetches the most up-to-date details of a specific order directly from the Back Market API.'
    }
  })

  .post('/listings/:listingId', async ({ params, body, set }) => {
    const { listingId } = params;
    const updateData = body;
    
    const response = await backMarketService.updateListing(listingId, updateData);
    
    if (response.status !== 200) {
      set.status = response.status;
      return { success: false, status: response.status, message: response.statusText };
    }
    
    const data = await response.json();
    return { success: true, data };
  }, {
    params: UpdateListingSchema.params,
    body: UpdateListingSchema.body,
    detail: {
      tags: ['Back Market'],
      summary: 'Update Listing',
      description: 'Updates a listing on Back Market (e.g., price, quantity) directly via the API.'
    }
  })

  .post('/reprice/:listingId', async ({ params, set }) => {
    const { listingId } = params;
    // Trigger repricing synchronously to give feedback
    const result = await backMarketService.repriceListing(listingId);
    
    if (!result.success) {
        set.status = 400;
        return { success: false, message: result.message };
    }
    
    return { success: true, message: result.message };
  }, {
    params: RepriceSchema.params,
    detail: {
      tags: ['Back Market'],
      summary: 'Trigger Repricing',
      description: 'Manually triggers the repricing logic for a specific listing.'
    }
  })

  .get('/parameters/:sku', async ({ params, query }) => {
    const { sku } = params;
    const { grade, country } = query;
    const paramsData = await pricingRepo.getParameters(sku, Number(grade), country);
    return { success: true, data: paramsData };
  }, {
    params: ParametersSchema.params,
    query: ParametersSchema.query,
    detail: {
      tags: ['Back Market'],
      summary: 'Get Pricing Parameters',
      description: 'Retrieves the pricing parameters (PFCS inputs) for a specific SKU, grade, and country.'
    }
  })

  .post('/parameters', async ({ body }) => {
    const { triggerReprice, ...params } = body;
    await pricingRepo.upsertParameters(params);

    if (triggerReprice) {
        const listings = await pricingRepo.getListingsBySkuAndGrade(params.sku, params.grade);
        console.log(`Triggering repricing for ${listings.length} listings due to parameter update.`);
        for (const listingId of listings) {
            backMarketService.repriceListing(listingId).catch(console.error);
        }
        return { success: true, message: 'Parameters updated and repricing triggered' };
    }

    return { success: true, message: 'Parameters updated' };
  }, {
    body: ParametersSchema.body,
    detail: {
      tags: ['Back Market'],
      summary: 'Update Pricing Parameters',
      description: 'Updates or creates pricing parameters for a SKU.'
    }
  })

  .get('/scheduler/status', () => {
    return { success: true, status: schedulerService.getStatus() };
  }, {
    detail: {
      tags: ['Back Market'],
      summary: 'Scheduler Status',
      description: 'Returns the current status of the Back Market scheduler tasks.'
    }
  })

  .post('/scheduler/trigger/:name', async ({ params, set }) => {
    try {
      const name = decodeURIComponent(params.name);
      if (name === 'all') {
          const results = await schedulerService.triggerAllTasks();
          return { success: true, message: 'All tasks triggered', results };
      }
      await schedulerService.triggerTask(name);
      return { success: true, message: `Task ${name} triggered` };
    } catch (error: any) {
      set.status = 400;
      return { success: false, message: error.message };
    }
  }, {
    detail: {
      tags: ['Back Market'],
      summary: 'Trigger Scheduler Task',
      description: 'Manually triggers a scheduler task. Use "all" to trigger all tasks.'
    }
  })

  .post('/webhook', async ({ request, headers, set }) => {
    const signature = headers['x-backmarket-signature'];
    const rawBody = await request.text();

    if (!backMarketSyncService.verifySignature(rawBody, signature || '')) {
        set.status = 401;
        return { success: false, message: 'Invalid signature' };
    }

    let body;
    try {
        body = JSON.parse(rawBody);
    } catch (e) {
        set.status = 400;
        return { success: false, message: 'Invalid JSON' };
    }

    const { type, payload } = body;
    
    if (type && payload) {
        await backMarketSyncService.handleWebhook(type, payload);
    } else {
        console.warn('Received webhook with missing type or payload', body);
    }
    
    return { success: true };
  }, {
    detail: {
      tags: ['Back Market'],
      summary: 'Webhook Endpoint',
      description: 'Endpoint to receive real-time updates from Back Market.'
    }
  })

  .get('/tasks/:taskId', async ({ params, set }) => {
    const { taskId } = params;
    const response = await backMarketService.getTaskStatus(Number(taskId));
    if (response.status !== 200) {
      set.status = response.status;
      return { success: false, status: response.status, message: response.statusText };
    }
    const data = await response.json();
    return { success: true, data };
  }, {
    params: {
      type: 'object',
      properties: {
        taskId: { type: 'string' }
      },
      required: ['taskId']
    },
    detail: {
      tags: ['Back Market'],
      summary: 'Get Task Status',
      description: 'Returns the status of an asynchronous batch task (returned by create/listings).'
    }
  })
  
  .post('/test/competitors', async ({ body }) => {
    const { listingId, name, price } = body as { listingId: string; name: string; price: number };
    await backMarketService.addTestCompetitor(listingId, name, price);
    return { success: true };
  }, {
    detail: {
      tags: ['Back Market'],
      summary: 'Add Test Competitor',
      description: 'Adds a simulated competitor for testing pricing logic.'
    }
  })

  .delete('/test/competitors/:listingId', async ({ params }) => {
    const { listingId } = params;
    await backMarketService.clearTestCompetitors(listingId);
    return { success: true };
  }, {
    detail: {
      tags: ['Back Market'],
      summary: 'Clear Test Competitors',
      description: 'Removes all simulated competitors for a listing.'
    }
  });


