import { describe, test, expect, mock, beforeEach } from "bun:test";
import { BackMarketSyncService } from "../../../src/buyback/services/backMarketSyncService";
import { BackMarketService } from "../../../src/buyback/services/backMarketService";

// Mock database calls
mock.module("drizzle-orm/mysql2", () => ({
  drizzle: () => ({
    insert: () => ({
      values: () => ({
        onDuplicateKeyUpdate: async () => {}
      })
    }),
    select: () => ({
      from: () => ({
        limit: () => ({
          offset: async () => []
        })
      })
    })
  })
}));

describe("BackMarketSyncService Webhook", () => {
  let syncService: BackMarketSyncService;
  let mockApiService: BackMarketService;

  beforeEach(() => {
    mockApiService = new BackMarketService();
    syncService = new BackMarketSyncService(mockApiService);
  });

  test("should handle order.created webhook", async () => {
    const payload = { order_id: "12345" };
    
    // Mock API response
    mockApiService.getBuyBackOrder = mock(async () => new Response(JSON.stringify({
      order_id: 12345,
      creation_date: new Date().toISOString(),
      modification_date: new Date().toISOString(),
      status: "PENDING",
      currency: "EUR",
      lines: []
    })));

    await syncService.handleWebhook("order.created", payload);

    expect(mockApiService.getBuyBackOrder).toHaveBeenCalledWith("12345", 1);
  });

  test("should handle listing.updated webhook", async () => {
    const payload = { listing_id: "LISTING-1" };
    
    // Mock API response
    mockApiService.getListing = mock(async () => new Response(JSON.stringify({
      listing_id: "LISTING-1",
      price: 100,
      quantity: 10
    })));

    await syncService.handleWebhook("listing.updated", payload);

    expect(mockApiService.getListing).toHaveBeenCalledWith("LISTING-1", 1);
  });
});
