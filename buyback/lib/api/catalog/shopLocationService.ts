/**
 * Shop Location Service
 * Handles all API operations related to shop physical locations
 */

import { ApiClient, createApiClient } from '../base';
import { ApiResponse, PaginatedResponse, QueryParams } from '../types';
import { ShopLocation, ShopLocationWithPhones, ShopLocationPhone } from '@/types/shop';

export interface LocationQueryParams extends QueryParams {
  activeOnly?: boolean;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

// Helper function to transform snake_case API response to camelCase for phones
function transformPhone(phone: Record<string, unknown>): ShopLocationPhone {
  return {
    id: phone.id as number,
    locationId: phone.location_id as number,
    phoneNumber: phone.phone_number as string,
    phoneType: phone.phone_type as 'main' | 'mobile' | 'fax' | 'whatsapp',
    isPrimary: phone.is_primary as boolean,
    createdAt: phone.created_at as string,
    updatedAt: phone.updated_at as string,
  };
}

// Helper function to transform snake_case API response to camelCase for locations
function transformLocation(location: Record<string, unknown>): ShopLocationWithPhones {
  return {
    id: location.id as number,
    shopId: location.shop_id as number,
    warehouseId: location.warehouse_id as number | null | undefined,
    name: location.name as string,
    address: location.address as string,
    houseNumber: location.house_number as string | null | undefined,
    city: location.city as string,
    state: location.state as string | null | undefined,
    postalCode: location.postal_code as string | null | undefined,
    country: location.country as string,
    email: location.email as string | null | undefined,
    companyName: location.company_name as string | null | undefined,
    latitude: location.latitude as number,
    longitude: location.longitude as number,
    description: location.description as string | null | undefined,
    operatingHours: location.operating_hours as Record<string, { open: string; close: string; isClosed: boolean }> | null | undefined,
    isActive: location.is_active as boolean,
    displayOrder: location.display_order as number,
    createdAt: location.created_at as string,
    updatedAt: location.updated_at as string,
    phones: Array.isArray(location.phones)
      ? location.phones.map(transformPhone)
      : [],
    distance: location.distance as number | undefined,
  };
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
    const response = await this.apiClient.get<PaginatedResponse<Record<string, unknown>>>(
      `${this.baseEndpoint}/${shopId}/locations`,
      { params }
    );

    // Transform the response data from snake_case to camelCase
    return {
      ...response,
      data: Array.isArray(response.data)
        ? response.data.map(transformLocation)
        : [],
    };
  }

  /**
   * Get a location by ID
   */
  async getShopLocationById(shopId: number, locationId: number): Promise<ApiResponse<ShopLocationWithPhones>> {
    const response = await this.apiClient.get<ApiResponse<Record<string, unknown>>>(
      `${this.baseEndpoint}/${shopId}/locations/${locationId}`
    );

    return {
      ...response,
      data: response.data ? transformLocation(response.data) : undefined as unknown as ShopLocationWithPhones,
    };
  }

  /**
   * Get a location by its linked warehouse ID
   */
  async getShopLocationByWarehouseId(shopId: number, warehouseId: number): Promise<ApiResponse<ShopLocationWithPhones>> {
    const response = await this.apiClient.get<ApiResponse<Record<string, unknown>>>(
      `${this.baseEndpoint}/${shopId}/locations/by-warehouse/${warehouseId}`
    );

    return {
      ...response,
      data: response.data ? transformLocation(response.data) : undefined as unknown as ShopLocationWithPhones,
    };
  }

  /**
   * Create a new shop location
   */
  async createShopLocation(
    shopId: number,
    location: Omit<ShopLocation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<ShopLocationWithPhones>> {
    const response = await this.apiClient.post<ApiResponse<Record<string, unknown>>>(
      `${this.baseEndpoint}/${shopId}/locations`,
      location
    );

    return {
      ...response,
      data: response.data ? transformLocation(response.data) : undefined as unknown as ShopLocationWithPhones,
    };
  }

  /**
   * Update a shop location
   */
  async updateShopLocation(
    shopId: number,
    locationId: number,
    location: Partial<ShopLocation>
  ): Promise<ApiResponse<ShopLocationWithPhones>> {
    const response = await this.apiClient.put<ApiResponse<Record<string, unknown>>>(
      `${this.baseEndpoint}/${shopId}/locations/${locationId}`,
      location
    );

    return {
      ...response,
      data: response.data ? transformLocation(response.data) : undefined as unknown as ShopLocationWithPhones,
    };
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
    const response = await this.apiClient.post<ApiResponse<Record<string, unknown>>>(
      `${this.baseEndpoint}/${shopId}/locations/${locationId}/toggle-active`
    );

    return {
      ...response,
      data: response.data ? transformLocation(response.data) : undefined as unknown as ShopLocationWithPhones,
    };
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

    const response = await this.apiClient.get<ApiResponse<Record<string, unknown>[]>>(
      `${this.baseEndpoint}/locations/nearby`,
      { params: queryParams }
    );

    return {
      ...response,
      data: Array.isArray(response.data)
        ? response.data.map(transformLocation)
        : [],
    };
  }
}

// Create a default instance
export const shopLocationService = new ShopLocationService();

// Export a function to create an instance with a specific client
export const createShopLocationService = (apiClient?: ApiClient) => new ShopLocationService(apiClient); 