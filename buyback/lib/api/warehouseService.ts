import { ApiClient, createApiClient } from './base';
import { ApiResponse } from './types';

// Types based on the API documentation
export interface Warehouse {
  id: number;
  name: string;
  description: string;
  status: boolean | null;
  tenant_id: number;
  shop_id?: number | null;
  tenant_name?: string | null;
  created_at?: string | null;
}

export interface PaginatedWarehouseResponse {
  data: Warehouse[];
  total: number;
}

export interface WarehouseListParams {
  tenant_id?: number;
  shop_id?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Service for interacting with warehouse endpoints
 */
class WarehouseService {
  private apiClient: ApiClient;
  private baseEndpoint = '/warehouses';

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
    name: string;
    description: string;
    tenant_id: number;
    shop_id?: number;
    status?: boolean;
  }): Promise<ApiResponse<Warehouse>> {
    return this.apiClient.post<ApiResponse<Warehouse>>(this.baseEndpoint, data);
  }

  /**
   * Update a warehouse by ID
   */
  async updateWarehouse(id: number, data: {
    name?: string;
    description?: string;
    status?: boolean;
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
