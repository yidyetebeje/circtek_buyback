'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { shopService } from '@/lib/api/catalog/shopService';
import { Shop } from '@/types/catalog';
import { ApiResponse, QueryParams } from '@/lib/api/types';
import { ShopConfig } from '@/types/shop';

/**
 * Hook for retrieving a paginated list of shops
 */
export const useShops = (params?: QueryParams) => {
  return useQuery({
    queryKey: ['shops', params],
    queryFn: () => shopService.getShops(params),
  });
};

/**
 * Hook for retrieving a single shop by ID
 */
export const useShop = (id: number) => {
  return useQuery({
    queryKey: ['shop', id],
    queryFn: () => shopService.getShopById(id),
    enabled: !!id,
  });
};

/**
 * Hook for retrieving published categories for a shop
 * Returns a list of {@link CategoryType} objects
 */
export const usePublishedCategories = (shopId: number, params?: QueryParams) => {
  return useQuery({
    queryKey: ['publishedCategories', shopId, params],
    queryFn: () => shopService.getPublishedCategories(shopId, params),
    enabled: !!shopId,
  });
};

/**
 * Hook for creating a new shop
 */
export const useCreateShop = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (shop: Omit<Shop, 'id' | 'createdAt' | 'updatedAt'>) => {
      // The form and service layer handle validation, so we just pass the data.
      const cleanShop = {
        ...shop,
        name: shop.name?.trim(),
        organization: shop.organization?.trim() || '',
        phone: shop.phone?.trim() || '',
        logo: shop.logo?.trim() || ''
      };
      
      return shopService.createShop(cleanShop);
    },
    onSuccess: () => {
      toast.success('Shop created successfully!');
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
    onError: (error) => {
      /* Central error handling is performed at a higher level (e.g., ShopStepper).
         Suppress local toast to prevent duplicate notifications. */
      console.error("Error creating shop:", error);
    },
  });
};

/**
 * Hook for updating a shop
 */
export const useUpdateShop = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...shopData }: { id: number } & Partial<Shop>) => 
      shopService.updateShop(id, shopData),
    onSuccess: (data, variables) => {
      // Invalidate both the shops list and the individual shop query
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      queryClient.invalidateQueries({ queryKey: ['shop', variables.id] });
    },
  });
};

/**
 * Hook for deleting a shop
 */
export const useDeleteShop = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => shopService.deleteShop(id),
    onSuccess: () => {
      // Invalidate the shops list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });
};

/**
 * Hook for uploading a shop logo
 */
export const useUploadShopLogo = () => {
  const queryClient = useQueryClient();
  
  return useMutation<
    ApiResponse<{ logoUrl: string }>, 
    Error, 
    { shopId: number; file: File } 
  >({
    mutationFn: ({ shopId, file }: { shopId: number; file: File }) => 
      shopService.uploadShopLogo(shopId, file),
    onSuccess: (data, variables) => {
      console.log('Logo upload success:', data);
      queryClient.invalidateQueries({ queryKey: ['shop', variables.shopId] });
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
    onError: (error) => {
      console.error("Error uploading shop logo:", error);
      // Log more details if available
      if ('response' in error) {
        // @ts-expect-error - Error might have additional properties from Axios
        console.error('Response details:', error.response?.data);
      }
    }
  });
};



/**
 * Hook for retrieving published models for a specific category in a shop
 * Returns a list of {@link Model} objects
 */
export const usePublishedModelsByCategorySlug = (
  shopId: number, 
  categorySlug: string, 
  params?: QueryParams & {
    orderBy?: string;
    order?: 'asc' | 'desc';
    search?: string;
    brandId?: number;
    modelSeriesId?: number;
    tenantId?: number;
  }
) => {
  return useQuery({
    queryKey: ['publishedModels', shopId, categorySlug, params],
    queryFn: () => shopService.getPublishedModelsByCategorySlug(shopId, categorySlug, params),
    enabled: !!shopId && !!categorySlug,
  });
};

/**
 * Hook for retrieving shop configuration
 */
export const useShopConfig = (shopId: number) => {
  return useQuery({
    queryKey: ['shopConfig', shopId],
    queryFn: () => shopService.getShopConfig(shopId),
    enabled: !!shopId,
  });
};

/**
 * Hook for updating shop configuration
 */
export const useUpdateShopConfig = (shopId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: ShopConfig) => shopService.updateShopConfig(shopId, config),
    onSuccess: () => {
      // Invalidate the shop config query to refetch it
      queryClient.invalidateQueries({ queryKey: ['shopConfig', shopId] });
    },
  });
}; 