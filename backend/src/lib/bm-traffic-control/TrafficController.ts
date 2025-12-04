import { TokenBucket } from './TokenBucket';
import { RequestQueue, QueueItem } from './RequestQueue';
import { RateLimitConfig, Priority, BucketConfig } from './types';
import { BucketType, getBucketTypeForUrl } from './definitions';

interface PendingRequest {
  url: string;
  options: RequestInit;
  priority: Priority;
  cost: number;
  resolve: (value: Response | PromiseLike<Response>) => void;
  reject: (reason?: any) => void;
  retries: number;
}

export class TrafficController {
  private buckets: Map<BucketType, TokenBucket>;
  private queues: Map<BucketType, RequestQueue<PendingRequest>>;
  private processing: Map<BucketType, boolean>;
  private logger?: (log: any) => Promise<void>;

  constructor(config: RateLimitConfig, logger?: (log: any) => Promise<void>) {
    this.buckets = new Map();
    this.queues = new Map();
    this.processing = new Map();
    this.logger = logger;

    this.initializeBucket(BucketType.GLOBAL, config.global);
    this.initializeBucket(BucketType.CATALOG, config.catalog);
    this.initializeBucket(BucketType.COMPETITOR, config.competitor);
    this.initializeBucket(BucketType.CARE, config.care);
  }

  public updateConfig(config: RateLimitConfig) {
    this.updateBucket(BucketType.GLOBAL, config.global);
    this.updateBucket(BucketType.CATALOG, config.catalog);
    this.updateBucket(BucketType.COMPETITOR, config.competitor);
    this.updateBucket(BucketType.CARE, config.care);
  }

  private updateBucket(type: BucketType, config: BucketConfig) {
    const bucket = this.buckets.get(type);
    if (bucket) {
      bucket.updateConfig(config.maxRequests, config.intervalMs);
    } else {
      this.initializeBucket(type, config);
    }
  }

  private initializeBucket(type: BucketType, config: BucketConfig) {
    this.buckets.set(type, new TokenBucket(config.maxRequests, config.intervalMs));
    this.queues.set(type, new RequestQueue<PendingRequest>());
    this.processing.set(type, false);
  }

  public async scheduleRequest(
    url: string,
    options: RequestInit = {},
    priority: Priority = Priority.NORMAL,
    cost: number = 1
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const type = getBucketTypeForUrl(url);
      const queue = this.queues.get(type);

      if (!queue) {
        reject(new Error(`No bucket found for type ${type}`));
        return;
      }

      queue.enqueue({
        url,
        options,
        priority,
        cost,
        resolve,
        reject,
        retries: 0
      }, priority);

      this.processQueue(type);
    });
  }

  private async processQueue(type: BucketType) {
    if (this.processing.get(type)) return;
    this.processing.set(type, true);

    const queue = this.queues.get(type);
    const bucket = this.buckets.get(type);
    const globalBucket = this.buckets.get(BucketType.GLOBAL);

    if (!queue || !bucket || !globalBucket) {
      this.processing.set(type, false);
      return;
    }

    while (queue.size() > 0) {
      const item = queue.peek();
      if (!item) break;

      const { cost, priority } = item.item;

      // Check Global Limit first
      if (!globalBucket.canSpend(cost)) {
        await Bun.sleep(100); // Wait a bit and retry
        continue;
      }

      // Check Specific Limit
      // For CRITICAL priority, we might bypass reservation checks if implemented,
      // but for now we stick to standard token availability.
      // If we wanted to bypass, we'd need a way to force spend.
      
      if (!bucket.canSpend(cost)) {
        await Bun.sleep(100); // Wait a bit and retry
        continue;
      }

      // If we can spend, dequeue and execute
      const request = queue.dequeue();
      if (request) {
        // Spend tokens
        globalBucket.spend(cost);
        bucket.spend(cost);

        this.executeRequest(request.item, type);
      }
    }

    this.processing.set(type, false);
  }

  private async executeRequest(request: PendingRequest, type: BucketType) {
    const { url, options, resolve, reject, priority, retries } = request;
    const startTime = Date.now();

    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // Rate Limited
        if (retries < 3) {
          // Log 429
          if (this.logger) {
            await this.logger({
              endpoint: url,
              priority,
              status: '429_HIT',
              responseStatus: 429,
              timestamp: new Date(),
              duration: Date.now() - startTime
            });
          }

          // Re-queue with higher priority or same?
          // Let's put it back at the front (conceptually) or just retry after delay.
          // Simple retry: wait and re-enqueue
          const retryDelay = 1000 * Math.pow(2, retries + 1); // Exponential backoff
          await Bun.sleep(retryDelay);
          
          const queue = this.queues.get(type);
          if (queue) {
             // Re-enqueue with incremented retry count
             queue.enqueue({ ...request, retries: retries + 1 }, priority);
             this.processQueue(type);
          }
          return;
        }
      }

      // Log success
      if (this.logger) {
        await this.logger({
          endpoint: url,
          priority,
          status: 'EXECUTED',
          responseStatus: response.status,
          timestamp: new Date(),
          duration: Date.now() - startTime
        });
      }

      resolve(response);

    } catch (error) {
      if (this.logger) {
        await this.logger({
          endpoint: url,
          priority,
          status: 'ERROR',
          timestamp: new Date(),
          duration: Date.now() - startTime
        });
      }
      reject(error);
    }
  }
}
