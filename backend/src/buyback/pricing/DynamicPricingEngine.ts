export interface PricingStrategy {
  type: 'UNDERCUT_LOWEST' | 'MATCH_LOWEST' | 'OVERCUT_HIGHEST';
  amount: number; // e.g., 0.01 for undercut, 1.00 for overcut
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
   * @param ceilingPrice The absolute maximum price (optional, for Buyback)
   */
  calculatePrice(
    competitorPrices: number[], 
    floorPrice: number, 
    strategy: PricingStrategy = { type: 'UNDERCUT_LOWEST', amount: 0.01 },
    ceilingPrice?: number
  ): PricingResult {
    
    // Default result if no competitors
    if (!competitorPrices || competitorPrices.length === 0) {
      // If no competitors, use the floor price (Minimum offer)
      return {
        targetPrice: floorPrice,
        isFloorConstrained: true,
        buyBoxFloor: floorPrice
      };
    }

    // Find lowest and highest competitor price
    const lowestCompetitorPrice = Math.min(...competitorPrices);
    const highestCompetitorPrice = Math.max(...competitorPrices);

    // Calculate target based on strategy
    let calculatedTarget = lowestCompetitorPrice;
    
    if (strategy.type === 'UNDERCUT_LOWEST') {
      calculatedTarget = lowestCompetitorPrice - strategy.amount;
    } else if (strategy.type === 'MATCH_LOWEST') {
      calculatedTarget = lowestCompetitorPrice;
    } else if (strategy.type === 'OVERCUT_HIGHEST') {
      calculatedTarget = highestCompetitorPrice + strategy.amount;
    }

    // Handle floating point precision issues
    calculatedTarget = Math.round(calculatedTarget * 100) / 100;

    let finalPrice = calculatedTarget;
    let isConstrained = false;

    // Enforce Floor Constraint (Minimum Price)
    if (finalPrice < floorPrice) {
      finalPrice = floorPrice;
      isConstrained = true;
    }

    // Enforce Ceiling Constraint (Maximum Price)
    if (ceilingPrice !== undefined && finalPrice > ceilingPrice) {
        finalPrice = ceilingPrice;
        isConstrained = true;
    }

    return {
      targetPrice: finalPrice,
      isFloorConstrained: isConstrained,
      buyBoxFloor: floorPrice
    };
  }
}
