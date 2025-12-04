export interface PricingStrategy {
  type: 'UNDERCUT_LOWEST' | 'MATCH_LOWEST';
  amount: number; // e.g., 0.01 for undercut
}

export interface PricingResult {
  targetPrice: number;
  isFloorConstrained: boolean;
  buyBoxFloor: number; // The floor price sent to BM
}

export class DynamicPricingEngine {
  /**
   * Calculates the optimal price.
   * @param competitorPrices List of valid competitor prices (numbers)
   * @param floorPrice The absolute minimum price (P_Floor_A)
   * @param strategy The repricing strategy
   */
  calculatePrice(
    competitorPrices: number[], 
    floorPrice: number, 
    strategy: PricingStrategy = { type: 'UNDERCUT_LOWEST', amount: 0.01 }
  ): PricingResult {
    
    // Default result if no competitors
    if (!competitorPrices || competitorPrices.length === 0) {
      // Strategy for Blue Ocean: Maximize margin? Or stick to floor?
      // For safety and simplicity based on tests: return floor (or floor + margin if defined later)
      // The test expects >= floor.
      return {
        targetPrice: floorPrice,
        isFloorConstrained: true, // Technically constrained by lack of competition + floor
        buyBoxFloor: floorPrice
      };
    }

    // Find lowest competitor price
    const lowestCompetitorPrice = Math.min(...competitorPrices);

    // Calculate target based on strategy
    let calculatedTarget = lowestCompetitorPrice;
    
    if (strategy.type === 'UNDERCUT_LOWEST') {
      calculatedTarget = lowestCompetitorPrice - strategy.amount;
    } else if (strategy.type === 'MATCH_LOWEST') {
      calculatedTarget = lowestCompetitorPrice;
    }

    // Handle floating point precision issues (e.g. 10.03 - 0.01 = 10.019999)
    calculatedTarget = Math.round(calculatedTarget * 100) / 100;

    // Enforce Floor Constraint
    let finalPrice = calculatedTarget;
    let isConstrained = false;

    if (calculatedTarget < floorPrice) {
      finalPrice = floorPrice;
      isConstrained = true;
    }

    // Ensure we don't accidentally go below floor due to rounding
    if (finalPrice < floorPrice) {
        finalPrice = floorPrice;
        isConstrained = true;
    }

    return {
      targetPrice: finalPrice,
      isFloorConstrained: isConstrained,
      buyBoxFloor: floorPrice
    };
  }
}
