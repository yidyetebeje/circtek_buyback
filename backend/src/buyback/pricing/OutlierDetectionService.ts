export interface CompetitorPricePoint {
  competitorId: string;
  price: number;
  updatedAt: Date;
  feedbackCount: number;
}

export class OutlierDetectionService {
  /**
   * Filters out stale data and statistical outliers.
   * @param prices List of competitor prices
   * @param maxAgeHours Maximum age of data in hours (e.g., 6)
   */
  filterPrices(prices: CompetitorPricePoint[], maxAgeHours: number = 6): CompetitorPricePoint[] {
    if (!prices || prices.length === 0) {
      return [];
    }

    const now = new Date();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    // 1. Filter Stale Data
    let validPrices = prices.filter(p => {
      const age = now.getTime() - new Date(p.updatedAt).getTime();
      return age <= maxAgeMs;
    });

    if (validPrices.length < 3) {
      // Not enough data for statistical outlier detection, return as is (or maybe just stale filtered)
      return validPrices;
    }

    // 2. Statistical Outlier Detection (MAD Method - Median Absolute Deviation)
    // MAD is more robust for small sample sizes than IQR
    const priceValues = validPrices.map(p => p.price).sort((a, b) => a - b);
    const median = this.getMedian(priceValues);

    // Calculate deviations
    const deviations = priceValues.map(p => Math.abs(p - median)).sort((a, b) => a - b);
    const mad = this.getMedian(deviations);

    // Ensure a minimum MAD to prevent division by zero or over-filtering in tight clusters
    // We assume at least 5% variance is "normal" to avoid filtering [100, 100, 101]
    const effectiveMad = Math.max(mad, median * 0.05);

    // Threshold: 3 * MAD is a standard conservative cutoff (roughly 3 sigma)
    const threshold = 3 * effectiveMad;

    const lowerFence = median - threshold;
    const upperFence = median + threshold;

    return validPrices.filter(p => p.price >= lowerFence && p.price <= upperFence);
  }

  private getMedian(sortedValues: number[]): number {
    const mid = Math.floor(sortedValues.length / 2);
    if (sortedValues.length % 2 === 0) {
      return (sortedValues[mid - 1] + sortedValues[mid]) / 2;
    }
    return sortedValues[mid];
  }
}
