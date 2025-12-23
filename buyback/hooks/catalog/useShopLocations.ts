'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shopLocationService } from '@/lib/api';
import { QueryParams } from '@/lib/api/types';
import { ShopLocation } from '@/types/shop';

/**
 * Hook for retrieving a paginated list of shop locations for a specific shop
 */
export const useShopLocations = (shopId: number, params?: QueryParams & { activeOnly?: boolean }) => {
  return useQuery({
    queryKey: ['shopLocations', shopId, params],
    queryFn: () => shopLocationService.getShopLocations(shopId, params),
    enabled: !!shopId,
  });
};

/**
 * Hook for retrieving a single shop location by ID
 */
export const useShopLocation = (shopId: number, locationId: number) => {
  return useQuery({
    queryKey: ['shopLocation', shopId, locationId],
    queryFn: () => shopLocationService.getShopLocationById(shopId, locationId),
    enabled: !!shopId && !!locationId,
  });
};

/**
 * Hook for retrieving a shop location by its linked warehouse ID
 */
export const useShopLocationByWarehouseId = (shopId: number, warehouseId: number) => {
  return useQuery({
    queryKey: ['shopLocationByWarehouse', shopId, warehouseId],
    queryFn: () => shopLocationService.getShopLocationByWarehouseId(shopId, warehouseId),
    enabled: !!shopId && !!warehouseId,
  });
};

/**
 * Hook for creating a new shop location
 */
export const useCreateShopLocation = (shopId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (location: Omit<ShopLocation, 'id' | 'createdAt' | 'updatedAt'>) =>
      shopLocationService.createShopLocation(shopId, location),
    onSuccess: () => {
      // Invalidate the locations list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['shopLocations', shopId] });
    },
  });
};

/**
 * Hook for updating a shop location
 */
export const useUpdateShopLocation = (shopId: number, locationId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (location: Partial<ShopLocation>) =>
      shopLocationService.updateShopLocation(shopId, locationId, location),
    onSuccess: () => {
      // Invalidate both the locations list and the individual location query
      queryClient.invalidateQueries({ queryKey: ['shopLocations', shopId] });
      queryClient.invalidateQueries({ queryKey: ['shopLocation', shopId, locationId] });
    },
  });
};

/**
 * Hook for deleting a shop location
 */
export const useDeleteShopLocation = (shopId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationId: number) => shopLocationService.deleteShopLocation(shopId, locationId),
    onSuccess: () => {
      // Invalidate the locations list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['shopLocations', shopId] });
    },
  });
};

/**
 * Hook for toggling a shop location's active status
 */
export const useToggleShopLocationActive = (shopId: number, locationId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => shopLocationService.toggleShopLocationActive(shopId, locationId),
    onSuccess: () => {
      // Invalidate both the locations list and the individual location query
      queryClient.invalidateQueries({ queryKey: ['shopLocations', shopId] });
      queryClient.invalidateQueries({ queryKey: ['shopLocation', shopId, locationId] });
    },
  });
};

/**
 * Hook for finding nearby shop locations
 */
export const useNearbyShopLocations = (
  latitude: number,
  longitude: number,
  params?: {
    radius?: number;
    shopId?: number;
    limit?: number;
  }
) => {
  return useQuery({
    queryKey: ['nearbyShopLocations', latitude, longitude, params],
    queryFn: () => shopLocationService.getNearbyLocations(latitude, longitude, params),
    enabled: !!latitude && !!longitude,
  });
}; 