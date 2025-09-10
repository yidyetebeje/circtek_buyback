'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  shopModelPriceService, 
  UpdateModelPricePayload, 
  BulkUpdateAllShopsPayload, 
  ShopModelPrice 
} from '@/lib/api/catalog/shopModelPriceService';
import { ApiResponse } from '@/lib/api/types';
import { toast } from 'sonner';

/**
 * Hook for updating a single model price in a specific shop
 */
export const useUpdateModelPrice = () => {
  const queryClient = useQueryClient();
  
  return useMutation<ApiResponse<ShopModelPrice>, Error, UpdateModelPricePayload>({
    mutationFn: (payload) => shopModelPriceService.updateModelPrice(payload),
    onSuccess: (data, variables) => {
      // Invalidate relevant queries - match the new hook pattern
      queryClient.invalidateQueries({ 
        queryKey: ['shop-catalog', 'model', 'statuses', variables.shopId, variables.modelId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['shop-catalog', 'model', 'statuses', variables.shopId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['model', variables.modelId] 
      });
      
      toast.success(`Price updated successfully for shop ${variables.shopId}`);
    },
    onError: (error) => {
      toast.error(`Failed to update price: ${error.message}`);
    }
  });
};

/**
 * Hook for updating model price across all specified shops
 */
export const useUpdateModelPriceAllShops = () => {
  const queryClient = useQueryClient();
  
  return useMutation<ApiResponse<ShopModelPrice[]>, Error, BulkUpdateAllShopsPayload>({
    mutationFn: (payload) => shopModelPriceService.updateModelPriceAllShops(payload),
    onSuccess: (data, variables) => {
      // Invalidate queries with updated query key patterns
      queryClient.invalidateQueries({ queryKey: ['modelStatus'] });
      queryClient.invalidateQueries({ queryKey: ['modelStatuses'] });
      queryClient.invalidateQueries({ queryKey: ['modelStatusesForShops'] });
      queryClient.invalidateQueries({ queryKey: ['modelPricesForShops'] });
      
      queryClient.invalidateQueries({ 
        queryKey: ['model', variables.modelId] 
      });
      
      const successCount = data.data?.length || 0;
      const totalCount = variables.shopIds.length;
      
      if (successCount === totalCount) {
        toast.success(`Price updated successfully for all ${totalCount} shops`);
      } else {
        toast.warning(`Price updated for ${successCount} out of ${totalCount} shops`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to update prices: ${error.message}`);
    }
  });
};

/**
 * Hook for getting current model prices across shops
 * Note: This is a placeholder since the backend doesn't have this endpoint yet
 */
export const useModelPricesForShops = (modelId: number, shopIds: number[]) => {
  return useQuery<ApiResponse<ShopModelPrice[]>, Error>({
    queryKey: ['modelPricesForShops', modelId, shopIds.join(',')],
    queryFn: () => shopModelPriceService.getModelPricesForShops(modelId, shopIds),
    enabled: !!modelId && shopIds.length > 0,
  });
};

/**
 * Hook for getting model statuses across all shops - returns shop-specific prices and publish status
 */
export const useModelStatusesForAllShops = (modelId: number, shopIds: number[]) => {
  return useQuery({
    queryKey: ['modelStatusesForShops', modelId, shopIds.join(',')],
    queryFn: () => shopModelPriceService.getModelStatusesForAllShops(modelId, shopIds),
    enabled: !!modelId && shopIds.length > 0,
    staleTime: 5000, // Cache for 5 seconds
  });
}; 