import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { BackMarketService } from '../../src/buyback/services/backMarketService';
import { TrafficController, Priority } from '../../src/lib/bm-traffic-control';
import { RateLimitConfig } from '../../src/lib/bm-traffic-control/types';

// Mock config for testing
const TEST_CONFIG: RateLimitConfig = {
  global: { intervalMs: 500, maxRequests: 1 }, // 1 request every 500ms
  catalog: { intervalMs: 500, maxRequests: 1 },
  competitor: { intervalMs: 500, maxRequests: 1 },
  care: { intervalMs: 500, maxRequests: 1 },
};

describe('BackMarketService + TrafficController Integration', () => {
  let originalFetch: typeof fetch;
  let service: BackMarketService;
  let traffic: TrafficController;

  beforeAll(() => {
    originalFetch = global.fetch;
    
    // Mock fetch to return immediately
    global.fetch = (async (url: any) => {
      return new Response(JSON.stringify({ status: 'mocked' }), { status: 200 });
    }) as any;

    // Create service with strict rate limits
    traffic = new TrafficController(TEST_CONFIG);
    service = new BackMarketService(traffic);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should throttle concurrent requests according to rate limits', async () => {
    const start = Date.now();
    
    // Fire 3 requests concurrently
    // They should be serialized by the rate limiter: 0ms, 500ms, 1000ms
    await Promise.all([
      service.getListings({ page: 1 }),
      service.getListings({ page: 2 }),
      service.getListings({ page: 3 })
    ]);

    const duration = Date.now() - start;
    
    // Should take at least 1000ms (2 intervals)
    // Allow some buffer for execution overhead
    expect(duration).toBeGreaterThanOrEqual(1000);
    expect(duration).toBeLessThan(2000); // Shouldn't take too long
  });

  it('should prioritize high priority requests', async () => {
    const executionOrder: string[] = [];
    
    // Mock fetch to record execution order
    global.fetch = (async (url: any) => {
      if (url.toString().includes('page=1')) executionOrder.push('low');
      if (url.toString().includes('page=2')) executionOrder.push('high');
      return new Response(JSON.stringify({ status: 'mocked' }), { status: 200 });
    }) as any;

    // Reset traffic controller to clear any previous state/delays
    traffic = new TrafficController({
        ...TEST_CONFIG,
        global: { intervalMs: 100, maxRequests: 1 } // Faster for this test
    });
    service = new BackMarketService(traffic);

    // 1. Consume available tokens so the next requests are forced to queue
    await service.getListings({ page: 99 }, Priority.NORMAL); 
    
    // 2. Now queue up mixed priorities
    // We don't await them yet, so they enter the queue almost simultaneously
    const pLow = service.getListings({ page: 1 }, Priority.LOW);
    const pHigh = service.getListings({ page: 2 }, Priority.HIGH);
    
    await Promise.all([pLow, pHigh]);
    
    // The High priority request should have been processed before the Low priority one
    expect(executionOrder).toEqual(['high', 'low']); 
  });
});
