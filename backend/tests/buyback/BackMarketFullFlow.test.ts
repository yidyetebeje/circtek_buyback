import { describe, it, expect, mock, spyOn, beforeEach, afterEach } from 'bun:test';

// --- MOCKS SETUP ---
const mockDb = {
  select: mock(() => mockDb),
  from: mock(() => mockDb),
  where: mock(() => mockDb),
  limit: mock(() => Promise.resolve([])),
  insert: mock(() => { console.log('MOCK INSERT CALLED'); return mockDb; }),
  values: mock(() => mockDb),
  onDuplicateKeyUpdate: mock(() => Promise.resolve({ insertId: 1 })),
  update: mock(() => mockDb),
  set: mock(() => mockDb),
  delete: mock(() => mockDb),
  query: mock(() => Promise.resolve([])),
  $client: {}
};

// Ensure chainability
mockDb.select.mockReturnValue(mockDb);
mockDb.from.mockReturnValue(mockDb);
mockDb.where.mockReturnValue(mockDb);
mockDb.insert.mockReturnValue(mockDb);
mockDb.values.mockReturnValue(mockDb);
mockDb.update.mockReturnValue(mockDb);
mockDb.set.mockReturnValue(mockDb);
mockDb.delete.mockReturnValue(mockDb);

// Mock the database module
mock.module('../../src/db', () => ({
  db: mockDb,
  pool: {},
}));

// Mock drizzle-orm/mysql2 to return our mockDb
mock.module('drizzle-orm/mysql2', () => ({
  drizzle: () => { console.log('MOCK DRIZZLE CALLED'); return mockDb; },
}));

// --- IMPORTS ---
// Remove static imports of services to allow mocking to take effect
// import { BackMarketService } from '../../src/buyback/services/backMarketService';
// import { BackMarketSyncService } from '../../src/buyback/services/backMarketSyncService';
import { TrafficController } from '../../src/lib/bm-traffic-control';
import { 
  backmarket_listings, 
  backmarket_pricing_parameters, 
  backmarket_orders,
  backmarket_price_history 
} from '../../src/db/backmarket.schema';
import { eq } from 'drizzle-orm';

describe('Back Market Full Feature Integration Test', () => {
  let BackMarketService: any;
  let BackMarketSyncService: any;
  let service: any;
  let syncService: any;
  let mockTraffic: any;
  let mockPricingRepo: any;
  let mockOds: any;
  let mockPfcs: any;
  let mockDpo: any;
  
  const TEST_SKU = 'TEST-IPHONE-12';
  const TEST_LISTING_ID = '123456';
  const TEST_ORDER_ID = 'ORDER-999';

  beforeEach(async () => {
    // Reset mocks
    mockDb.select.mockClear();
    mockDb.insert.mockClear();
    mockDb.update.mockClear();

    // Dynamically import services after mocks are set up
    const bmServiceModule = await import('../../src/buyback/services/backMarketService');
    BackMarketService = bmServiceModule.BackMarketService;
    
    const bmSyncServiceModule = await import('../../src/buyback/services/backMarketSyncService');
    BackMarketSyncService = bmSyncServiceModule.BackMarketSyncService;

    // 1. Mock Traffic Controller
    mockTraffic = {
      scheduleRequest: mock((url: string, options: any) => {
        // Mock Listings Response
        if (url.includes('/ws/listings') && options.method === 'GET') {
          return Promise.resolve(new Response(JSON.stringify({
            results: [{
              listing_id: TEST_LISTING_ID,
              sku: TEST_SKU,
              price: '200.00',
              currency: 'EUR',
              quantity: 10,
              state: 1, // Active
              grade: 12 // Good
            }]
          })));
        }
        
        // Mock Orders Response
        if (url.includes('/ws/buyback/v1/orders') && options.method === 'GET') {
           return Promise.resolve(new Response(JSON.stringify({
            results: [{
              order_id: TEST_ORDER_ID,
              creation_date: new Date().toISOString(),
              modification_date: new Date().toISOString(),
              status: 0,
              currency: 'EUR',
              price: 150.00,
              sku: TEST_SKU
            }]
          })));
        }

        // Mock Update Price Response
        if (url.includes('/ws/listings') && options.method === 'POST') {
            return Promise.resolve(new Response(JSON.stringify({
                listing_id: TEST_LISTING_ID,
                price: '195.00' // Updated price
            })));
        }
        
        // Mock Competitors Response
        if (url.includes('/ws/backbox/v1/competitors')) {
             return Promise.resolve(new Response(JSON.stringify({
                competitors: [
                    { seller_id: 'COMP-1', price: 190.00, feedback_count: 500 }
                ]
            })));
        }

        return Promise.resolve(new Response(JSON.stringify({})));
      }),
      updateConfig: mock(() => {}),
    };

    // 2. Mock Pricing Dependencies
    mockPricingRepo = {
        getListingDetails: mock(() => Promise.resolve({ 
            listing_id: TEST_LISTING_ID, 
            sku: TEST_SKU, 
            grade: 12,
            product_id: 'PRODUCT-123'
        })),
        getActiveCountries: mock(() => Promise.resolve(['fr-fr'])),
        getParameters: mock(() => Promise.resolve({ 
            min_price: 100, 
            max_price: 300, 
            target_margin: 20, 
            strategy: 'match_competitor' 
        })),
        getAverageAcquisitionCost: mock(() => Promise.resolve(50)),
        getSalesVelocity: mock(() => Promise.resolve(1)),
        updateBasePrice: mock(() => Promise.resolve()),
        savePriceCalculation: mock(() => Promise.resolve()),
        addPriceHistory: mock(() => Promise.resolve()),
    };

    mockOds = {
        detectOutliers: mock(() => ({ isOutlier: false })),
        filterPrices: mock((competitors: any[]) => competitors)
    };

    mockPfcs = {
        checkConstraints: mock(() => ({ isProfitable: true, minPrice: 100 }))
    };

    mockDpo = {
        calculatePrice: mock(() => ({ targetPrice: 195.00, ruleApplied: 'match_competitor' }))
    };

    service = new BackMarketService(mockTraffic, mockPricingRepo, mockOds, mockPfcs, mockDpo);
    syncService = new BackMarketSyncService(service);
  });

  it('should execute the full workflow: Sync -> Configure -> Reprice -> Orders', async () => {
    // --- Step 1: Sync Listings ---
    console.log('Step 1: Sync Listings');
    await syncService.syncListings();
    
    // Verify API was called
    expect(mockTraffic.scheduleRequest).toHaveBeenCalledWith(
      expect.stringContaining('/ws/listings'),
      expect.objectContaining({ method: 'GET' }),
      expect.anything(),
      expect.anything()
    );

    // Verify DB Insert (Upsert) was called
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalled();
    expect(mockDb.onDuplicateKeyUpdate).toHaveBeenCalled();

    // --- Step 2: Configure Pricing Strategy ---
    console.log('Step 2: Configure Pricing Strategy');
    // In this enhanced test, we mock the PricingRepository to return the strategy
    // so we don't need to mock the DB select for parameters here.
    // The mockPricingRepo.getParameters is already set up in beforeEach.

    // --- Step 3: Trigger Reprice (Full Logic) ---
    console.log('Step 3: Trigger Reprice (Full Logic)');
    
    // We call the actual repriceListing method which uses the DPO pipeline
    const result = await service.repriceListing(TEST_LISTING_ID);
    
    expect(result.success).toBe(true);
    
    // Verify dependencies were called
    expect(mockPricingRepo.getListingDetails).toHaveBeenCalledWith(TEST_LISTING_ID);
    expect(mockPricingRepo.getParameters).toHaveBeenCalled();
    expect(mockDpo.calculatePrice).toHaveBeenCalled();
    
    // Verify Price Update was triggered
    expect(mockTraffic.scheduleRequest).toHaveBeenCalledWith(
        expect.stringContaining('/ws/listings'),
        expect.objectContaining({ 
            method: 'POST',
            body: expect.stringContaining('195')
        }),
        expect.anything(),
        expect.anything()
    );

    // --- Step 4: Sync Orders ---
    console.log('Step 4: Sync Orders');
    await syncService.syncOrders();

    expect(mockTraffic.scheduleRequest).toHaveBeenCalledWith(
        expect.stringContaining('/ws/buyback/v1/orders'),
        expect.objectContaining({ method: 'GET' }),
        expect.anything(),
        expect.anything()
    );

    expect(mockDb.insert).toHaveBeenCalled();
  });
});
