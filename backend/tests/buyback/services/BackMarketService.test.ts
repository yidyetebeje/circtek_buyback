import { describe, it, expect, mock, spyOn, beforeEach, afterEach } from 'bun:test';
import { BackMarketService } from '../../../src/buyback/services/backMarketService';
import { Priority, TrafficController } from '../../../src/lib/bm-traffic-control';
import { db } from '../../../src/db';
import { backmarket_listings, backmarket_price_history } from '../../../src/db/backmarket.schema';
import { eq } from 'drizzle-orm';

describe('BackMarketService Integration Tests', () => {
  let service: BackMarketService;
  let mockTraffic: any;
  const testListingId = 'test-listing-123';

  beforeEach(async () => {
    // Mock TrafficController
    mockTraffic = {
      scheduleRequest: mock((url: string) => {
        if (url.includes('/competitors')) {
            return Promise.resolve(new Response(JSON.stringify({ competitors: [] })));
        }
        return Promise.resolve(new Response(JSON.stringify({ success: true })));
      }),
      updateConfig: mock(() => {})
    };

    // Mock Bun.sleep to avoid waiting
    spyOn(Bun, 'sleep').mockImplementation(() => Promise.resolve());

    // Initialize service with mocked traffic controller
    service = new BackMarketService(mockTraffic as unknown as TrafficController);

    // Setup test data in DB
    await db.insert(backmarket_listings).values({
      listing_id: testListingId,
      sku: 'TEST-SKU',
      price: '100.00',
      currency: 'EUR',
      quantity: 1,
      synced_at: new Date()
    });
  });

  afterEach(async () => {
    // Cleanup test data
    await db.delete(backmarket_price_history).where(eq(backmarket_price_history.listing_id, testListingId));
    await db.delete(backmarket_listings).where(eq(backmarket_listings.listing_id, testListingId));
    mock.restore();
  });

  it('should run price probe (Dip-Peek-Peak) and update history', async () => {
    const currentPrice = 100;
    
    // Run the probe
    const newPrice = await service.runPriceProbe(testListingId, currentPrice);

    // 1. Verify Traffic Controller calls
    // Expect 3 calls: Dip (POST), Peek (GET), Peak (POST)
    expect(mockTraffic.scheduleRequest).toHaveBeenCalledTimes(3);
    
    // Verify Dip (Price = 1.00)
    const dipCall = mockTraffic.scheduleRequest.mock.calls[0];
    expect(dipCall[0]).toContain(`/ws/listings/${testListingId}`);
    expect(JSON.parse(dipCall[1].body).price).toBe(1.00);

    // Verify Peak (Price = newPrice)
    const peakCall = mockTraffic.scheduleRequest.mock.calls[2];
    expect(JSON.parse(peakCall[1].body).price).toBe(newPrice);

    // 2. Verify Database Updates (Last Dip)
    const listing = await db.select().from(backmarket_listings)
      .where(eq(backmarket_listings.listing_id, testListingId))
      .limit(1);
    
    expect(listing[0]).toBeDefined();
    expect(listing[0].last_dip_at).toBeDefined();
    // Verify timestamp is recent (within last minute)
    const now = new Date();
    const diff = now.getTime() - new Date(listing[0].last_dip_at!).getTime();
    expect(diff).toBeLessThan(1000 * 60); 

    // 3. Verify Price History
    const history = await service.getPriceHistory(testListingId);
    expect(history).toBeDefined();
    expect(history.length).toBeGreaterThan(0);
    expect(Number(history[0].price)).toBe(newPrice);
    expect(history[0].listing_id).toBe(testListingId);
  });

  it('should retrieve price history correctly', async () => {
    // Insert some history manually
    await db.insert(backmarket_price_history).values([
      {
        listing_id: testListingId,
        price: '90.00',
        currency: 'EUR',
        is_winner: true,
        timestamp: new Date(Date.now() - 10000) // 10s ago
      },
      {
        listing_id: testListingId,
        price: '95.00',
        currency: 'EUR',
        is_winner: false,
        timestamp: new Date(Date.now() - 20000) // 20s ago
      }
    ]);

    const history = await service.getPriceHistory(testListingId);
    
    expect(history.length).toBe(2);
    expect(Number(history[0].price)).toBe(90.00); // Most recent first
    expect(Number(history[1].price)).toBe(95.00);
  });
});
