import { RateLimitConfig } from './types';

export const DEFAULT_BACKMARKET_LIMITS: RateLimitConfig = {
  global: { intervalMs: 10000, maxRequests: 150 }, // Safe buffer below 200
  catalog: { intervalMs: 10000, maxRequests: 15 }, // Safe buffer below 20
  competitor: { intervalMs: 1000, maxRequests: 2 }, // Strict 2/sec
  care: { intervalMs: 60000, maxRequests: 300 }, // Conservative estimate
};

export function loadRateLimitConfig(): RateLimitConfig {
  return {
    global: {
      intervalMs: parseInt(process.env.BM_RATE_LIMIT_GLOBAL_INTERVAL_MS || String(DEFAULT_BACKMARKET_LIMITS.global.intervalMs)),
      maxRequests: parseInt(process.env.BM_RATE_LIMIT_GLOBAL_MAX_REQUESTS || String(DEFAULT_BACKMARKET_LIMITS.global.maxRequests)),
    },
    catalog: {
      intervalMs: parseInt(process.env.BM_RATE_LIMIT_CATALOG_INTERVAL_MS || String(DEFAULT_BACKMARKET_LIMITS.catalog.intervalMs)),
      maxRequests: parseInt(process.env.BM_RATE_LIMIT_CATALOG_MAX_REQUESTS || String(DEFAULT_BACKMARKET_LIMITS.catalog.maxRequests)),
    },
    competitor: {
      intervalMs: parseInt(process.env.BM_RATE_LIMIT_COMPETITOR_INTERVAL_MS || String(DEFAULT_BACKMARKET_LIMITS.competitor.intervalMs)),
      maxRequests: parseInt(process.env.BM_RATE_LIMIT_COMPETITOR_MAX_REQUESTS || String(DEFAULT_BACKMARKET_LIMITS.competitor.maxRequests)),
    },
    care: {
      intervalMs: parseInt(process.env.BM_RATE_LIMIT_CARE_INTERVAL_MS || String(DEFAULT_BACKMARKET_LIMITS.care.intervalMs)),
      maxRequests: parseInt(process.env.BM_RATE_LIMIT_CARE_MAX_REQUESTS || String(DEFAULT_BACKMARKET_LIMITS.care.maxRequests)),
    },
  };
}
