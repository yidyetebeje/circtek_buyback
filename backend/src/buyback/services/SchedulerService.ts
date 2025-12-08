import { backMarketService } from "./backMarketService";
import { backMarketSyncServiceInstance } from "./backMarketSyncServiceInstance";
import { PricingRepository } from "../pricing/PricingRepository";
import { BuybackPricingService } from "./BuybackPricingService";

export class SchedulerService {
  private pricingRepo = new PricingRepository();
  private buybackPricingService = new BuybackPricingService();
  private intervals: Timer[] = [];
  private tasks: Record<string, () => Promise<void>> = {};
  private status: Record<string, { lastRun: Date | null, nextRun: Date | null, lastError: string | null, isRunning: boolean }> = {
    "Sync Orders": { lastRun: null, nextRun: null, lastError: null, isRunning: false },
    "Sync Listings": { lastRun: null, nextRun: null, lastError: null, isRunning: false },
    "Reprice Listings": { lastRun: null, nextRun: null, lastError: null, isRunning: false },
    "Sync Buyback Prices": { lastRun: null, nextRun: null, lastError: null, isRunning: false }
  };

  start() {
    console.log("Starting Back Market Scheduler...");

    // 1. Sync Orders every 15 minutes
    this.scheduleTask("Sync Orders", 15 * 60 * 1000, async () => {
      await backMarketSyncServiceInstance.syncOrders(false); // Incremental sync
    });

    // 2. Sync Listings every 1 hour
    this.scheduleTask("Sync Listings", 60 * 60 * 1000, async () => {
      await backMarketSyncServiceInstance.syncListings();
    });

    // 3. Reprice Listings every 15 minutes (more frequent to stay on top)
    this.scheduleTask("Reprice Listings", 15 * 60 * 1000, async () => {
      await this.runRepricingCycle();
    });

    // 4. Sync Buyback Prices every 1 hour
    this.scheduleTask("Sync Buyback Prices", 60 * 60 * 1000, async () => {
      await this.buybackPricingService.calculateAndSyncPrices();
    });
  }

  stop() {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    console.log("Stopped Back Market Scheduler.");
  }

  getStatus() {
    return this.status;
  }

  async triggerTask(name: string) {
    const task = this.tasks[name];
    if (!task) {
      throw new Error(`Task ${name} not found`);
    }
    
    if (this.status[name]?.isRunning) {
      throw new Error(`Task ${name} is already running`);
    }

    console.log(`[Scheduler] Manually triggering task: ${name}`);
    // Run in background so we don't block the request
    this.runTaskWrapper(name, task);
    return true;
  }

  async triggerAllTasks() {
    console.log(`[Scheduler] Manually triggering ALL tasks`);
    const results: Record<string, string> = {};
    
    for (const [name, task] of Object.entries(this.tasks)) {
        if (this.status[name]?.isRunning) {
            results[name] = "Skipped (Already Running)";
            continue;
        }
        this.runTaskWrapper(name, task);
        results[name] = "Triggered";
    }
    return results;
  }

  private scheduleTask(name: string, intervalMs: number, task: () => Promise<void>) {
    // Store task for manual triggering
    this.tasks[name] = task;

    // Run immediately on start? Maybe not, to avoid startup spike.
    // Let's run it after a small random delay to stagger them if they have same interval.
    const delay = Math.random() * 10000; 
    
    // Initialize status if missing
    if (!this.status[name]) {
        this.status[name] = { lastRun: null, nextRun: null, lastError: null, isRunning: false };
    }
    
    // Set initial nextRun
    this.status[name].nextRun = new Date(Date.now() + delay);

    setTimeout(() => {
      console.log(`[Scheduler] Running initial task: ${name}`);
      this.runTaskWrapper(name, task);
      
      // Set next run for the interval
      this.status[name].nextRun = new Date(Date.now() + intervalMs);

      const timer = setInterval(async () => {
        console.log(`[Scheduler] Running task: ${name}`);
        await this.runTaskWrapper(name, task);
        
        // Update nextRun for the NEXT interval
        this.status[name].nextRun = new Date(Date.now() + intervalMs);
      }, intervalMs);
      
      this.intervals.push(timer);
    }, delay);
  }

  private async runTaskWrapper(name: string, task: () => Promise<void>) {
    if (!this.status[name]) {
        this.status[name] = { lastRun: null, nextRun: null, lastError: null, isRunning: false };
    }
    
    this.status[name].isRunning = true;
    try {
      await task();
      this.status[name].lastRun = new Date();
      this.status[name].lastError = null;
    } catch (error: any) {
      console.error(`[Scheduler] Task ${name} failed:`, error);
      this.status[name].lastError = error.message || String(error);
    } finally {
      this.status[name].isRunning = false;
    }
  }

  private async runRepricingCycle() {
    const listings = await this.pricingRepo.getAllActiveListings();
    console.log(`[Scheduler] Starting repricing cycle for ${listings.length} listings.`);
    
    for (const listingId of listings) {
      // We don't await here to allow some parallelism? 
      // No, BackMarketService uses TrafficController which handles concurrency/rate limiting.
      // So we can just fire and forget, OR await to not flood the internal queue too fast.
      // TrafficController queue is in memory. If we push 2000 items instantly, it might be fine.
      // But let's await to be safe and not consume too much memory.
      await backMarketService.repriceListing(listingId);
    }
    console.log(`[Scheduler] Repricing cycle queued.`);
  }
}

export const schedulerService = new SchedulerService();
