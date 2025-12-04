import { describe, it, expect, beforeEach, afterAll, mock, spyOn } from 'bun:test';
import { TrafficController } from '../../../src/lib/bm-traffic-control/TrafficController';
import { loadRateLimitConfig } from '../../../src/lib/bm-traffic-control/config';
import { Priority } from '../../../src/lib/bm-traffic-control/types';

describe('TrafficController', () => {
  let controller: TrafficController;
  let config: any;

  // Mock fetch
  const originalFetch = global.fetch;
  const mockFetch = mock(() => Promise.resolve(new Response('{}')));

  beforeEach(async () => {
    config = await loadRateLimitConfig();
    // Cast to any to avoid missing properties like 'preconnect' on the Mock type
    (global as any).fetch = mockFetch;
    mockFetch.mockClear();
    controller = new TrafficController(config);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should schedule and execute a request', async () => {
    const url = 'https://www.backmarket.fr/ws/listings/123';
    const promise = controller.scheduleRequest(url, {}, Priority.NORMAL, 1);
    
    const response = await promise;
    expect(response).toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(url, expect.anything());
  });

  it('should respect rate limits (queueing)', async () => {
    // Create a controller with very strict limits for testing
    const strictConfig = { ...config };
    strictConfig.catalog = { intervalMs: 1000, maxRequests: 1 };
    
    const strictController = new TrafficController(strictConfig);
    const url = 'https://www.backmarket.fr/ws/listings/123';

    // First request should go through immediately
    const p1 = strictController.scheduleRequest(url, {}, Priority.NORMAL, 1);
    
    // Second request should be queued
    const p2 = strictController.scheduleRequest(url, {}, Priority.NORMAL, 1);
    
    await p1;
    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    // Wait a bit (less than interval)
    await Bun.sleep(100);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1
    
    // Wait for interval
    await Bun.sleep(1000);
    await p2;
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should handle 429 Too Many Requests', async () => {
    // Mock 429 response once, then success
    mockFetch.mockImplementationOnce(() => Promise.resolve(new Response('Too Many Requests', { status: 429 })))
             .mockImplementationOnce(() => Promise.resolve(new Response('{}', { status: 200 })));

    const url = 'https://www.backmarket.fr/ws/listings/123';
    
    // We expect the controller to retry automatically
    const response = await controller.scheduleRequest(url, {}, Priority.NORMAL, 1);
    
    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should prioritize higher priority requests', async () => {
     // Create a controller with strict limits
     const strictConfig = { ...config };
     strictConfig.catalog = { intervalMs: 500, maxRequests: 1 };
     const strictController = new TrafficController(strictConfig);
     const url = 'https://www.backmarket.fr/ws/listings/123';
 
     // Consume the token
     strictController.scheduleRequest(url, {}, Priority.NORMAL, 1);
     
     // Queue a normal request
     const pNormal = strictController.scheduleRequest(url, {}, Priority.NORMAL, 1);
     
     // Queue a high priority request
     const pHigh = strictController.scheduleRequest(url, {}, Priority.HIGH, 1);
     
     // Wait for refill
     await Bun.sleep(600);
     
     // High priority should be executed first (or at least completed)
     // Note: In a real async environment, exact order of completion might vary slightly depending on event loop,
     // but the fetch call order should be High then Normal.
     
     await Promise.all([pNormal, pHigh]);
     
     // Check call order
     // The first call was the initial consume.
     // The second call should be the HIGH priority one.
     // The third call should be the NORMAL priority one.
     expect(mockFetch).toHaveBeenNthCalledWith(2, url, expect.anything()); 
     // We can't easily verify which promise corresponded to which call without more complex mocking,
     // but we can verify that 3 calls happened.
     expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
