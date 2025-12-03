export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private reservedTokens: number = 0;
  
  constructor(
    private maxTokens: number, 
    private refillIntervalMs: number
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed > this.refillIntervalMs) {
      this.tokens = this.maxTokens;
      this.lastRefill = now;
    }
  }

  public canSpend(cost: number = 1): boolean {
    this.refill();
    return (this.tokens - this.reservedTokens) >= cost;
  }

  public canReserve(totalCost: number): boolean {
    this.refill();
    return (this.tokens - this.reservedTokens) >= totalCost;
  }

  public spend(cost: number = 1): boolean {
    this.refill();
    if ((this.tokens - this.reservedTokens) >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }

  public reserve(cost: number): boolean {
    if (this.canReserve(cost)) {
      this.reservedTokens += cost;
      return true;
    }
    return false;
  }

  public spendReserved(cost: number): void {
    // We don't refill here because we are spending tokens that were already reserved (and thus accounted for)
    // However, we should ensure we don't go below zero if something went wrong
    if (this.reservedTokens >= cost) {
      this.reservedTokens -= cost;
      this.tokens -= cost;
    } else {
        // Fallback if trying to spend more than reserved (shouldn't happen in correct usage)
        // But let's just spend what we have reserved and the rest from available?
        // For now, strict implementation:
        console.warn(`Attempted to spend ${cost} reserved tokens but only ${this.reservedTokens} reserved.`);
        this.tokens -= cost; // Still deduct from total
        this.reservedTokens = Math.max(0, this.reservedTokens - cost);
    }
  }

  public releaseReservation(cost: number): void {
    this.reservedTokens = Math.max(0, this.reservedTokens - cost);
  }

  public getRemaining(): number {
    this.refill();
    return this.tokens - this.reservedTokens;
  }

  public getAvailable(): number {
    this.refill();
    return this.tokens - this.reservedTokens; // Available to spend = Total - Reserved
  }
  
  // Helper for testing to see raw tokens
  public getRawTokens(): number {
      this.refill();
      return this.tokens;
  }
}
