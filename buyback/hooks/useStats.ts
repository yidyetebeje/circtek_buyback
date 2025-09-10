import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  statsService, 
  DateRange, 
  PlatformOverview,
  TopDevicesResponse,
  TopShopsResponse,
  ShopOverview,
  ShopTopDevicesResponse,
  CatalogOverview,
  CategoryModelStat,
  BrandModelStat
} from "@/lib/api/catalog/statsService";

// Time series types - defined locally for now
export type TimeSeriesParams = {
  dateFrom: string;
  dateTo: string;
  period: 'daily' | 'weekly' | 'monthly';
};

export type TimeSeriesDataPoint = {
  period: string;
  orderCount: number;
  totalEstimatedValue: number;
  totalFinalValue: number;
  paidOrders: number;
  pendingOrders: number;
  arrivedOrders: number;
  rejectedOrders: number;
};

export type TimeSeriesResponse = {
  timeSeries: TimeSeriesDataPoint[];
};

export type ShopTimeSeriesResponse = TimeSeriesResponse & {
  shopId: string | number;
  shopName: string;
};

// Re-export types from statsService for convenience
export type { 
  DateRange, 
  PlatformOverview,
  TopDevicesResponse,
  TopShopsResponse,
  ShopOverview,
  ShopTopDevicesResponse,
  CatalogOverview,
  CategoryModelStat,
  BrandModelStat
};

// Hook for fetching platform overview statistics
export function usePlatformOverview(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['stats', 'platform', 'overview', dateRange],
    queryFn: () => statsService.getPlatformOverview(dateRange),
    select: (data) => data.data,
  });
}

// Hook for fetching top devices across the platform
export function useTopDevices(limit = 10, sortBy = 'count', dateRange?: DateRange) {
  return useQuery({
    queryKey: ['stats', 'platform', 'topDevices', limit, sortBy, dateRange],
    queryFn: () => statsService.getTopDevices(limit, sortBy, dateRange),
    select: (data) => data.data,
  });
}

// Hook for fetching top shops
export function useTopShops(limit = 10, sortBy = 'orderCount', dateRange?: DateRange) {
  return useQuery({
    queryKey: ['stats', 'platform', 'topShops', limit, sortBy, dateRange],
    queryFn: () => statsService.getTopShops(limit, sortBy, dateRange),
    select: (data) => data.data,
  });
}

// Hook for fetching overview statistics for a specific shop (admin only)
export function useShopOverview(shopId: number, dateRange?: DateRange) {
  return useQuery({
    queryKey: ['stats', 'shop', shopId, 'overview', dateRange],
    queryFn: () => statsService.getShopOverview(shopId, dateRange),
    enabled: !!shopId,
    select: (data) => data.data,
  });
}

// Hook for fetching top devices for a specific shop (admin only)
export function useShopTopDevices(
  shopId: number, 
  limit = 10, 
  sortBy = 'count', 
  dateRange?: DateRange
) {
  return useQuery({
    queryKey: ['stats', 'shop', shopId, 'topDevices', limit, sortBy, dateRange],
    queryFn: () => statsService.getShopTopDevices(shopId, limit, sortBy, dateRange),
    enabled: !!shopId,
    select: (data) => data.data,
  });
}

// Hook for fetching overview statistics for the current shop client
export function useMyShopOverview(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['stats', 'myShop', 'overview', dateRange],
    queryFn: () => statsService.getMyShopOverview(dateRange),
    select: (data) => data.data,
  });
}

// Hook for fetching top devices for the current shop client
export function useMyShopTopDevices(limit = 10, sortBy = 'count', dateRange?: DateRange) {
  return useQuery({
    queryKey: ['stats', 'myShop', 'topDevices', limit, sortBy, dateRange],
    queryFn: () => statsService.getMyShopTopDevices(limit, sortBy, dateRange),
    select: (data) => data.data,
  });
}

// Hook for selecting and managing date range
export function useDateRangeFilter() {
  const [dateRange, setDateRange] = useState<DateRange>({
    dateFrom: undefined,
    dateTo: undefined,
  });

  const setLastDays = (days: number) => {
    // For end date (today): Set to end of current day to include all of today's data
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    // For start date: Set to beginning of the past day to include all data from that day
    const past = new Date();
    past.setDate(past.getDate() - days);
    past.setHours(0, 0, 0, 0);
    
    setDateRange({
      dateFrom: past.toISOString(), // Full ISO string with time component
      dateTo: now.toISOString(),    // Full ISO string with time component
    });
  };
  
  return {
    dateRange,
    setDateRange,
    setLastDays,
  };
}

export function useShopCatalogOverview(shopId: number) {
  return useQuery({
    queryKey: ['stats', 'shop', shopId, 'catalogOverview'],
    enabled: !!shopId,
    queryFn: () => statsService.getShopCatalogOverview(shopId),
    select: (data) => data.data as CatalogOverview,
  });
}

export function useModelsPerCategory(shopId: number) {
  return useQuery({
    queryKey: ['stats', 'shop', shopId, 'modelsPerCategory'],
    enabled: !!shopId,
    queryFn: () => statsService.getModelsPerCategory(shopId),
    select: (data) => data.data as CategoryModelStat[],
  });
}

export function useModelsPerBrand(shopId: number) {
  return useQuery({
    queryKey: ['stats', 'shop', shopId, 'modelsPerBrand'],
    enabled: !!shopId,
    queryFn: () => statsService.getModelsPerBrand(shopId),
    select: (data) => data.data as BrandModelStat[],
  });
}

// Time Series Hooks
export function usePlatformTimeSeries(params: TimeSeriesParams) {
  return useQuery({
    queryKey: ['stats', 'platform', 'timeSeries', params],
    queryFn: () => statsService.getPlatformTimeSeries(params),
    enabled: !!(params.dateFrom && params.dateTo),
    select: (data) => data.data as TimeSeriesResponse,
  });
}

export function useShopTimeSeries(shopId: number, params: TimeSeriesParams) {
  return useQuery({
    queryKey: ['stats', 'shop', shopId, 'timeSeries', params],
    queryFn: () => statsService.getShopTimeSeries(shopId, params),
    enabled: !!(shopId && params.dateFrom && params.dateTo),
    select: (data) => data.data as ShopTimeSeriesResponse,
  });
}

export function useMyShopTimeSeries(params: TimeSeriesParams) {
  return useQuery({
    queryKey: ['stats', 'myShop', 'timeSeries', params],
    queryFn: () => statsService.getMyShopTimeSeries(params),
    enabled: !!(params.dateFrom && params.dateTo),
    select: (data) => data.data as ShopTimeSeriesResponse,
  });
} 