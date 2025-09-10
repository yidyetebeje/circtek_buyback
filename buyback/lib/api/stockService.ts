import { ApiClient, createApiClient } from './base';
import { ApiResponse, PaginatedResponse } from './types';

export interface StockItem {
  id: number;
  imei: string;
  serial: string | null;
  sku: string;
  grade: string | null;
  modelName: string | null;
  storage: string | null;
  colorName: string | null;
  warehouseId: number;
  warehouseName: string | null;
  isDead: boolean;
  createdAt: string | null;
}

export interface StockListParams {
  page?: number;
  limit?: number;
  search?: string;
  warehouseId?: number;
  isDead?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  modelName?: string;
  storage?: string;
  colorName?: string;
  sku?: string;
  shopId?: number;
}

export interface StockFilters {
  modelNames: string[];
  storage: string[];
  colorNames: string[];
  skus: string[];
}

export interface StockListResponse extends PaginatedResponse<StockItem> {
  filters: StockFilters;
}

class StockService {
  private apiClient: ApiClient;
  private baseEndpoint = '/api/stock';

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  async getStocks(params: StockListParams): Promise<ApiResponse<StockListResponse>> {
    const response = await this.apiClient.get<{ data: StockListResponse }>(this.baseEndpoint, {
      params: params as Record<string, string | number | boolean | number[] | undefined>,
      isProtected: true,
    });

    return response;
  }

  async getStockById(id: number) {
    return this.apiClient.get<{ data: StockItem }>(`${this.baseEndpoint}/${id}`, { isProtected: true });
  }

  async getFilters(params: { warehouseId?: number; isDead?: boolean; shopId?: number } = {}) {
    const response = await this.apiClient.get<{ data: StockFilters }>(`${this.baseEndpoint}/filters`, {
      params: params as Record<string, string | number | boolean | undefined>,
      isProtected: true,
    });
    return response;
  }
}

export const stockService = new StockService();
export const createStockService = (apiClient?: ApiClient) => new StockService(apiClient); 