import { describe, test, expect, mock } from "bun:test";
import { BackMarketService } from "../../../src/buyback/services/backMarketService";
import { PricingRepository } from "../../../src/buyback/pricing/PricingRepository";
import { OutlierDetectionService } from "../../../src/buyback/pricing/OutlierDetectionService";
import { ProfitabilityConstraintService } from "../../../src/buyback/pricing/ProfitabilityConstraintService";
import { DynamicPricingEngine } from "../../../src/buyback/pricing/DynamicPricingEngine";
import { TrafficController, Priority } from "../../../src/lib/bm-traffic-control";

describe("BackMarketService Priority Logic", () => {
  test("should use HIGH priority for high margin and high velocity", async () => {
    const mockRepo = new PricingRepository();
    (mockRepo as any).getListingDetails = mock(async () => ({
      listing_id: "LISTING-1",
      product_id: "PROD-1",
      sku: "SKU1",
      title: "Test Product",
      price: "200.00",
      currency: "EUR",
      quantity: 1,
      state: 1,
      grade: 1,
      publication_state: 1,
      synced_at: new Date()
    }));
    (mockRepo as any).getParameters = mock(async () => ({ 
      id: 1,
      sku: "SKU1",
      grade: 1,
      country_code: "fr-fr",
      c_refurb: "10.00", 
      c_op: "5.00", 
      c_risk: "5.00", 
      f_bm: "0.1000", 
      m_target: "0.1000",
      updated_at: new Date()
    }));
    mockRepo.getAverageAcquisitionCost = mock(async () => 100);
    mockRepo.getSalesVelocity = mock(async () => 20); // High Velocity
    (mockRepo as any).getActiveCountries = mock(async () => ["fr-fr"]);

    const mockODS = new OutlierDetectionService();
    mockODS.filterPrices = mock(() => [{ 
      competitorId: "COMP-1", 
      price: 200, 
      updatedAt: new Date(), 
      feedbackCount: 100 
    }]);

    const mockPFCS = new ProfitabilityConstraintService();
    mockPFCS.calculateFloorPrice = mock(() => 150);

    const mockDPO = new DynamicPricingEngine();
    mockDPO.calculatePrice = mock(() => ({ 
      targetPrice: 200, 
      isFloorConstrained: false, 
      buyBoxFloor: 150 
    })); // Margin = (200-150)/200 = 0.25 (> 0.2)

    const mockTraffic = new TrafficController({ 
      global: { maxRequests: 10, intervalMs: 1000 },
      catalog: { maxRequests: 10, intervalMs: 1000 },
      competitor: { maxRequests: 10, intervalMs: 1000 },
      care: { maxRequests: 10, intervalMs: 1000 }
    } as any);
    mockTraffic.scheduleRequest = mock(async () => new Response());

    const service = new BackMarketService(mockTraffic, mockRepo, mockODS, mockPFCS, mockDPO);
    
    // We need to mock getCompetitors as well since it's called in repriceListing
    service.getCompetitors = mock(async () => ({ competitors: [{ seller_id: 1, price: 200 }] }));
    
    await service.repriceListing("LISTING-1");

    // Verify scheduleRequest was called with HIGH priority
    const calls = (mockTraffic.scheduleRequest as any).mock.calls;
    // Find the call that updates the listing (POST)
    const updateCall = calls.find((c: any[]) => c[0].includes("/ws/listings/LISTING-1") && c[1].method === "POST");
    
    expect(updateCall).toBeDefined();
    expect(updateCall[2]).toBe(Priority.HIGH);
  });

  test("should use LOW priority for low velocity", async () => {
    const mockRepo = new PricingRepository();
    (mockRepo as any).getListingDetails = mock(async () => ({
      listing_id: "LISTING-2",
      product_id: "PROD-2",
      sku: "SKU2",
      title: "Test Product 2",
      price: "200.00",
      currency: "EUR",
      quantity: 1,
      state: 1,
      grade: 1,
      publication_state: 1,
      synced_at: new Date()
    }));
    (mockRepo as any).getParameters = mock(async () => ({ 
      id: 2,
      sku: "SKU2",
      grade: 1,
      country_code: "fr-fr",
      c_refurb: "10.00", 
      c_op: "5.00", 
      c_risk: "5.00", 
      f_bm: "0.1000", 
      m_target: "0.1000",
      updated_at: new Date()
    }));
    mockRepo.getAverageAcquisitionCost = mock(async () => 100);
    mockRepo.getSalesVelocity = mock(async () => 0); // Low Velocity
    (mockRepo as any).getActiveCountries = mock(async () => ["fr-fr"]);

    const mockODS = new OutlierDetectionService();
    mockODS.filterPrices = mock(() => [{ 
      competitorId: "COMP-1", 
      price: 200, 
      updatedAt: new Date(), 
      feedbackCount: 100 
    }]);

    const mockPFCS = new ProfitabilityConstraintService();
    mockPFCS.calculateFloorPrice = mock(() => 150);

    const mockDPO = new DynamicPricingEngine();
    mockDPO.calculatePrice = mock(() => ({ 
      targetPrice: 200, 
      isFloorConstrained: false, 
      buyBoxFloor: 150 
    })); 

    const mockTraffic = new TrafficController({ 
      global: { maxRequests: 10, intervalMs: 1000 },
      catalog: { maxRequests: 10, intervalMs: 1000 },
      competitor: { maxRequests: 10, intervalMs: 1000 },
      care: { maxRequests: 10, intervalMs: 1000 }
    } as any);
    mockTraffic.scheduleRequest = mock(async () => new Response());

    const service = new BackMarketService(mockTraffic, mockRepo, mockODS, mockPFCS, mockDPO);
    service.getCompetitors = mock(async () => ({ competitors: [{ seller_id: 1, price: 200 }] }));
    
    await service.repriceListing("LISTING-2");

    const calls = (mockTraffic.scheduleRequest as any).mock.calls;
    const updateCall = calls.find((c: any[]) => c[0].includes("/ws/listings/LISTING-2") && c[1].method === "POST");
    
    expect(updateCall).toBeDefined();
    expect(updateCall[2]).toBe(Priority.LOW);
  });
});
