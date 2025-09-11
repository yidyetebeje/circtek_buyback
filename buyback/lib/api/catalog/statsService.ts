/**
 * Stats Service
 * Handles all API operations related to platform statistics
 */

import { ApiClient, createApiClient } from '../base';
import { ApiResponse } from '../types';

export interface DateRange {
  dateFrom?: string;
  dateTo?: string;
}

export interface PlatformOverview {
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  totalEstimatedValue: number;
  totalFinalValue: number;
  averageEstimatedOrderValue: number;
  averageFinalOrderValue: number;
}

export interface TopDevice {
  deviceId: string | number;
  modelName: string;
  brandName: string;
  seriesName?: string;
  orderCount: number;
  totalFinalValue: number;
}

export interface TopDevicesResponse {
  topDevices: TopDevice[];
}

export interface TopShop {
  shopId: string | number;
  shopName: string;
  orderCount: number;
  totalFinalValue: number;
}

export interface TopShopsResponse {
  topShops: TopShop[];
}

export interface ShopOverview extends PlatformOverview {
  shopId: string | number;
  shopName: string;
}

export interface ShopTopDevicesResponse {
  shopId: string | number;
  shopName: string;
  topDevices: TopDevice[];
}

export interface CatalogOverview {
  published: {
    categories: number;
    brands: number;
    series: number;
    models: number;
    featuredDevices: number;
  };
  unpublishedModels: number;
  stockDevices: number;
  openOrders: number;
  completedOrdersThisMonth: number;
}

export interface CategoryModelStat {
  categoryId: number;
  categoryName: string;
  modelCount: number;
}

export interface BrandModelStat {
  brandId: number;
  brandName: string;
  modelCount: number;
}

export interface TimeSeriesParams {
  dateFrom: string;
  dateTo: string;
  period: 'daily' | 'weekly' | 'monthly';
}

export interface TimeSeriesDataPoint {
  period: string;
  orderCount: number;
  totalEstimatedValue: number;
  totalFinalValue: number;
  paidOrders: number;
  pendingOrders: number;
  arrivedOrders: number;
  rejectedOrders: number;
}

export interface TimeSeriesResponse {
  timeSeries: TimeSeriesDataPoint[];
}

export interface ShopTimeSeriesResponse extends TimeSeriesResponse {
  shopId: string | number;
  shopName: string;
}

export class StatsService {
  private apiClient: ApiClient;
  private baseEndpoint = '/stats';

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  /**
   * Get platform-wide overview statistics
   */
  async getPlatformOverview(dateRange?: DateRange): Promise<ApiResponse<PlatformOverview>> {
    const params = dateRange ? {
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo
    } : undefined;
    
    return this.apiClient.get<ApiResponse<PlatformOverview>>(
      `${this.baseEndpoint}/platform/overview`,
      { 
        params,
        isProtected: true 
      }
    );
  }

  /**
   * Get top performing devices across the platform
   */
  async getTopDevices(
    limit: number = 10, 
    sortBy: string = 'count', 
    dateRange?: DateRange
  ): Promise<ApiResponse<TopDevicesResponse>> {
    return this.apiClient.get<ApiResponse<TopDevicesResponse>>(
      `${this.baseEndpoint}/platform/top-devices`,
      { 
        params: {
          limit,
          sortBy,
          ...(dateRange?.dateFrom && { dateFrom: dateRange.dateFrom }),
          ...(dateRange?.dateTo && { dateTo: dateRange.dateTo })
        },
        isProtected: true 
      }
    );
  }

  /**
   * Get top performing shops across the platform
   */
  async getTopShops(
    limit: number = 10, 
    sortBy: string = 'orderCount', 
    dateRange?: DateRange
  ): Promise<ApiResponse<TopShopsResponse>> {
    return this.apiClient.get<ApiResponse<TopShopsResponse>>(
      `${this.baseEndpoint}/platform/top-shops`,
      { 
        params: {
          limit,
          sortBy,
          ...(dateRange?.dateFrom && { dateFrom: dateRange.dateFrom }),
          ...(dateRange?.dateTo && { dateTo: dateRange.dateTo })
        },
        isProtected: true 
      }
    );
  }

  /**
   * Get overview statistics for a specific shop
   */
  async getShopOverview(
    shopId: number, 
    dateRange?: DateRange
  ): Promise<ApiResponse<ShopOverview>> {
    const params = dateRange ? {
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo
    } : undefined;
    
    return this.apiClient.get<ApiResponse<ShopOverview>>(
      `${this.baseEndpoint}/shop/${shopId}/overview`,
      { 
        params,
        isProtected: true 
      }
    );
  }

  /**
   * Get top devices for a specific shop
   */
  async getShopTopDevices(
    shopId: number,
    limit: number = 10, 
    sortBy: string = 'count', 
    dateRange?: DateRange
  ): Promise<ApiResponse<ShopTopDevicesResponse>> {
    return this.apiClient.get<ApiResponse<ShopTopDevicesResponse>>(
      `${this.baseEndpoint}/shop/${shopId}/top-devices`,
      { 
        params: {
          limit,
          sortBy,
          ...(dateRange?.dateFrom && { dateFrom: dateRange.dateFrom }),
          ...(dateRange?.dateTo && { dateTo: dateRange.dateTo })
        },
        isProtected: true 
      }
    );
  }

  /**
   * Get overview statistics for the currently authenticated shop client
   */
  async getMyShopOverview(dateRange?: DateRange): Promise<ApiResponse<ShopOverview>> {
    const params = dateRange ? {
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo
    } : undefined;
    
    return this.apiClient.get<ApiResponse<ShopOverview>>(
      `${this.baseEndpoint}/my-shop/overview`,
      { 
        params,
        isProtected: true 
      }
    );
  }

  /**
   * Get top devices for the currently authenticated shop client
   */
  async getMyShopTopDevices(
    limit: number = 10, 
    sortBy: string = 'count', 
    dateRange?: DateRange
  ): Promise<ApiResponse<ShopTopDevicesResponse>> {
    return this.apiClient.get<ApiResponse<ShopTopDevicesResponse>>(
      `${this.baseEndpoint}/my-shop/top-devices`,
      { 
        params: {
          limit,
          sortBy,
          ...(dateRange?.dateFrom && { dateFrom: dateRange.dateFrom }),
          ...(dateRange?.dateTo && { dateTo: dateRange.dateTo })
        },
        isProtected: true 
      }
    );
  }

  /**
   * Get catalog overview (published counts, stock/order quick stats)
   */
  async getShopCatalogOverview(shopId: number): Promise<ApiResponse<CatalogOverview>> {
    return this.apiClient.get<ApiResponse<CatalogOverview>>(
      `${this.baseEndpoint}/shop/${shopId}/catalog-overview`,
      { isProtected: true }
    );
  }

  /** Get model distribution per category */
  async getModelsPerCategory(shopId: number): Promise<ApiResponse<CategoryModelStat[]>> {
    return this.apiClient.get<ApiResponse<CategoryModelStat[]>>(
      `${this.baseEndpoint}/shop/${shopId}/models-per-category`,
      { isProtected: true }
    );
  }

  /** Get model distribution per brand */
  async getModelsPerBrand(shopId: number): Promise<ApiResponse<BrandModelStat[]>> {
    return this.apiClient.get<ApiResponse<BrandModelStat[]>>(
      `${this.baseEndpoint}/shop/${shopId}/models-per-brand`,
      { isProtected: true }
    );
  }

  /**
   * Get platform-wide time series data
   */
  async getPlatformTimeSeries(params: TimeSeriesParams): Promise<ApiResponse<TimeSeriesResponse>> {
    return this.apiClient.get<ApiResponse<TimeSeriesResponse>>(
      `${this.baseEndpoint}/platform/time-series`,
      { 
        params: params as any,
        isProtected: true 
      }
    );
  }

  /**
   * Get time series data for a specific shop
   */
  async getShopTimeSeries(
    shopId: number,
    params: TimeSeriesParams
  ): Promise<ApiResponse<ShopTimeSeriesResponse>> {
    return this.apiClient.get<ApiResponse<ShopTimeSeriesResponse>>(
      `${this.baseEndpoint}/shop/${shopId}/time-series`,
      { 
        params: params as any,
        isProtected: true 
      }
    );
  }

  /**
   * Get time series data for the current shop client
   */
  async getMyShopTimeSeries(params: TimeSeriesParams): Promise<ApiResponse<ShopTimeSeriesResponse>> {
    return this.apiClient.get<ApiResponse<ShopTimeSeriesResponse>>(
      `${this.baseEndpoint}/my-shop/time-series`,
      { 
        params: params as any,
        isProtected: true 
      }
    );
  }
}

// Create a default instance
export const statsService = new StatsService();

// Export a function to create an instance with a specific client
export const createStatsService = (apiClient?: ApiClient) => new StatsService(apiClient); 