import { describe, it, expect } from 'bun:test';
import { loadRateLimitConfig } from '../../../src/lib/bm-traffic-control/config';
import { ROUTE_MAP, BucketType, getBucketTypeForUrl } from '../../../src/lib/bm-traffic-control/definitions';

describe('Configuration', () => {
  it('should load default configuration', () => {
    const config = loadRateLimitConfig();
    expect(config.global.maxRequests).toBe(150);
    expect(config.catalog.maxRequests).toBe(15);
    expect(config.competitor.maxRequests).toBe(2);
    expect(config.care.maxRequests).toBe(300);
  });

  it('should load configuration from environment variables', () => {
    process.env.BM_RATE_LIMIT_GLOBAL_MAX_REQUESTS = '200';
    const config = loadRateLimitConfig();
    expect(config.global.maxRequests).toBe(200);
    
    // Cleanup
    delete process.env.BM_RATE_LIMIT_GLOBAL_MAX_REQUESTS;
  });
});

describe('Definitions', () => {
  it('should identify Competitor routes', () => {
    const url = 'https://www.backmarket.fr/ws/backbox/v1/competitors/123';
    expect(getBucketTypeForUrl(url)).toBe(BucketType.COMPETITOR);
  });

  it('should identify Catalog routes', () => {
    const url = 'https://www.backmarket.fr/ws/listings/123';
    expect(getBucketTypeForUrl(url)).toBe(BucketType.CATALOG);
  });

  it('should identify Care routes', () => {
    const url = 'https://www.backmarket.fr/ws/sav/threads';
    expect(getBucketTypeForUrl(url)).toBe(BucketType.CARE);
  });

  it('should default to Global for unknown routes', () => {
    const url = 'https://www.backmarket.fr/ws/unknown';
    expect(getBucketTypeForUrl(url)).toBe(BucketType.GLOBAL);
  });
});
