import { describe, test, expect, beforeEach } from "bun:test";
import { DynamicPricingEngine, type PricingStrategy, type PricingResult } from "../../../src/buyback/pricing/DynamicPricingEngine";

// ------------------------------------------------------------------
// Test Suite
// ------------------------------------------------------------------

describe("DynamicPricingEngine (DPO)", () => {
  let engine: DynamicPricingEngine;

  beforeEach(() => {
    engine = new DynamicPricingEngine();
  });

  test("should undercut the lowest competitor by strategy amount when above floor", () => {
    const competitors = [200, 205, 195]; // Lowest is 195
    const floor = 180;
    const strategy: PricingStrategy = { type: 'UNDERCUT_LOWEST', amount: 0.01 };

    const result = engine.calculatePrice(competitors, floor, strategy);

    expect(result.targetPrice).toBe(194.99); // 195 - 0.01
    expect(result.isFloorConstrained).toBe(false);
    expect(result.buyBoxFloor).toBe(floor);
  });

  test("should enforce floor price when undercut would violate it", () => {
    const competitors = [180.05, 190]; // Lowest is 180.05
    const floor = 180.05; // Floor is exactly the lowest
    const strategy: PricingStrategy = { type: 'UNDERCUT_LOWEST', amount: 0.01 };

    // Desired: 180.04. Floor: 180.05.
    // Should stick to floor.
    const result = engine.calculatePrice(competitors, floor, strategy);

    expect(result.targetPrice).toBe(180.05);
    expect(result.isFloorConstrained).toBe(true);
  });

  test("should enforce floor price when competitors are already below floor", () => {
    const competitors = [170, 175]; // Market has crashed below our costs
    const floor = 180;

    const result = engine.calculatePrice(competitors, floor);

    expect(result.targetPrice).toBe(180); // We do not follow them down
    expect(result.isFloorConstrained).toBe(true);
  });

  test("should handle no competitors (Blue Ocean)", () => {
    const competitors: number[] = [];
    const floor = 150;
    
    // Strategy for no competitors is undefined in basic spec, 
    // but usually we want to maximize margin or set a default markup.
    // For this test, let's assume it sets a "Max Price" or just Floor + Margin.
    // Or simply returns Floor if no other logic exists (safest).
    // Let's assume the requirement is to hold price or set to a default high.
    // If the doc doesn't specify, let's assume it returns floor * 1.2 (20% markup) or similar,
    // OR simply returns the floor if that's the only constraint known.
    // Let's assume for now it returns the floor to be safe, or we can update this test later.
    // Actually, usually you want to sell high.
    // Let's expect it to be >= floor.
    
    const result = engine.calculatePrice(competitors, floor);
    expect(result.targetPrice).toBeGreaterThanOrEqual(floor);
  });

  test("should always include the buyBoxFloor in the result for API transmission", () => {
    const competitors = [200];
    const floor = 150;
    
    const result = engine.calculatePrice(competitors, floor);
    
    expect(result.buyBoxFloor).toBe(150);
  });

  test("should handle floating point precision in subtraction", () => {
    const competitors = [10.03];
    const floor = 5;
    const strategy: PricingStrategy = { type: 'UNDERCUT_LOWEST', amount: 0.01 };
    
    const result = engine.calculatePrice(competitors, floor, strategy);
    
    // 10.03 - 0.01 = 10.02. JS sometimes gives 10.019999999
    expect(result.targetPrice).toBe(10.02);
  });
});
