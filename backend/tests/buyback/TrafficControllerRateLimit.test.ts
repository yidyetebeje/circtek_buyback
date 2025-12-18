import { describe, it, expect, beforeEach } from 'bun:test';
import { TrafficController, DEFAULT_BACKMARKET_LIMITS, Priority, BucketType } from '../../src/lib/bm-traffic-control';

// Helper to access bucket status via public API
function getBucketStatus(tc: any, type: BucketType | string) {
  const status = tc.getStatus();
  return status[type];
}

describe('TrafficController Rate Limit Buckets', () => {
let tc: TrafficController;

  beforeEach(() => {
    tc = new TrafficController(DEFAULT_BACKMARKET_LIMITS);
  });

  it('should decrement tokens in global and catalog buckets on use', async () => {
    const url = 'https://www.backmarket.fr/ws/listings'; // Catalog bucket
    const options = { method: 'GET' };
    const initialGlobal = getBucketStatus(tc, 'GLOBAL').tokens;
    const initialCatalog = getBucketStatus(tc, 'CATALOG').tokens;

    // Schedule a request (cost 1)
    await tc.scheduleRequest(url, options, Priority.NORMAL, 1);

    const afterGlobal = getBucketStatus(tc, 'GLOBAL').tokens;
    const afterCatalog = getBucketStatus(tc, 'CATALOG').tokens;

    expect(afterGlobal).toBe(initialGlobal - 1);
    expect(afterCatalog).toBe(initialCatalog - 1);
  });

  it('should refill tokens after interval', async () => {
    const url = 'https://www.backmarket.fr/ws/listings';
    const options = { method: 'GET' };
    await tc.scheduleRequest(url, options, Priority.NORMAL, 1);

    // Manually advance time to force refill
    // Access internal bucket to manipulate lastRefill for testing purposes
    const catalogBucket = (tc as any).buckets.get(BucketType.CATALOG);
    // adjust private lastRefill (testing-only hack)
    (catalogBucket as any).lastRefill -= (DEFAULT_BACKMARKET_LIMITS.catalog.intervalMs + 1000);
    const beforeRefill = catalogBucket.getStatus().tokens;
    // Next call triggers refill (canSpend invokes refill)
    catalogBucket.canSpend(1);
    const afterRefill = catalogBucket.getStatus().tokens;
    expect(afterRefill).toBe(DEFAULT_BACKMARKET_LIMITS.catalog.maxRequests);
    expect(afterRefill).toBeGreaterThan(beforeRefill);
  });
});
