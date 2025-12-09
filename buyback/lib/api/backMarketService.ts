import { apiClient } from './base';
import { PaginationParams } from './types';

export interface BackMarketOrder {
  order_id: string;
  creation_date: string;
  modification_date: string;
  status: string;
  currency: string;
  shipping_first_name?: string;
  shipping_last_name?: string;
  shipping_address1?: string;
  shipping_address2?: string;
  shipping_zipcode?: string;
  shipping_city?: string;
  shipping_country?: string;
  tracking_number?: string;
  tracking_url?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lines: any[];
  synced_at: string;
}

export interface BackMarketListing {
  listing_id: string;
  product_id?: string;
  sku?: string;
  title?: string;
  price?: string;
  base_price?: string;
  currency?: string;
  quantity?: number;
  state?: number;
  grade?: number;
  publication_state?: number;
  synced_at: string;
}

export interface PricingParameters {
  id?: number;
  sku: string;
  grade: number;
  country_code: string;
  c_refurb?: string;
  c_op?: string;
  c_risk?: string;
  m_target?: string;
  f_bm?: string;
  price_step?: string;
  min_price?: string;
  max_price?: string;
  triggerReprice?: boolean;
  updated_at?: string;
}

export interface SchedulerStatus {
  [key: string]: {
    lastRun: string | null;
    nextRun?: string | null;
    lastError: string | null;
    isRunning: boolean;
  };
}

export interface RateLimitStatus {
  [key: string]: {
    tokens: number;
    maxTokens: number;
    reservedTokens: number;
    refillIntervalMs: number;
    lastRefill: number;
    queueLength: number;
  };
}

export interface RateLimitConfig {
  global: { intervalMs: number; maxRequests: number };
  catalog: { intervalMs: number; maxRequests: number };
  competitor: { intervalMs: number; maxRequests: number };
  care: { intervalMs: number; maxRequests: number };
}

export interface BuybackPrice {
  id: number;
  sku: string;
  grade_name: string;
  price: string;
  market_price: string;
  updated_at: string;
}

export const backMarketService = {
  getBackMarketConfig: async () => {
    return apiClient.get<{ marketplace: string; currency: string }>('/configuration/system-config/backmarket');
  },

  updateBackMarketConfig: async (config: { marketplace: string; currency: string }) => {
    return apiClient.put<{ success: boolean; message: string }>('/configuration/system-config/backmarket', config);
  },

  // ... existing methods ...

  getBuybackPrices: async () => {
    return apiClient.get<{ success: boolean; data: BuybackPrice[] }>('/buyback/backmarket/buyback-prices');
  },

  syncBuybackPrices: async () => {
    return apiClient.post<{ success: boolean; message: string }>('/buyback/backmarket/sync/buyback-prices');
  },

  /**
   * Get paginated orders
   */
  getOrders: async (params: PaginationParams = {}) => {
    return apiClient.get<{ success: boolean; results: BackMarketOrder[]; page: number; limit: number }>(
      '/buyback/backmarket/orders',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { params: params as any, isProtected: true }
    );
  },

  /**
   * Get paginated listings
   */
  getListings: async (params: PaginationParams = {}) => {
    return apiClient.get<{ success: boolean; results: BackMarketListing[]; page: number; limit: number }>(
      '/buyback/backmarket/listings',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { params: params as any, isProtected: true }
    );
  },

  /**
   * Get live order details from Back Market API
   */
  getLiveOrder: async (orderId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return apiClient.get<{ success: boolean; data: any }>(
      `/buyback/backmarket/orders/${orderId}/live`,
      { isProtected: true }
    );
  },

  /**
   * Trigger order sync
   */
  syncOrders: async (fullSync: boolean = false) => {
    return apiClient.post<{ success: boolean; totalSynced: number }>(
      '/buyback/backmarket/sync/orders',
      { fullSync },
      { isProtected: true }
    );
  },

  createListing: async (data: any) => {
    return apiClient.post<{ success: boolean; data: BackMarketListing }>(
      '/buyback/backmarket/listings',
      data,
      { isProtected: true }
    );
  },

  uploadBulkCsv: async (csvContent: string) => {
    return apiClient.post<{ success: boolean; data: any }>(
      '/buyback/backmarket/listings/bulk',
      { csv: csvContent },
      { isProtected: true }
    );
  },

  /**
   * Get task status for an asynchronous batch
   */
  getTaskStatus: async (taskId: number) => {
    return apiClient.get<{ success: boolean; data: any }>(
      `/buyback/backmarket/tasks/${taskId}`,
      { isProtected: true }
    );
  },

  updateBasePrice: async (listingId: string, price: number) => {
    return apiClient.patch<{ success: boolean }>(
      `/buyback/backmarket/listings/${listingId}/base-price`,
      { price },
      { isProtected: true }
    );
  },

  getPriceHistory: async (listingId: string) => {
    return apiClient.get<{ success: boolean; data: any[] }>(
      `/buyback/backmarket/listings/${listingId}/history`,
      { isProtected: true }
    );
  },

  /**
   * Trigger listing sync
   */
  syncListings: async () => {
    return apiClient.post<{ success: boolean; totalSynced: number }>(
      '/buyback/backmarket/sync/listings',
      {},
      { isProtected: true }
    );
  },

  /**
   * Trigger repricing for a listing
   */
  repriceListing: async (listingId: string) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/buyback/backmarket/reprice/${listingId}`,
      {},
      { isProtected: true }
    );
  },

  /**
   * Run price probe
   */
  runProbe: async (listingId: string, currentPrice: number) => {
    return apiClient.post<{ success: boolean; listingId: string; newPrice: number }>(
      `/buyback/backmarket/probe/${listingId}`,
      { currentPrice },
      { isProtected: true }
    );
  },

  /**
   * Emergency recover price
   */
  recoverPrice: async (listingId: string, targetPrice: number) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/buyback/backmarket/recover/${listingId}`,
      { targetPrice },
      { isProtected: true }
    );
  },

  /**
   * Get pricing parameters
   */
  getParameters: async (sku: string, grade: number, country: string) => {
    return apiClient.get<{ success: boolean; data: PricingParameters | null }>(
      `/buyback/backmarket/parameters/${sku}`,
      { 
        params: { grade, country },
        isProtected: true 
      }
    );
  },

  /**
   * Update pricing parameters
   */
  updateParameters: async (params: PricingParameters & { triggerReprice?: boolean }) => {
    return apiClient.post<{ success: boolean; message: string }>(
      '/buyback/backmarket/parameters',
      params,
      { isProtected: true }
    );
  },

  /**
   * Get scheduler status
   */
  getSchedulerStatus: async () => {
    return apiClient.get<{ success: boolean; status: SchedulerStatus }>(
      '/buyback/backmarket/scheduler/status',
      { isProtected: true }
    );
  },

  /**
   * Trigger scheduler task
   */
  triggerSchedulerTask: async (name: string) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/buyback/backmarket/scheduler/trigger/${encodeURIComponent(name)}`,
      {},
      { isProtected: true }
    );
  },

  /**
   * Get rate limit status
   */
  getRateLimitStatus: async () => {
    return apiClient.get<RateLimitStatus>(
      '/buyback/backmarket/rate-limits',
      { isProtected: true }
    );
  },

  /**
   * Get default rate limits
   */
  getDefaultRateLimits: async () => {
    return apiClient.get<RateLimitConfig>(
      '/buyback/backmarket/rate-limits/defaults',
      { isProtected: true }
    );
  },

  /**
   * Update rate limit config
   */
  updateRateLimitConfig: async (config: RateLimitConfig) => {
    return apiClient.put<{ success: boolean }>(
      '/buyback/backmarket/rate-limits',
      config,
      { isProtected: true }
    );
  },

  /**
   * Add test competitor
   */
  addTestCompetitor: async (listingId: string, name: string, price: number) => {
    return apiClient.post<{ success: boolean }>(
      '/buyback/backmarket/test/competitors',
      { listingId, name, price },
      { isProtected: true }
    );
  },

  /**
   * Clear test competitors
   */
  clearTestCompetitors: async (listingId: string) => {
    return apiClient.delete<{ success: boolean }>(
      `/buyback/backmarket/test/competitors/${listingId}`,
      { isProtected: true }
    );
  }
};
