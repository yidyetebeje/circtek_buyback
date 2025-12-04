import { describe, it, expect, beforeAll } from 'bun:test';
import { config } from 'dotenv';
import { BackMarketService } from '../../src/buyback/services/backMarketService';

config();

describe('Back Market Scaling Integration', () => {
  let service: BackMarketService;

  beforeAll(() => {
    if (!process.env.BACKMARKET_API_TOKEN) {
      throw new Error('BACKMARKET_API_TOKEN environment variable is not set');
    }
    service = new BackMarketService();
  });

  describe('Live Order Details (GET /orders/:orderId/live)', () => {
    it('should fetch live order details for a valid order', async () => {
      // First get a list of orders to find a valid ID
      const listResponse = await service.getBuyBackOrders({ page: 1, limit: 1 });
      const listData = await listResponse.json();
      
      if (listData.results && listData.results.length > 0) {
        const orderId = listData.results[0].order_id;
        console.log(`Testing live fetch for order: ${orderId}`);
        
        const response = await service.getBuyBackOrder(orderId);
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toBeObject();
        expect(data.order_id).toBe(orderId);
      } else {
        console.log('No orders available to test live fetch');
      }
    }, 30000);

    it('should handle invalid order ID', async () => {
      const response = await service.getBuyBackOrder('invalid-id-12345');
      expect(response.status).toBe(404);
    }, 30000);
  });

  describe('Listing Updates (POST /listings/:listingId)', () => {
    it('should handle update for invalid listing ID gracefully', async () => {
      const response = await service.updateListing('invalid-listing-123', {
        price: 100.00,
        quantity: 1
      });
      // Expect 404 or 400 depending on API
      expect([400, 404]).toContain(response.status);
    }, 30000);

    // Note: We avoid testing successful updates on live listings to prevent data corruption
    // unless we have a specific test listing.
  });
});
