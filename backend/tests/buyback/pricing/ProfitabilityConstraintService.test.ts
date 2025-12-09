import { describe, test, expect, beforeEach } from "bun:test";
import { ProfitabilityConstraintService, type CostComponents, type MarketParams } from "../../../src/buyback/pricing/ProfitabilityConstraintService";

// ------------------------------------------------------------------
// Test Suite
// ------------------------------------------------------------------

describe("ProfitabilityConstraintService (PFCS)", () => {
  let service: ProfitabilityConstraintService;

  beforeEach(() => {
    service = new ProfitabilityConstraintService();
  });

  test("should calculate P_Floor_A correctly for standard inputs", () => {
    // Scenario from architectural doc:
    // P_Floor_A = (C_Acq + C_Refurb + C_Op + C_Risk) / (1 - F_BM - M_Target)
    
    const costs: CostComponents = {
      acquisitionCost: 100,
      refurbishmentCost: 20,
      operationalCost: 10,
      warrantyRiskCost: 5
    };
    // Total Costs = 135

    const params: MarketParams = {
      backMarketFeeRate: 0.10, // 10%
      targetMarginRate: 0.15   // 15%
    };
    // Denominator = 1 - 0.10 - 0.15 = 0.75

    // Expected Floor = 135 / 0.75 = 180
    const floorPrice = service.calculateFloorPrice(costs, params);
    
    expect(floorPrice).toBe(180);
  });

  test("should handle zero operational and risk costs", () => {
    const costs: CostComponents = {
      acquisitionCost: 50,
      refurbishmentCost: 0,
      operationalCost: 0,
      warrantyRiskCost: 0
    };
    // Total Costs = 50

    const params: MarketParams = {
      backMarketFeeRate: 0.10,
      targetMarginRate: 0.40
    };
    // Denominator = 1 - 0.10 - 0.40 = 0.50

    // Expected Floor = 50 / 0.50 = 100
    const floorPrice = service.calculateFloorPrice(costs, params);
    
    expect(floorPrice).toBe(100);
  });

  test("should throw error if target margin + fees >= 100%", () => {
    const costs: CostComponents = {
      acquisitionCost: 100,
      refurbishmentCost: 10,
      operationalCost: 10,
      warrantyRiskCost: 10
    };

    const params: MarketParams = {
      backMarketFeeRate: 0.20,
      targetMarginRate: 0.80 // Total 1.0 -> Division by zero
    };

    expect(() => {
      service.calculateFloorPrice(costs, params);
    }).toThrow(); // Should throw error about invalid margin parameters
  });

  test("should handle floating point precision correctly (rounding up to 2 decimals)", () => {
    // Real world numbers often result in long decimals
    const costs: CostComponents = {
      acquisitionCost: 33.33,
      refurbishmentCost: 10.50,
      operationalCost: 5.25,
      warrantyRiskCost: 2.15
    };
    // Total = 51.23

    const params: MarketParams = {
      backMarketFeeRate: 0.10,
      targetMarginRate: 0.15
    };
    // Denominator = 0.75

    // Raw Result = 51.23 / 0.75 = 68.30666...
    // Should round UP to ensure margin is covered, or at least standard rounding.
    // Let's assume standard rounding to 2 decimals for currency.
    
    const floorPrice = service.calculateFloorPrice(costs, params);
    
    expect(floorPrice).toBeCloseTo(68.31, 2);
  });

  test("should reflect higher floor for higher risk grades (Grade C vs Grade A)", () => {
    // Grade A
    const costsA: CostComponents = {
      acquisitionCost: 200,
      refurbishmentCost: 10,
      operationalCost: 10,
      warrantyRiskCost: 5 // Low risk
    };

    // Grade C
    const costsC: CostComponents = {
      acquisitionCost: 150, // Cheaper to buy
      refurbishmentCost: 40, // More expensive to fix
      operationalCost: 10,
      warrantyRiskCost: 20 // Higher risk of return
    };

    const params: MarketParams = {
      backMarketFeeRate: 0.10,
      targetMarginRate: 0.20
    };
    // Denominator = 0.7

    const floorA = service.calculateFloorPrice(costsA, params); // (225) / 0.7 = 321.43
    const floorC = service.calculateFloorPrice(costsC, params); // (220) / 0.7 = 314.28

    // Even though Grade C was bought much cheaper (50 diff), the high refurb and risk costs narrow the gap.
    expect(floorA).toBeGreaterThan(floorC);
    expect(floorC).toBeCloseTo(314.29, 2);
  });
});
