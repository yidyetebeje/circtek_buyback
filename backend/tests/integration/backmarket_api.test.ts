import { describe, it, expect, beforeAll } from 'bun:test';
import { config } from 'dotenv';
import { BackMarketService } from '../../src/buyback/services/backMarketService';

config();

describe('Back Market Service Integration', () => {
  let service: BackMarketService;

  beforeAll(() => {
    if (!process.env.BACKMARKET_API_TOKEN) {
      throw new Error('BACKMARKET_API_TOKEN environment variable is not set');
    }
    service = new BackMarketService();
  });

  describe('BuyBack Orders', () => {
    it('should fetch buyback orders', async () => {
      const response = await service.getBuyBackOrders({ page: 1, limit: 10 });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toBeObject();
      expect(data.results).toBeArray();
    }, 30000); // Increase timeout to 30s

    it('should fetch buyback orders pending reply', async () => {
      const response = await service.getBuyBackOrdersPendingReply({ page: 1 });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toBeObject();
      expect(data.results).toBeArray();
    }, 30000);

    it('should fetch suspend reasons', async () => {
      const response = await service.getSuspendReasons();
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toBeArray();
    }, 30000);

    it('should handle non-existent order gracefully (404)', async () => {
      const response = await service.getBuyBackOrder('invalid-order-id');
      expect(response.status).toBe(404);
    }, 30000);
  });

  describe('Listings', () => {
    it('should fetch listings', async () => {
      const response = await service.getListings({ page: 1, limit: 10 });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toBeObject();
      expect(data.results).toBeArray();
    }, 30000);

    it('should handle non-existent listing gracefully (404 or 400)', async () => {
      const response = await service.getListing('invalid-listing-id');
      expect([400, 404]).toContain(response.status);
    }, 30000);
  });

  describe('Dynamic Data Tests', () => {
    it('should fetch details for an existing order if available', async () => {
      const listResponse = await service.getBuyBackOrders({ page: 1, limit: 1 });
      const listData = await listResponse.json();
      
      if (listData.results && listData.results.length > 0) {
        const orderId = listData.results[0].order_id; // Adjust field name based on actual API response
        console.log(`Testing getBuyBackOrder with ID: ${orderId}`);
        const detailResponse = await service.getBuyBackOrder(orderId);
        expect(detailResponse.status).toBe(200);
        
        // Test messages for this order
        const messagesResponse = await service.getBuyBackOrderMessages(orderId);
        expect(messagesResponse.status).toBe(200);
      } else {
        console.log('No orders found to test detail fetch');
      }
    }, 30000);

    it('should fetch details for an existing listing if available', async () => {
      const listResponse = await service.getListings({ page: 1, limit: 1 });
      const listData = await listResponse.json();
      
      if (listData.results && listData.results.length > 0) {
        const listingId = listData.results[0].listing_id; // Adjust field name based on actual API response
        console.log(`Testing getListing with ID: ${listingId}`);
        const detailResponse = await service.getListing(listingId);
        expect(detailResponse.status).toBe(200);
      } else {
        console.log('No listings found to test detail fetch');
      }
    }, 30000);
  });
});
