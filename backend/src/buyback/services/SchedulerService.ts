import { backMarketService } from "./backMarketService";
import { backMarketSyncServiceInstance } from "./backMarketSyncServiceInstance";
import { PricingRepository } from "../pricing/PricingRepository";

export class SchedulerService {
  private pricingRepo = new PricingRepository();
  private intervals: Timer[] = [];
  private status: Record<string, { lastRun: Date | null, lastError: string | null, isRunning: boolean }> = {
    "Sync Orders": { lastRun: null, lastError: null, isRunning: false },
    "Sync Listings": { lastRun: null, lastError: null, isRunning: false },
    "Reprice Listings": { lastRun: null, lastError: null, isRunning: false }
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

    // 3. Reprice Listings every 1 hour
    this.scheduleTask("Reprice Listings", 60 * 60 * 1000, async () => {
      await this.runRepricingCycle();
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

  private scheduleTask(name: string, intervalMs: number, task: () => Promise<void>) {
    // Run immediately on start? Maybe not, to avoid startup spike.
    // Let's run it after a small random delay to stagger them if they have same interval.
    const delay = Math.random() * 10000; 
    
    setTimeout(() => {
      console.log(`[Scheduler] Running initial task: ${name}`);
      this.runTaskWrapper(name, task);
      
      const timer = setInterval(async () => {
        console.log(`[Scheduler] Running task: ${name}`);
        await this.runTaskWrapper(name, task);
      }, intervalMs);
      
      this.intervals.push(timer);
    }, delay);
  }

  private async runTaskWrapper(name: string, task: () => Promise<void>) {
    if (!this.status[name]) {
        this.status[name] = { lastRun: null, lastError: null, isRunning: false };
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
