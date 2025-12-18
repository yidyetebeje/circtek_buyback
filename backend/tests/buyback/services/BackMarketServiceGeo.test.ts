import { describe, test, expect, mock, beforeEach } from "bun:test";
import { BackMarketService } from "../../../src/buyback/services/backMarketService";
import { PricingRepository } from "../../../src/buyback/pricing/PricingRepository";
import { OutlierDetectionService } from "../../../src/buyback/pricing/OutlierDetectionService";
import { ProfitabilityConstraintService } from "../../../src/buyback/pricing/ProfitabilityConstraintService";
import { DynamicPricingEngine } from "../../../src/buyback/pricing/DynamicPricingEngine";
import { TrafficController, Priority } from "../../../src/lib/bm-traffic-control";

describe("BackMarketService Geo-Targeting", () => {
  let service: BackMarketService;
  let mockRepo: PricingRepository;
  let mockTraffic: TrafficController;

  beforeEach(() => {
    mockRepo = new PricingRepository();
    const mockODS = new OutlierDetectionService();
    const mockPFCS = new ProfitabilityConstraintService();
    const mockDPO = new DynamicPricingEngine();
    
    mockTraffic = new TrafficController({ 
      global: { maxRequests: 10, intervalMs: 1000 },
      catalog: { maxRequests: 10, intervalMs: 1000 },
      competitor: { maxRequests: 10, intervalMs: 1000 },
      care: { maxRequests: 10, intervalMs: 1000 }
    } as any);
    mockTraffic.scheduleRequest = mock(async () => new Response());

    service = new BackMarketService(mockTraffic, mockRepo, mockODS, mockPFCS, mockDPO);
  });

  test("should reprice for multiple countries with different costs", async () => {
    // Mock Listing
    (mockRepo as any).getListingDetails = mock(async () => ({
      listing_id: "LISTING-GEO",
      product_id: "PROD-GEO",
      sku: "SKU-GEO",
      title: "Test Product Geo",
      price: "200.00",
      currency: "EUR",
      quantity: 1,
      state: 1,
      grade: 1,
      publication_state: 1,
      synced_at: new Date()
    }));
    
    // Mock Acquisition Cost (Same for all countries)
    mockRepo.getAverageAcquisitionCost = mock(async () => 100);
    mockRepo.getSalesVelocity = mock(async () => 5);

    // Mock Parameters for FR (High Cost)
    // Floor = (100 + 20 + 10 + 5) / (1 - 0.1 - 0.15) = 135 / 0.75 = 180
    (mockRepo as any).getParameters = mock(async (sku, grade, country) => {
      if (country === "fr-fr") {
        return { 
          id: 1, sku: "SKU-GEO", grade: 1, country_code: "fr-fr", updated_at: new Date(),
          c_refurb: "20.00", c_op: "10.00", c_risk: "5.00", f_bm: "0.1000", m_target: "0.1500" 
        };
      }
      if (country === "de-de") {
        // Floor = (100 + 15 + 5 + 5) / (1 - 0.1 - 0.15) = 125 / 0.75 = 166.66
        return { 
          id: 2, sku: "SKU-GEO", grade: 1, country_code: "de-de", updated_at: new Date(),
          c_refurb: "15.00", c_op: "5.00", c_risk: "5.00", f_bm: "0.1000", m_target: "0.1500" 
        };
      }
      return null;
    });

    // Mock Competitors (Different per country)
    service.getCompetitors = mock(async (listingId, country) => {
      if (country === "fr-fr") return { competitors: [{ seller_id: 1, price: 200 }] }; // Target ~199
      if (country === "de-de") return { competitors: [{ seller_id: 2, price: 180 }] }; // Target ~179
      return { competitors: [] };
    });

    // Mock Active Countries for this listing
    // We need to add this method to PricingRepository
    (mockRepo as any).getActiveCountries = mock(async () => ["fr-fr", "de-de"]);

    // Mock Update Price
    service.updatePrice = mock(async () => new Response());

    await service.repriceListing("LISTING-GEO");

    // Verify updates
    const updateCalls = (service.updatePrice as any).mock.calls;
    expect(updateCalls.length).toBe(2);

    // Check FR update
    const frCall = updateCalls.find((c: any[]) => c[3] === "fr-fr"); // Assuming we add country param
    // We haven't updated the signature yet, so this test will fail or need adjustment.
    // Let's assume we will update updatePrice to take countryCode as 4th arg or in data.
    
    // For now, let's just check that it was called twice.
    // And we can check the price values if we mock DPO correctly or use real one.
    // Using real DPO logic (mocked in beforeEach? No, real one is instantiated in beforeEach but we didn't mock methods)
    // Wait, in beforeEach I passed real DPO but didn't mock its methods.
    // The DPO logic is: target = lowest_competitor - 0.01 (simplified)
    // FR: 200 - 0.01 = 199.99. Floor 180. Result 199.99.
    // DE: 180 - 0.01 = 179.99. Floor 166.66. Result 179.99.
    
    // Actually I should mock DPO to be sure of values
    // But let's trust the logic if I don't mock it.
    // Wait, I passed `mockDPO` which is a new instance.
    // I should mock `calculatePrice` to return predictable values.
    (service as any).dpo.calculatePrice = mock((prices, floor) => {
        const min = Math.min(...prices);
        const target = min - 0.01;
        return { 
          targetPrice: Math.max(target, floor), 
          isFloorConstrained: target < floor,
          buyBoxFloor: floor
        };
    });

    // Re-run
    await service.repriceListing("LISTING-GEO");
    
    const calls = (service.updatePrice as any).mock.calls;
    // We expect calls to be: (listingId, price, priority, countryCode)
    
    // FR
    expect(calls.some((c: any[]) => Math.abs(c[1] - 199.99) < 0.1)).toBe(true);
    
    // DE
    expect(calls.some((c: any[]) => Math.abs(c[1] - 179.99) < 0.1)).toBe(true);
  });
});
