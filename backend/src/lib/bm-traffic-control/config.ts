import { RateLimitConfig } from './types';
import { db } from '../../db';
import { system_config } from '../../db/circtek.schema';
import { eq } from 'drizzle-orm';

export const DEFAULT_BACKMARKET_LIMITS: RateLimitConfig = {
  global: { intervalMs: 10000, maxRequests: 150 }, // Safe buffer below 200
  catalog: { intervalMs: 10000, maxRequests: 15 }, // Safe buffer below 20
  competitor: { intervalMs: 1000, maxRequests: 2 }, // Strict 2/sec
  care: { intervalMs: 60000, maxRequests: 300 }, // Conservative estimate
};

export async function loadRateLimitConfig(): Promise<RateLimitConfig> {
  try {
    const configRecord = await db.select().from(system_config).where(eq(system_config.key, 'backmarket_rate_limits')).limit(1);
    
    if (configRecord.length > 0) {
      const dbConfig = configRecord[0].value as RateLimitConfig;
      // Merge with defaults to ensure all keys exist
      return {
        global: { ...DEFAULT_BACKMARKET_LIMITS.global, ...dbConfig?.global },
        catalog: { ...DEFAULT_BACKMARKET_LIMITS.catalog, ...dbConfig?.catalog },
        competitor: { ...DEFAULT_BACKMARKET_LIMITS.competitor, ...dbConfig?.competitor },
        care: { ...DEFAULT_BACKMARKET_LIMITS.care, ...dbConfig?.care },
      };
    }
  } catch (error) {
    console.error('Failed to load rate limit config from DB, using defaults:', error);
  }

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

export async function saveRateLimitConfig(config: RateLimitConfig): Promise<void> {
  // Check if exists
  const existing = await db.select().from(system_config).where(eq(system_config.key, 'backmarket_rate_limits')).limit(1);
  
  if (existing.length > 0) {
    await db.update(system_config)
      .set({ value: config })
      .where(eq(system_config.key, 'backmarket_rate_limits'));
  } else {
    await db.insert(system_config).values({
      key: 'backmarket_rate_limits',
      value: config,
      description: 'Back Market API Rate Limit Configuration'
    });
  }
}

export async function saveRateLimitConfig(config: RateLimitConfig): Promise<void> {
    const existing = await db.select().from(system_config).where(eq(system_config.key, 'backmarket_rate_limits')).limit(1);
    
    if (existing.length > 0) {
        await db.update(system_config).set({ value: config }).where(eq(system_config.key, 'backmarket_rate_limits'));
    } else {
        await db.insert(system_config).values({
            key: 'backmarket_rate_limits',
            value: config,
            description: 'Back Market API Rate Limits'
        });
    }
}
