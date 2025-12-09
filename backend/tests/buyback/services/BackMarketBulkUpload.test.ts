import { describe, expect, test, mock, beforeEach } from "bun:test";
import { BackMarketService } from "../../../src/buyback/services/backMarketService";
import { TrafficController, Priority } from "../../../src/lib/bm-traffic-control";

// Mock TrafficController
const mockScheduleRequest = mock(() => Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 })));

mock.module("../../../src/lib/bm-traffic-control", () => {
  return {
    TrafficController: class {
      scheduleRequest = mockScheduleRequest;
      updateConfig = mock(() => {});
    },
    Priority: {
      CRITICAL: 0,
      HIGH: 1,
      NORMAL: 2,
      LOW: 3
    }
  };
});

describe("BackMarketService - Bulk Upload", () => {
  let service: BackMarketService;

  beforeEach(() => {
    mockScheduleRequest.mockClear();
    // Initialize service with mocked TrafficController
    service = new BackMarketService(new TrafficController({} as any, async () => {}));
  });

  test("should upload bulk CSV with correct headers and endpoint", async () => {
    const csvContent = "sku,price,quantity\nSKU123,100,10\nSKU456,200,5";
    
    await service.uploadBulkCsv(csvContent);

    expect(mockScheduleRequest).toHaveBeenCalledTimes(1);
    
    const [url, options, priority] = mockScheduleRequest.mock.calls[0] as any;
    
    // Verify URL
    expect(url).toContain("/ws/listings/bulk");
    
    // Verify Method
    expect(options.method).toBe("POST");
    
    // Verify Headers
    expect(options.headers["Content-Type"]).toBe("text/csv");
    expect(options.headers["Authorization"]).toBeDefined();
    
    // Verify Body
    expect(options.body).toBe(csvContent);
    
    // Verify Priority (Should be LOW by default for bulk ops to not block repricing)
    expect(priority).toBe(Priority.LOW);
  });
});
