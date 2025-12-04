import { Elysia } from 'elysia';
import { backMarketService } from '../services/backMarketService';
import { BackMarketSyncService } from '../services/backMarketSyncService';
import { schedulerService } from '../services/SchedulerService';
import { PricingRepository } from '../pricing/PricingRepository';
import { requireRole } from '../../auth';
import { 
  ProbeSchema, 
  RecoverSchema, 
  SyncOrdersSchema, 
  PaginationSchema, 
  OrderParamsSchema, 
  UpdateListingSchema,
  RepriceSchema,
  ParametersSchema,
  WebhookSchema
} from '../types/backmarket';

const backMarketSyncService = new BackMarketSyncService(backMarketService);
const pricingRepo = new PricingRepository();

export const backMarketController = new Elysia({ prefix: '/backmarket' })
  .use(requireRole(['super_admin', 'admin']))
  
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

  .post('/reprice/:listingId', async ({ params }) => {
    const { listingId } = params;
    // Trigger repricing asynchronously
    backMarketService.repriceListing(listingId).catch(console.error);
    return { success: true, message: `Repricing triggered for ${listingId}` };
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
    await pricingRepo.upsertParameters(body);
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

  .post('/webhook', async ({ body }) => {
    // TODO: Verify signature if applicable
    const { type, payload } = body as any;
    
    if (type && payload) {
        await backMarketSyncService.handleWebhook(type, payload);
    } else {
        console.warn('Received webhook with missing type or payload', body);
    }
    
    return { success: true };
  }, {
    body: WebhookSchema.body,
    detail: {
      tags: ['Back Market'],
      summary: 'Webhook Endpoint',
      description: 'Endpoint to receive real-time updates from Back Market.'
    }
  });


