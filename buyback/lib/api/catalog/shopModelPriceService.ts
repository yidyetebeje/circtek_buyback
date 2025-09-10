/**
 * Shop Model Price Service
 * Handles all API operations related to shop model pricing
 */

import { ApiClient, createApiClient } from '../base';
import { ApiResponse } from '../types';

export interface ShopModelPrice {
  modelId: number;
  shopId: number;
  basePrice: number;
}

export interface UpdateModelPricePayload {
  shopId: number;
  modelId: number;
  basePrice: number;
}

export interface BulkUpdateModelPricePayload {
  shopId: number;
  modelIds: number[];
  basePrice: number;
}

export interface ShopModelStatus {
  id: number;
  shop_id: number;
  model_id: number;
  is_published: number;
  base_price?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BulkUpdateAllShopsPayload {
  modelId: number;
  shopIds: number[];
  basePrice: number;
}

export class ShopModelPriceService {
  private apiClient: ApiClient;
  private baseEndpoint = '/api/catalog/shop-catalog';

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  /**
   * Update price for a single model in a specific shop
   */
  async updateModelPrice(payload: UpdateModelPricePayload): Promise<ApiResponse<ShopModelPrice>> {
    return this.apiClient.put<ApiResponse<ShopModelPrice>>(
      `${this.baseEndpoint}/models/price`,
      payload
    );
  }

  /**
   * Update price for multiple models in a specific shop
   */
  async updateBulkModelPrices(payload: BulkUpdateModelPricePayload): Promise<ApiResponse<ShopModelPrice[]>> {
    return this.apiClient.put<ApiResponse<ShopModelPrice[]>>(
      `${this.baseEndpoint}/models/bulk-price`,
      payload
    );
  }

  /**
   * Update price for a single model across multiple shops
   */
  async updateModelPriceAllShops(payload: BulkUpdateAllShopsPayload): Promise<ApiResponse<ShopModelPrice[]>> {
    const promises = payload.shopIds.map(shopId => 
      this.updateModelPrice({
        shopId,
        modelId: payload.modelId,
        basePrice: payload.basePrice
      })
    );

    const results = await Promise.allSettled(promises);
    const successful = results
      .filter((result): result is PromiseFulfilledResult<ApiResponse<ShopModelPrice>> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value.data);

    const failed = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason);

    if (failed.length > 0) {
      console.warn('Some price updates failed:', failed);
    }

    return {
      data: successful,
      success: true,
      message: `Updated prices for ${successful.length} shops${failed.length > 0 ? `, ${failed.length} failed` : ''}`
    } as ApiResponse<ShopModelPrice[]>;
  }

  /**
   * Get current shop model prices (from shop statuses)
   */
  async getModelPricesForShops(modelId: number, shopIds: number[]): Promise<ApiResponse<ShopModelPrice[]>> {
    // This would need to be implemented on the backend to return current prices
    // For now, we'll use the existing shop catalog status endpoints
    return this.apiClient.get<ApiResponse<ShopModelPrice[]>>(
      `${this.baseEndpoint}/models/statuses`,
      {
        params: {
          shopId: shopIds[0], // This is a limitation - we'd need a better endpoint
          entityIds: [modelId]
        }
      }
    );
  }

  /**
   * Get model status for a specific shop - returns shop-specific price and publish status
   */
  async getModelStatusForShop(shopId: number, modelId: number): Promise<ApiResponse<ShopModelStatus[]>> {
    return this.apiClient.get<ApiResponse<ShopModelStatus[]>>(
      `${this.baseEndpoint}/models/statuses`,
      {
        params: {
          shopId: shopId,
          entityIds: [modelId]
        }
      }
    );
  }

  /**
   * Get model statuses across multiple shops
   */
  async getModelStatusesForAllShops(modelId: number, shopIds: number[]): Promise<{shopId: number, data: ShopModelStatus | null}[]> {
    const promises = shopIds.map(async (shopId) => {
      try {
        const response = await this.getModelStatusForShop(shopId, modelId);
        return { 
          shopId, 
          data: response.data?.[0] || null // Get first item from the array response
        };
      } catch (error) {
        console.warn(`Failed to get status for shop ${shopId}:`, error);
        return { shopId, data: null };
      }
    });

    return Promise.all(promises);
  }
}

// Create a default instance
export const shopModelPriceService = new ShopModelPriceService();

// Export a function to create an instance with a specific client
export const createShopModelPriceService = (apiClient?: ApiClient) => new ShopModelPriceService(apiClient); 