import { ApiClient, createApiClient } from './base';
import { ApiResponse } from './types';

// Types based on the API documentation
export interface Warehouse {
  id: number;
  name: string;
  location: string;
  active: boolean;
  clientId: number;
  timeZone?: string;
  shopId?: number;
  publishedInShops?: { shop_id: number }[];
}

export interface PaginatedWarehouseResponse {
  data: Warehouse[];
  total: number;
}

export interface WarehouseListParams {
  clientId?: number;
  shopId?: number;
  page?: number;
  pageSize?: number;
}

/**
 * Service for interacting with warehouse endpoints
 */
class WarehouseService {
  private apiClient: ApiClient;
  private baseEndpoint = '/api/warehouses';

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  /**
   * Get all warehouses with optional client filtering
   */
  async getWarehouses(
    params?: WarehouseListParams
  ): Promise<ApiResponse<PaginatedWarehouseResponse>> {
    const queryParams = params ? { ...params } : undefined;
    const response = await this.apiClient.get<PaginatedWarehouseResponse>(
      this.baseEndpoint,
      {
        params: queryParams,
      }
    );
    return { data: response };
  }

  /**
   * Get a warehouse by ID
   */
  async getWarehouseById(id: number): Promise<ApiResponse<Warehouse>> {
    const response = await this.apiClient.get<{ data: Warehouse }>(this.baseEndpoint + `/${id}`);
    return response;
  }

  async createWarehouse(data: {
    warehouseName: string;
    clientId?: number;
    timeZone?: string;
    status?: boolean;
  }): Promise<ApiResponse<Warehouse>> {
    return this.apiClient.post<ApiResponse<Warehouse>>(this.baseEndpoint, data);
  }

  /**
   * Update a warehouse by ID
   */
  async updateWarehouse(id: number, data: {
    warehouseName?: string;
    timeZone?: string;
    status?: boolean;
    shopId?: number;
  }): Promise<ApiResponse<Warehouse>> {
    return this.apiClient.put<ApiResponse<Warehouse>>(this.baseEndpoint + `/${id}`, data);
  }
}

// Create a default instance
export const warehouseService = new WarehouseService();

/**
 * Export a function to create an instance with a specific client
 */
export const createWarehouseService = (apiClient?: ApiClient) => {
  return new WarehouseService(apiClient);
};
