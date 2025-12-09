import { describe, test, expect, beforeEach } from "bun:test";
import { OutlierDetectionService, type CompetitorPricePoint } from "../../../src/buyback/pricing/OutlierDetectionService";

// ------------------------------------------------------------------
// Test Suite
// ------------------------------------------------------------------

describe("OutlierDetectionService (ODS)", () => {
  let service: OutlierDetectionService;

  beforeEach(() => {
    service = new OutlierDetectionService();
  });

  test("should filter out stale data older than maxAgeHours", () => {
    const now = new Date();
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const sevenHoursAgo = new Date(now.getTime() - 7 * 60 * 60 * 1000);

    const prices: CompetitorPricePoint[] = [
      { competitorId: "A", price: 100, updatedAt: now, feedbackCount: 100 },
      { competitorId: "B", price: 101, updatedAt: fiveHoursAgo, feedbackCount: 50 },
      { competitorId: "C", price: 99, updatedAt: sevenHoursAgo, feedbackCount: 200 }, // Stale
    ];

    const result = service.filterPrices(prices, 6);

    expect(result).toHaveLength(2);
    expect(result.find(p => p.competitorId === "C")).toBeUndefined();
  });

  test("should detect and remove low-price outliers (Data Poisoning / Error)", () => {
    // Scenario: Competitors are around 200, one drops to 50.
    const now = new Date();
    const prices: CompetitorPricePoint[] = [
      { competitorId: "A", price: 200, updatedAt: now, feedbackCount: 100 },
      { competitorId: "B", price: 198, updatedAt: now, feedbackCount: 150 },
      { competitorId: "C", price: 202, updatedAt: now, feedbackCount: 80 },
      { competitorId: "D", price: 195, updatedAt: now, feedbackCount: 120 },
      { competitorId: "E", price: 50, updatedAt: now, feedbackCount: 10 }, // Outlier
    ];

    const result = service.filterPrices(prices);

    expect(result).toHaveLength(4);
    expect(result.find(p => p.competitorId === "E")).toBeUndefined();
  });

  test("should detect and remove high-price outliers (irrelevant for Buy Box but good for data hygiene)", () => {
    const now = new Date();
    const prices: CompetitorPricePoint[] = [
      { competitorId: "A", price: 100, updatedAt: now, feedbackCount: 100 },
      { competitorId: "B", price: 102, updatedAt: now, feedbackCount: 100 },
      { competitorId: "C", price: 500, updatedAt: now, feedbackCount: 100 }, // Outlier
    ];

    const result = service.filterPrices(prices);

    expect(result).toHaveLength(2);
    expect(result.find(p => p.competitorId === "C")).toBeUndefined();
  });

  test("should return all prices if they are within a reasonable range (Cluster)", () => {
    const now = new Date();
    const prices: CompetitorPricePoint[] = [
      { competitorId: "A", price: 100, updatedAt: now, feedbackCount: 100 },
      { competitorId: "B", price: 95, updatedAt: now, feedbackCount: 100 },
      { competitorId: "C", price: 105, updatedAt: now, feedbackCount: 100 },
    ];

    const result = service.filterPrices(prices);

    expect(result).toHaveLength(3);
  });

  test("should handle empty or single-item lists gracefully", () => {
    const now = new Date();
    const empty: CompetitorPricePoint[] = [];
    const single: CompetitorPricePoint[] = [
      { competitorId: "A", price: 100, updatedAt: now, feedbackCount: 100 }
    ];

    expect(service.filterPrices(empty)).toHaveLength(0);
    expect(service.filterPrices(single)).toHaveLength(1);
  });
});
