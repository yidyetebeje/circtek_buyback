/**
 * Shop Location Service
 * Handles all API operations related to shop physical locations
 */

import { ApiClient, createApiClient } from '../base';
import { ApiResponse, PaginatedResponse, QueryParams } from '../types';
import { ShopLocation, ShopLocationWithPhones } from '@/types/shop';

export interface LocationQueryParams extends QueryParams {
  activeOnly?: boolean;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

export class ShopLocationService {
  private apiClient: ApiClient;
  private baseEndpoint = '/catalog/shops'; // Base URL for shops

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  /**
   * Get a paginated list of locations for a specific shop
   */
  async getShopLocations(shopId: number, params?: LocationQueryParams): Promise<PaginatedResponse<ShopLocationWithPhones>> {
    return this.apiClient.get<PaginatedResponse<ShopLocationWithPhones>>(
      `${this.baseEndpoint}/${shopId}/locations`, 
      { params }
    );
  }

  /**
   * Get a location by ID
   */
  async getShopLocationById(shopId: number, locationId: number): Promise<ApiResponse<ShopLocationWithPhones>> {
    return this.apiClient.get<ApiResponse<ShopLocationWithPhones>>(
      `${this.baseEndpoint}/${shopId}/locations/${locationId}`
    );
  }

  /**
   * Create a new shop location
   */
  async createShopLocation(
    shopId: number, 
    location: Omit<ShopLocation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<ShopLocationWithPhones>> {
    return this.apiClient.post<ApiResponse<ShopLocationWithPhones>>(
      `${this.baseEndpoint}/${shopId}/locations`, 
      location
    );
  }

  /**
   * Update a shop location
   */
  async updateShopLocation(
    shopId: number, 
    locationId: number, 
    location: Partial<ShopLocation>
  ): Promise<ApiResponse<ShopLocationWithPhones>> {
    return this.apiClient.put<ApiResponse<ShopLocationWithPhones>>(
      `${this.baseEndpoint}/${shopId}/locations/${locationId}`, 
      location
    );
  }

  /**
   * Delete a shop location
   */
  async deleteShopLocation(shopId: number, locationId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(
      `${this.baseEndpoint}/${shopId}/locations/${locationId}`
    );
  }

  /**
   * Toggle a shop location's active status
   */
  async toggleShopLocationActive(shopId: number, locationId: number): Promise<ApiResponse<ShopLocationWithPhones>> {
    return this.apiClient.post<ApiResponse<ShopLocationWithPhones>>(
      `${this.baseEndpoint}/${shopId}/locations/${locationId}/toggle-active`
    );
  }

  /**
   * Find nearby shop locations
   */
  async getNearbyLocations(
    latitude: number, 
    longitude: number, 
    params?: { 
      radius?: number; 
      shopId?: number; 
      limit?: number; 
    }
  ): Promise<ApiResponse<ShopLocationWithPhones[]>> {
    const queryParams = {
      latitude,
      longitude,
      ...params,
    };
    
    return this.apiClient.get<ApiResponse<ShopLocationWithPhones[]>>(
      `${this.baseEndpoint}/locations/nearby`, 
      { params: queryParams }
    );
  }
}

// Create a default instance
export const shopLocationService = new ShopLocationService();

// Export a function to create an instance with a specific client
export const createShopLocationService = (apiClient?: ApiClient) => new ShopLocationService(apiClient); 