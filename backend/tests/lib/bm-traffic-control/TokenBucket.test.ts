import { describe, it, expect, beforeEach } from 'bun:test';
import { TokenBucket } from '../../../src/lib/bm-traffic-control/TokenBucket';

describe('TokenBucket', () => {
  let bucket: TokenBucket;
  const MAX_TOKENS = 10;
  const REFILL_INTERVAL = 100; // 100ms for fast testing

  beforeEach(() => {
    bucket = new TokenBucket(MAX_TOKENS, REFILL_INTERVAL);
  });

  describe('Basic Operations', () => {
    it('should start with max tokens', () => {
      expect(bucket.getAvailable()).toBe(MAX_TOKENS);
    });

    it('should spend tokens correctly', () => {
      expect(bucket.spend(1)).toBe(true);
      expect(bucket.getAvailable()).toBe(MAX_TOKENS - 1);
    });

    it('should return false when not enough tokens', () => {
      // Spend all tokens
      expect(bucket.spend(MAX_TOKENS)).toBe(true);
      expect(bucket.getAvailable()).toBe(0);
      
      // Try to spend one more
      expect(bucket.spend(1)).toBe(false);
    });

    it('should refill tokens after interval', async () => {
      bucket.spend(MAX_TOKENS);
      expect(bucket.getAvailable()).toBe(0);

      // Wait for refill
      await Bun.sleep(REFILL_INTERVAL + 10);
      
      expect(bucket.getAvailable()).toBe(MAX_TOKENS);
    });

    it('should not overfill tokens', async () => {
      await Bun.sleep(REFILL_INTERVAL + 10);
      expect(bucket.getAvailable()).toBe(MAX_TOKENS);
    });
  });

  describe('Reservation System', () => {
    it('should reserve tokens correctly', () => {
      expect(bucket.canReserve(5)).toBe(true);
      expect(bucket.reserve(5)).toBe(true);
      
      // Should have 5 tokens left to spend
      expect(bucket.getAvailable()).toBe(5);
      expect(bucket.getRemaining()).toBe(5); // Remaining = Tokens - Reserved
    });

    it('should not allow spending reserved tokens via normal spend', () => {
      bucket.reserve(5);
      
      // We have 10 tokens total, 5 reserved.
      // Available to spend should be 5.
      
      expect(bucket.spend(6)).toBe(false);
      expect(bucket.spend(5)).toBe(true);
    });

    it('should allow spending reserved tokens via spendReserved', () => {
      bucket.reserve(5);
      
      // Spend the reserved tokens
      bucket.spendReserved(5);
      
      // Should have 5 tokens left (the unreserved ones)
      expect(bucket.getAvailable()).toBe(5);
    });

    it('should release reservation', () => {
      bucket.reserve(5);
      expect(bucket.getRemaining()).toBe(5);
      
      bucket.releaseReservation(5);
      expect(bucket.getRemaining()).toBe(10);
    });

    it('should not reserve if not enough tokens', () => {
      bucket.spend(8); // 2 left
      expect(bucket.reserve(3)).toBe(false);
    });
  });
});
