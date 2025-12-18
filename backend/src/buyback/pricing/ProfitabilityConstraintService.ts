export interface CostComponents {
  acquisitionCost: number;    // C_Acq
  refurbishmentCost: number;  // C_Refurb
  operationalCost: number;    // C_Op
  warrantyRiskCost: number;   // C_Risk
}

export interface MarketParams {
  backMarketFeeRate: number;  // F_BM (e.g., 0.10 for 10%)
  targetMarginRate: number;   // M_Target (e.g., 0.15 for 15%)
}

export class ProfitabilityConstraintService {
  /**
   * Calculates the Absolute Price Floor (P_Floor_A)
   * Formula: P_Floor_A = (C_Acq + C_Refurb + C_Op + C_Risk) / (1 - F_BM - M_Target)
   */
  calculateFloorPrice(costs: CostComponents, params: MarketParams): number {
    const totalCosts = 
      costs.acquisitionCost + 
      costs.refurbishmentCost + 
      costs.operationalCost + 
      costs.warrantyRiskCost;

    const revenueShare = 1 - params.backMarketFeeRate - params.targetMarginRate;

    if (revenueShare <= 0) {
      throw new Error("Invalid market parameters: Fees and Target Margin exceed 100% of price.");
    }

    const floorPrice = totalCosts / revenueShare;

    // Round up to 2 decimal places to ensure margin coverage
    return Math.ceil(floorPrice * 100) / 100;
  }
}
