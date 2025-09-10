'use client';

import { useMutation, useQuery, useQueryClient, useQueries } from '@tanstack/react-query';
import { shopCatalogService, SingleEntityPublish, BulkPublish } from '@/lib/api/catalog/shopCatalogService';

// Base hooks for entity statuses in shops

export const useEntityStatus = (entityType: string, shopId: number, entityId: number) => {
  let entityQueryKey;
  switch (entityType) {
    case 'brand':
      entityQueryKey = 'brandStatus';
      break;
    case 'category':
      entityQueryKey = 'categoryStatus';
      break;
    case 'model-series':
      entityQueryKey = 'modelSeriesStatus';
      break;
    case 'model':
      entityQueryKey = 'modelStatus';
      break;
    default:
      entityQueryKey = 'entityStatus';
  }

  const queryKey = [entityQueryKey, shopId, entityId];
  
  const getEntityStatus = () => {
    switch (entityType) {
      case 'brand':
        return shopCatalogService.getBrandStatus(shopId, entityId);
      case 'category':
        return shopCatalogService.getCategoryStatus(shopId, entityId);
      case 'model-series':
        return shopCatalogService.getModelSeriesStatus(shopId, entityId);
      case 'model':
        return shopCatalogService.getModelStatus(shopId, entityId);
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  };
  
  return useQuery({
    queryKey,
    queryFn: getEntityStatus,
    enabled: !!shopId && !!entityId,
  });
};

export const useEntityStatuses = (entityType: string, shopId: number, entityIds?: number[]) => {
  let entityQueryKey;
  switch (entityType) {
    case 'brand':
      entityQueryKey = 'brandStatuses';
      break;
    case 'category':
      entityQueryKey = 'categoryStatuses';
      break;
    case 'model-series':
      entityQueryKey = 'modelSeriesStatuses';
      break;
    case 'model':
      entityQueryKey = 'modelStatuses';
      break;
    default:
      entityQueryKey = 'entityStatuses';
  }

  const queryKey = [entityQueryKey, shopId, entityIds ? entityIds.join(',') : 'all'];
  
  const getEntityStatuses = () => {
    switch (entityType) {
      case 'brand':
        return shopCatalogService.getBrandStatuses(shopId, entityIds);
      case 'category':
        return shopCatalogService.getCategoryStatuses(shopId, entityIds);
      case 'model-series':
        return shopCatalogService.getModelSeriesStatuses(shopId, entityIds);
      case 'model':
        return shopCatalogService.getModelStatuses(shopId, entityIds);
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  };
  
  return useQuery({
    queryKey,
    queryFn: getEntityStatuses,
    enabled: !!shopId,
  });
};

export const usePublishEntity = (entityType: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: SingleEntityPublish) => {
      switch (entityType) {
        case 'brand':
          return shopCatalogService.publishBrand(data);
        case 'category':
          return shopCatalogService.publishCategory(data);
        case 'model-series':
          return shopCatalogService.publishModelSeries(data);
        case 'model':
          return shopCatalogService.publishModel(data);
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }
    },
    onSuccess: (_, variables) => {
      const { entityId, shopId } = variables;
      
      // Invalidate with updated query key structure
      switch (entityType) {
        case 'brand':
          queryClient.invalidateQueries({ queryKey: ['brandStatus'] });
          queryClient.invalidateQueries({ queryKey: ['brandStatuses'] });
          queryClient.invalidateQueries({ queryKey: ['brand', entityId] });
          queryClient.invalidateQueries({ queryKey: ['brands'] });
          break;
        case 'category':
          queryClient.invalidateQueries({ queryKey: ['categoryStatus'] });
          queryClient.invalidateQueries({ queryKey: ['categoryStatuses'] });
          queryClient.invalidateQueries({ queryKey: ['category', entityId] });
          queryClient.invalidateQueries({ queryKey: ['categories'] });
          break;
        case 'model-series':
          queryClient.invalidateQueries({ queryKey: ['modelSeriesStatus'] });
          queryClient.invalidateQueries({ queryKey: ['modelSeriesStatuses'] });
          queryClient.invalidateQueries({ queryKey: ['modelSeries', entityId] });
          queryClient.invalidateQueries({ queryKey: ['modelSeries'] });
          break;
        case 'model':
          queryClient.invalidateQueries({ queryKey: ['modelStatus'] });
          queryClient.invalidateQueries({ queryKey: ['modelStatuses'] });
          queryClient.invalidateQueries({ queryKey: ['modelStatusesForShops'] });
          queryClient.invalidateQueries({ queryKey: ['modelPricesForShops'] });
          queryClient.invalidateQueries({ queryKey: ['model', entityId] });
          queryClient.invalidateQueries({ queryKey: ['models'] });
          break;
      }
      
      // Generic entity status invalidation
      queryClient.invalidateQueries({ queryKey: ['entityStatus'] });
      queryClient.invalidateQueries({ queryKey: ['entityStatuses'] });
      
      // Invalidate shop queries to refresh any shop-related data
      queryClient.invalidateQueries({ queryKey: ['shop', shopId] });
    },
  });
};

export const useBulkPublishEntities = (entityType: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: BulkPublish) => {
      switch (entityType) {
        case 'brand':
          return shopCatalogService.bulkPublishBrands(data);
        case 'category':
          return shopCatalogService.bulkPublishCategories(data);
        case 'model-series':
          return shopCatalogService.bulkPublishModelSeries(data);
        case 'model':
          return shopCatalogService.bulkPublishModels(data);
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }
    },
    onSuccess: (_, variables) => {
      const { entityIds, shopId } = variables;
      
      // Invalidate with updated query key structure
      switch (entityType) {
        case 'brand':
          queryClient.invalidateQueries({ queryKey: ['brandStatus'] });
          queryClient.invalidateQueries({ queryKey: ['brandStatuses'] });
          
          // Invalidate each entity individually
          entityIds.forEach(id => {
            queryClient.invalidateQueries({ queryKey: ['brand', id] });
          });
          
          queryClient.invalidateQueries({ queryKey: ['brands'] });
          break;
        case 'category':
          queryClient.invalidateQueries({ queryKey: ['categoryStatus'] });
          queryClient.invalidateQueries({ queryKey: ['categoryStatuses'] });
          
          // Invalidate each entity individually
          entityIds.forEach(id => {
            queryClient.invalidateQueries({ queryKey: ['category', id] });
          });
          
          queryClient.invalidateQueries({ queryKey: ['categories'] });
          break;
        case 'model-series':
          queryClient.invalidateQueries({ queryKey: ['modelSeriesStatus'] });
          queryClient.invalidateQueries({ queryKey: ['modelSeriesStatuses'] });
          
          // Invalidate each entity individually
          entityIds.forEach(id => {
            queryClient.invalidateQueries({ queryKey: ['modelSeries', id] });
          });
          
          queryClient.invalidateQueries({ queryKey: ['modelSeries'] });
          break;
        case 'model':
          queryClient.invalidateQueries({ queryKey: ['modelStatus'] });
          queryClient.invalidateQueries({ queryKey: ['modelStatuses'] });
          queryClient.invalidateQueries({ queryKey: ['modelStatusesForShops'] });
          queryClient.invalidateQueries({ queryKey: ['modelPricesForShops'] });
          
          // Invalidate each entity individually
          entityIds.forEach(id => {
            queryClient.invalidateQueries({ queryKey: ['model', id] });
          });
          
          queryClient.invalidateQueries({ queryKey: ['models'] });
          break;
      }
      
      // Generic entity status invalidation
      queryClient.invalidateQueries({ queryKey: ['entityStatus'] });
      queryClient.invalidateQueries({ queryKey: ['entityStatuses'] });
      
      // Invalidate shop queries to refresh any shop-related data
      queryClient.invalidateQueries({ queryKey: ['shop', shopId] });
    },
  });
};

// Typed hooks for specific entity types

// Brand hooks
export const useBrandStatus = (shopId: number, entityId: number) => 
  useEntityStatus('brand', shopId, entityId);

export const useBrandStatuses = (shopId: number, entityIds?: number[]) => 
  useEntityStatuses('brand', shopId, entityIds);

export const usePublishBrand = () => 
  usePublishEntity('brand');

export const useBulkPublishBrands = () => 
  useBulkPublishEntities('brand');

// Category hooks
export const useCategoryStatus = (shopId: number, entityId: number) => 
  useEntityStatus('category', shopId, entityId);

export const useCategoryStatuses = (shopId: number, entityIds?: number[]) => 
  useEntityStatuses('category', shopId, entityIds);

export const usePublishCategory = () => 
  usePublishEntity('category');

export const useBulkPublishCategories = () => 
  useBulkPublishEntities('category');

// Model Series hooks
export const useModelSeriesStatus = (shopId: number, entityId: number) => 
  useEntityStatus('model-series', shopId, entityId);

export const useModelSeriesStatuses = (shopId: number, entityIds?: number[]) => 
  useEntityStatuses('model-series', shopId, entityIds);

export const usePublishModelSeries = () => 
  usePublishEntity('model-series');

export const useBulkPublishModelSeries = () => 
  useBulkPublishEntities('model-series');

// Model hooks
export const useModelStatus = (shopId: number, entityId: number) => 
  useEntityStatus('model', shopId, entityId);

export const useModelStatuses = (shopId: number, entityIds?: number[]) => 
  useEntityStatuses('model', shopId, entityIds);

export const usePublishModel = () => 
  usePublishEntity('model');

export const useBulkPublishModels = () => 
  useBulkPublishEntities('model');

export const useModelStatusesForShops = (modelId: number, shopIds: number[]) => {
  const results = useQueries({
    queries: shopIds.map(shopId => ({
      queryKey: ['modelStatusesForShops', modelId, shopId.toString()],
      queryFn: () => shopCatalogService.getModelStatuses(shopId, [modelId]),
      enabled: !!modelId && !!shopId,
      staleTime: 5000,
    }))
  });

  // Transform the results to match the expected format
  const transformedData = results.map((result, index) => ({
    shopId: shopIds[index],
    data: result.data?.data?.[0] || null
  }));

  const isLoading = results.some(result => result.isLoading);
  const isError = results.some(result => result.isError);

  return {
    data: transformedData,
    isLoading,
    isError
  };
}; 