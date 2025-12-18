# Back Market Integration - Rate Limiter Package

## Overview

This document describes the implementation of a standalone rate limiter package (`bm-traffic-control`) for integrating with the Back Market API in the buyback feature. The package implements a transactional multi-bucket token system with reservation to prevent rate limit violations and ensure safe price probe operations.

## Table of Contents

1. [Research Findings - Hard Limits](#research-findings---hard-limits)
2. [Package Architecture](#package-architecture)
3. [Implementation Guide](#implementation-guide)
4. [Configuration](#configuration)
5. [Database Schema](#database-schema)
6. [Usage Examples](#usage-examples)
7. [Integration with Buyback Feature](#integration-with-buyback-feature)

---

## Research Findings - Hard Limits

The Back Market API (via Cloudflare WAF) imposes specific limits that are stricter than standard APIs. Violating these results in `429 Too Many Requests` or `403 Forbidden` (WAF Block).

### Rate Limit Table

| Scope | Limit Description | Calculated RPM (Req/Min) | Critical Notes |
| :--- | :--- | :--- | :--- |
| **Global / WAF** | "200 requests in 10 seconds" | **1,200 RPM** | This is the absolute ceiling for the whole app. |
| **Catalog (Listings)** | "20 requests in 10 seconds" | **120 RPM** | **CRITICAL.** Applies to `POST /ws/listings` (Price Updates). This is your bottleneck. |
| **Competitors** | "Twice per second per IP" | **120 RPM** | Applies to `GET /ws/backbox/v1/competitors`. |
| **Care (SAV)** | Varies (292 - 750 RPM) | ~300 RPM | Separate bucket. Less critical for repricing. |
| **Data Ingestion** | "2k lines of SKUs per hour" | N/A | Applies to Bulk CSV updates only. |

### The "Probe" Math

Your strategy requires a sequence of 3 actions:
1. **Dip** (POST Listing): Consumes **1 Catalog Token**.
2. **Peek** (GET Competitor): Consumes **1 Competitor Token**.
3. **Peak** (POST Listing): Consumes **1 Catalog Token**.

**Constraint:** Since the "Catalog" limit (120 RPM) is the tightest constraint and you use it twice per cycle, your theoretical maximum speed is **60 Probes per Minute** (1 probe per second) across your entire account.

### Safe Operating Thresholds

To prevent hitting the hard limits, we operate with safety buffers:

- **Global**: 150 requests per 10 seconds (75% of 200 limit)
- **Catalog**: 15 requests per 10 seconds (75% of 20 limit)
- **Competitor**: 2 requests per second (strict enforcement)
- **Care**: 300 requests per minute (conservative estimate)

---

## Package Architecture

### Design Philosophy

The `bm-traffic-control` package utilizes a **Transactional Multi-Bucket Token System with Reservation** to prevent the "1 EUR Trap" scenario where a price is set to 1 EUR but cannot be recovered due to rate limits.

**Key Principles:**
- **Multi-Bucket:** Separate counters for "Global", "Catalog", "Competitor", and "Care" endpoints
- **Transactional Reservation:** Before sending the "Dip" (1 EUR price), the system must **reserve** the capacity for the "Peak" (Recovery). If there isn't enough capacity to recover, the "Dip" is never sent
- **Priority-Based Queue:** Requests are processed based on priority levels to ensure critical operations (like price recovery) are handled first
- **Configuration-Driven:** All rate limits are configurable via environment variables or configuration objects, making the package reusable for other integrations

### Priority Levels

1. **CRITICAL** (Priority 0): Emergency Reverts (fixing a 1 EUR error). **Bypasses reservations.**
2. **HIGH** (Priority 1): The "Peak" (Price recovery) and "Peek" (Competitor check).
3. **NORMAL** (Priority 2): The "Dip" (Starting a probe).
4. **LOW** (Priority 3): Watchdog scans / General inventory fetch.

### System Architecture

The system sits between your application logic and the `fetch` API, intercepting all Back Market API requests and managing them through a priority queue system.

```
Application Logic
    ↓
TrafficController (Priority Queue)
    ↓
TokenBucket (Rate Limit Enforcement)
    ↓
Fetch API (Actual HTTP Request)
    ↓
Back Market API
```

### File Structure

```
/src
  /lib
    /bm-traffic-control
      index.ts           # Main entry point, exports
      TokenBucket.ts     # The math logic for token management
      TrafficController.ts # The orchestrator (queues + execution)
      RequestQueue.ts    # Priority queue implementation
      definitions.ts     # Route regex patterns and bucket types
      types.ts           # TypeScript interfaces and types
      config.ts          # Configuration loader
```

---

## Implementation Guide

### 1. Definitions (`definitions.ts`) - Mapping Routes to Limits

We define regex patterns to automatically categorize outgoing requests.

```typescript
export enum BucketType {
  GLOBAL = 'GLOBAL',
  CATALOG = 'CATALOG', // Listings, Updates
  COMPETITOR = 'COMPETITOR', // Backbox, Competitors
  CARE = 'CARE', // SAV
}

export const ROUTE_MAP: { pattern: RegExp; type: BucketType }[] = [
  { pattern: /\/ws\/backbox\/v1\/competitors/, type: BucketType.COMPETITOR },
  { pattern: /\/ws\/listings/, type: BucketType.CATALOG },
  { pattern: /\/ws\/sav/, type: BucketType.CARE },
];
```

### 2. TokenBucket (`TokenBucket.ts`) - The Limiter Logic

This class manages the tokens. Note the `reserve` method for transactional operations.

```typescript
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private reservedTokens: number = 0;
  
  constructor(
    private maxTokens: number, 
    private refillIntervalMs: number
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed > this.refillIntervalMs) {
      this.tokens = this.maxTokens;
      this.lastRefill = now;
    }
  }

  public canSpend(cost: number = 1): boolean {
    this.refill();
    return (this.tokens - this.reservedTokens) >= cost;
  }

  public canReserve(totalCost: number): boolean {
    this.refill();
    return (this.tokens - this.reservedTokens) >= totalCost;
  }

  public spend(cost: number = 1): boolean {
    this.refill();
    if ((this.tokens - this.reservedTokens) >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }

  public reserve(cost: number): boolean {
    if (this.canReserve(cost)) {
      this.reservedTokens += cost;
      return true;
    }
    return false;
  }

  public spendReserved(cost: number): void {
    if (this.reservedTokens >= cost) {
      this.reservedTokens -= cost;
      this.tokens -= cost;
    }
  }

  public releaseReservation(cost: number): void {
    this.reservedTokens = Math.max(0, this.reservedTokens - cost);
  }

  public getRemaining(): number {
    this.refill();
    return this.tokens - this.reservedTokens;
  }

  public getAvailable(): number {
    this.refill();
    return this.tokens;
  }
}
```

### 3. TrafficController (`TrafficController.ts`) - The Orchestrator

This singleton manages the queues and executes the fetch. See full implementation in the package source code.

**Key Features:**
- Priority-based request queue (CRITICAL, HIGH, NORMAL, LOW)
- Automatic bucket detection based on URL patterns
- Token reservation system for transactional operations
- Automatic retry handling for 429 responses
- Optional logging integration

**Usage:**
```typescript
const traffic = new TrafficController(config, logger);
const response = await traffic.scheduleRequest(url, options, Priority.NORMAL, 2);
```

---

## Configuration

### Configuration Interface

The package accepts configuration via a `RateLimitConfig` interface:

```typescript
export interface RateLimitConfig {
  global: {
    intervalMs: number;
    maxRequests: number;
  };
  catalog: {
    intervalMs: number;
    maxRequests: number;
  };
  competitor: {
    intervalMs: number;
    maxRequests: number;
  };
  care: {
    intervalMs: number;
    maxRequests: number;
  };
}
```

### Default Configuration

```typescript
export const DEFAULT_BACKMARKET_LIMITS: RateLimitConfig = {
  global: { intervalMs: 10000, maxRequests: 150 }, // Safe buffer below 200
  catalog: { intervalMs: 10000, maxRequests: 15 }, // Safe buffer below 20
  competitor: { intervalMs: 1000, maxRequests: 2 }, // Strict 2/sec
  care: { intervalMs: 60000, maxRequests: 300 }, // Conservative estimate
};
```

### Environment Variable Configuration

For production, configure via environment variables:

```bash
# .env
BM_RATE_LIMIT_GLOBAL_INTERVAL_MS=10000
BM_RATE_LIMIT_GLOBAL_MAX_REQUESTS=150
BM_RATE_LIMIT_CATALOG_INTERVAL_MS=10000
BM_RATE_LIMIT_CATALOG_MAX_REQUESTS=15
BM_RATE_LIMIT_COMPETITOR_INTERVAL_MS=1000
BM_RATE_LIMIT_COMPETITOR_MAX_REQUESTS=2
BM_RATE_LIMIT_CARE_INTERVAL_MS=60000
BM_RATE_LIMIT_CARE_MAX_REQUESTS=300
```

### Configuration Loader

```typescript
// config.ts
export function loadRateLimitConfig(): RateLimitConfig {
  return {
    global: {
      intervalMs: parseInt(process.env.BM_RATE_LIMIT_GLOBAL_INTERVAL_MS || '10000'),
      maxRequests: parseInt(process.env.BM_RATE_LIMIT_GLOBAL_MAX_REQUESTS || '150'),
    },
    catalog: {
      intervalMs: parseInt(process.env.BM_RATE_LIMIT_CATALOG_INTERVAL_MS || '10000'),
      maxRequests: parseInt(process.env.BM_RATE_LIMIT_CATALOG_MAX_REQUESTS || '15'),
    },
    competitor: {
      intervalMs: parseInt(process.env.BM_RATE_LIMIT_COMPETITOR_INTERVAL_MS || '1000'),
      maxRequests: parseInt(process.env.BM_RATE_LIMIT_COMPETITOR_MAX_REQUESTS || '2'),
    },
    care: {
      intervalMs: parseInt(process.env.BM_RATE_LIMIT_CARE_INTERVAL_MS || '60000'),
      maxRequests: parseInt(process.env.BM_RATE_LIMIT_CARE_MAX_REQUESTS || '300'),
    },
  };
}
```

---

## Database Schema

### Rate Limit Logs Table

You should log every **Priority 0 (Rescue)** and **Priority 1 (Probe)** action to MySQL to track if your rate limiter is working correctly.

#### Drizzle Schema Definition

```typescript
// db/circtek.schema.ts (add to existing schema file)

import { mysqlTable, int, varchar, timestamp, serial, index } from 'drizzle-orm/mysql-core';

export const rate_limit_logs = mysqlTable('rate_limit_logs', {
  id: serial('id').primaryKey(),
  endpoint: varchar('endpoint', { length: 500 }).notNull(),
  priority: int('priority').notNull(), // 0=CRITICAL, 1=HIGH, 2=NORMAL, 3=LOW
  status: varchar('status', { length: 50 }).notNull(), // 'QUEUED', 'EXECUTED', '429_HIT', 'ERROR'
  response_status: int('response_status'), // HTTP status code
  duration: int('duration'), // Request duration in milliseconds
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => [
  index('idx_rate_limit_logs_timestamp').on(table.timestamp),
  index('idx_rate_limit_logs_priority').on(table.priority),
  index('idx_rate_limit_logs_status').on(table.status),
]);
```

#### Migration SQL

```sql
-- drizzle/migrations/XXXX_add_rate_limit_logs.sql

CREATE TABLE IF NOT EXISTS `rate_limit_logs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `endpoint` varchar(500) NOT NULL,
  `priority` int NOT NULL,
  `status` varchar(50) NOT NULL,
  `response_status` int DEFAULT NULL,
  `duration` int DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rate_limit_logs_timestamp` (`timestamp`),
  KEY `idx_rate_limit_logs_priority` (`priority`),
  KEY `idx_rate_limit_logs_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Logging Interface

```typescript
// types.ts in bm-traffic-control package

export interface RateLimitLog {
  endpoint: string;
  priority: number;
  status: 'QUEUED' | 'EXECUTED' | '429_HIT' | 'ERROR';
  responseStatus?: number;
  timestamp: Date;
  duration?: number;
}
```

#### Logger Implementation

```typescript
// In your buyback service or controller

import { db } from '../db';
import { rate_limit_logs } from '../db/circtek.schema';

export async function logRateLimitRequest(log: RateLimitLog): Promise<void> {
  await db.insert(rate_limit_logs).values({
    endpoint: log.endpoint,
    priority: log.priority,
    status: log.status,
    response_status: log.responseStatus || null,
    duration: log.duration || null,
    timestamp: log.timestamp,
  });
}

// Usage with TrafficController
const traffic = new TrafficController(config, logRateLimitRequest);
```

---

## Usage Examples

### Basic Usage

```typescript
import { TrafficController, Priority } from '../lib/bm-traffic-control';
import { loadRateLimitConfig } from '../lib/bm-traffic-control/config';
import { logRateLimitRequest } from './services/rateLimitLogger';

// Initialize with configuration
const config = loadRateLimitConfig();
const traffic = new TrafficController(config, logRateLimitRequest);

// Simple request
const response = await traffic.scheduleRequest(
  'https://www.backmarket.fr/ws/listings/123',
  {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN',
      'Content-Type': 'application/json'
    }
  },
  Priority.NORMAL,
  1 // 1 token cost
);

const data = await response.json();
```

### The "Probe" Logic - Complete Implementation

This is how you use the package to ensure safety during price probing operations.

```typescript
// services/Repricer.ts
import { TrafficController, Priority } from '../lib/bm-traffic-control';
import { loadRateLimitConfig } from '../lib/bm-traffic-control/config';
import { logRateLimitRequest } from './rateLimitLogger';

const config = loadRateLimitConfig();
const traffic = new TrafficController(config, logRateLimitRequest);

export async function runProbe(listingId: string, currentPrice: number) {
  
  const listingUrl = `https://www.backmarket.fr/ws/listings/${listingId}`;
  const competitorUrl = `https://www.backmarket.fr/ws/backbox/v1/competitors/${listingId}`;

  // STEP 1: THE DIP
  // We use Priority.NORMAL
  // KEY: We ask to reserve 2 TOKENS. 1 for this Dip, 1 reserved for the Peak later.
  // If only 1 token is available, this call will hang in the queue until 2 are available.
  try {
    await traffic.scheduleRequest(
      listingUrl, 
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ price: 1.00 })
      }, 
      Priority.NORMAL, 
      2 // Reserve 2 tokens: 1 for Dip, 1 for Peak
    ); 
  } catch (e) {
    console.log("Skipping probe, queue too full or rate limited");
    return;
  }

  // STEP 2: Wait for competitors to react
  await Bun.sleep(3000);

  // STEP 3: THE PEEK
  // Priority HIGH because we are currently live at 1 EUR
  let competitorData;
  try {
    const res = await traffic.scheduleRequest(
      competitorUrl, 
      {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN',
          'Content-Type': 'application/json'
        }
      }, 
      Priority.HIGH, 
      1 // 1 token for competitor check
    );
    competitorData = await res.json();
  } catch (e) {
    // If this fails, we must recover blindly!
    console.error("Failed to peek competitors, recovering blindly");
    competitorData = null;
  }

  // STEP 4: THE PEAK
  // Priority HIGH. 
  // We don't need to reserve cost here (cost 0), because we reserved it in Step 1.
  // We effectively "spend" the token we reserved earlier.
  
  const newPrice = calculatePrice(competitorData, currentPrice);
  
  await traffic.scheduleRequest(
    listingUrl, 
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ price: newPrice })
    }, 
    Priority.HIGH, 
    0 // Cost 0 - we already reserved this token in Step 1
  );
}

function calculatePrice(competitorData: any, fallbackPrice: number): number {
  if (!competitorData || !competitorData.competitors) {
    return fallbackPrice;
  }
  
  // Your pricing logic here
  // For example: set price 1% below lowest competitor
  const lowestCompetitor = Math.min(
    ...competitorData.competitors.map((c: any) => c.price)
  );
  
  return Math.max(lowestCompetitor * 0.99, fallbackPrice * 0.5);
}
```

### Emergency Recovery (CRITICAL Priority)

```typescript
// Emergency function to recover from a stuck 1 EUR price
export async function emergencyRecovery(listingId: string, targetPrice: number) {
  const listingUrl = `https://www.backmarket.fr/ws/listings/${listingId}`;
  
  // CRITICAL priority bypasses reservations
  await traffic.scheduleRequest(
    listingUrl,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ price: targetPrice })
    },
    Priority.CRITICAL, // Bypasses all reservations
    1
  );
}
```

### Watchdog Scan (LOW Priority)

```typescript
// Low priority for routine inventory checks
export async function checkInventoryStatus(listingIds: string[]) {
  const results = await Promise.all(
    listingIds.map(id => 
      traffic.scheduleRequest(
        `https://www.backmarket.fr/ws/listings/${id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer YOUR_TOKEN',
            'Content-Type': 'application/json'
          }
        },
        Priority.LOW, // Lowest priority
        1
      )
    )
  );
  
  return Promise.all(results.map(r => r.json()));
}
```

---

## Integration with Buyback Feature

### Package Location

The `bm-traffic-control` package should be placed in:

```
circtek-web/backend/src/lib/bm-traffic-control/
```

This makes it a standalone, reusable package that can be used by other parts of the application for different API integrations.

### Integration Steps

#### 1. Create Package Structure

```bash
mkdir -p backend/src/lib/bm-traffic-control
cd backend/src/lib/bm-traffic-control
```

Create the following files:
- `index.ts` - Main exports
- `TokenBucket.ts` - Token bucket implementation
- `TrafficController.ts` - Main controller
- `definitions.ts` - Route mappings and bucket types
- `types.ts` - TypeScript interfaces
- `config.ts` - Configuration loader

#### 2. Create Buyback Back Market Service

Create a new service file for Back Market integration:

```typescript
// backend/src/buyback/services/backMarketService.ts

import { TrafficController, Priority } from '../../lib/bm-traffic-control';
import { loadRateLimitConfig } from '../../lib/bm-traffic-control/config';
import { logRateLimitRequest } from './rateLimitLogger';

const config = loadRateLimitConfig();
const traffic = new TrafficController(config, logRateLimitRequest);

export class BackMarketService {
  private baseUrl = process.env.BACKMARKET_API_URL || 'https://www.backmarket.fr';
  private apiToken = process.env.BACKMARKET_API_TOKEN;

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Update listing price
   */
  async updatePrice(listingId: string, price: number, priority: Priority = Priority.NORMAL): Promise<Response> {
    return traffic.scheduleRequest(
      `${this.baseUrl}/ws/listings/${listingId}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ price })
      },
      priority,
      1
    );
  }

  /**
   * Get competitor data
   */
  async getCompetitors(listingId: string): Promise<any> {
    const response = await traffic.scheduleRequest(
      `${this.baseUrl}/ws/backbox/v1/competitors/${listingId}`,
      {
        method: 'GET',
        headers: this.getHeaders()
      },
      Priority.HIGH,
      1
    );
    return response.json();
  }

  /**
   * Run price probe (Dip-Peek-Peak)
   */
  async runPriceProbe(listingId: string, currentPrice: number): Promise<number> {
    // Dip: Set to 1 EUR
    await this.updatePrice(listingId, 1.00, Priority.NORMAL);
    
    // Wait for competitors to react
    await Bun.sleep(3000);
    
    // Peek: Get competitor data
    const competitorData = await this.getCompetitors(listingId);
    
    // Peak: Calculate and set new price
    const newPrice = this.calculateOptimalPrice(competitorData, currentPrice);
    await this.updatePrice(listingId, newPrice, Priority.HIGH);
    
    return newPrice;
  }

  /**
   * Emergency price recovery
   */
  async emergencyRecovery(listingId: string, targetPrice: number): Promise<void> {
    await this.updatePrice(listingId, targetPrice, Priority.CRITICAL);
  }

  private calculateOptimalPrice(competitorData: any, fallbackPrice: number): number {
    // Your pricing algorithm here
    if (!competitorData?.competitors?.length) {
      return fallbackPrice;
    }
    
    const lowestCompetitor = Math.min(
      ...competitorData.competitors.map((c: any) => c.price)
    );
    
    // Set 1% below lowest competitor, but not below 50% of original
    return Math.max(lowestCompetitor * 0.99, fallbackPrice * 0.5);
  }
}
```

#### 3. Add Environment Variables

Add to your `.env` file:

```bash
# Back Market API Configuration
BACKMARKET_API_URL=https://www.backmarket.fr
BACKMARKET_API_TOKEN=your_token_here

# Rate Limiter Configuration (optional - defaults provided)
BM_RATE_LIMIT_GLOBAL_INTERVAL_MS=10000
BM_RATE_LIMIT_GLOBAL_MAX_REQUESTS=150
BM_RATE_LIMIT_CATALOG_INTERVAL_MS=10000
BM_RATE_LIMIT_CATALOG_MAX_REQUESTS=15
BM_RATE_LIMIT_COMPETITOR_INTERVAL_MS=1000
BM_RATE_LIMIT_COMPETITOR_MAX_REQUESTS=2
BM_RATE_LIMIT_CARE_INTERVAL_MS=60000
BM_RATE_LIMIT_CARE_MAX_REQUESTS=300
```

#### 4. Create Controller Endpoint

```typescript
// backend/src/buyback/controllers/backMarketController.ts

import { Elysia } from 'elysia';
import { BackMarketService } from '../services/backMarketService';

const backMarketService = new BackMarketService();

export const backMarketController = new Elysia({ prefix: '/backmarket' })
  .post('/probe/:listingId', async ({ params, body }) => {
    const { listingId } = params;
    const { currentPrice } = body as { currentPrice: number };
    
    const newPrice = await backMarketService.runPriceProbe(listingId, currentPrice);
    
    return {
      success: true,
      listingId,
      newPrice
    };
  })
  .post('/recover/:listingId', async ({ params, body }) => {
    const { listingId } = params;
    const { targetPrice } = body as { targetPrice: number };
    
    await backMarketService.emergencyRecovery(listingId, targetPrice);
    
    return {
      success: true,
      listingId,
      message: 'Price recovered'
    };
  });
```

#### 5. Add Routes

```typescript
// backend/src/buyback/routes/orderRoutes.ts (or create new backMarketRoutes.ts)

import { backMarketController } from '../controllers/backMarketController';

// Add to your buyback API
export const buybackApi = new Elysia({ prefix: "/buyback" })
  .use(orderRoutes)
  .use(backMarketController); // Add this line
```

### Monitoring and Observability

#### Dashboard Queries

You can query the `rate_limit_logs` table to monitor:

1. **Rate limit violations:**
```sql
SELECT COUNT(*) as violations, DATE(timestamp) as date
FROM rate_limit_logs
WHERE status = '429_HIT'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

2. **Priority distribution:**
```sql
SELECT priority, status, COUNT(*) as count
FROM rate_limit_logs
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY priority, status
ORDER BY priority, status;
```

3. **Average request duration:**
```sql
SELECT AVG(duration) as avg_duration, priority
FROM rate_limit_logs
WHERE status = 'EXECUTED' AND duration IS NOT NULL
GROUP BY priority;
```

### Testing

#### Unit Tests

```typescript
// tests/bm-traffic-control.test.ts

import { describe, it, expect } from 'bun:test';
import { TokenBucket } from '../src/lib/bm-traffic-control/TokenBucket';

describe('TokenBucket', () => {
  it('should refill tokens after interval', async () => {
    const bucket = new TokenBucket(10, 1000);
    
    // Spend all tokens
    for (let i = 0; i < 10; i++) {
      expect(bucket.spend()).toBe(true);
    }
    
    expect(bucket.canSpend()).toBe(false);
    
    // Wait for refill
    await Bun.sleep(1100);
    expect(bucket.canSpend()).toBe(true);
  });
  
  it('should reserve tokens correctly', () => {
    const bucket = new TokenBucket(10, 1000);
    
    expect(bucket.canReserve(5)).toBe(true);
    bucket.reserve(5);
    expect(bucket.canSpend(6)).toBe(false); // Only 5 available now
    expect(bucket.canSpend(5)).toBe(true);
  });
});
```

### Package Reusability

The `bm-traffic-control` package is designed to be reusable for other API integrations. To use it with a different service:

1. **Update route mappings** in `definitions.ts`:
```typescript
export const OTHER_API_ROUTE_MAP: { pattern: RegExp; type: BucketType }[] = [
  { pattern: /\/api\/v1\/products/, type: BucketType.CATALOG },
  { pattern: /\/api\/v1\/analytics/, type: BucketType.CARE },
];
```

2. **Create new configuration:**
```typescript
const otherApiConfig: RateLimitConfig = {
  global: { intervalMs: 60000, maxRequests: 1000 },
  catalog: { intervalMs: 60000, maxRequests: 100 },
  // ... etc
};
```

3. **Instantiate with new config:**
```typescript
const otherApiTraffic = new TrafficController(otherApiConfig, logger);
```

---

## Summary

The `bm-traffic-control` package provides:

✅ **Transactional reservation system** - Prevents 1 EUR trap  
✅ **Multi-bucket rate limiting** - Separate limits for different endpoint types  
✅ **Priority-based queuing** - Critical operations processed first  
✅ **Configuration-driven** - Reusable for other integrations  
✅ **Comprehensive logging** - Database tracking for monitoring  
✅ **Safe defaults** - Operates with 75% of hard limits as safety buffer  

This package ensures safe integration with the Back Market API while maintaining the ability to perform dynamic pricing operations without violating rate limits.


