/**
 * Shop Catalog Service
 * Handles all API operations related to publishing catalog entities to shops
 */

import { ApiClient, createApiClient } from '../base';
import { ApiResponse } from '../types';

// Response Types
export interface EntityStatusResponse {
  entityId: number;
  shopId: number;
  is_published: boolean;
  base_price?: number;
  model?: {
    id: number;
    title: string;
  };
}

export interface BulkStatusResponse {
  successful: EntityStatusResponse[];
  failed: { entityId: number; error: string }[];
}

// Request Types
export interface SingleEntityPublish {
  entityId: number;
  shopId: number;
  is_published: boolean;
}

export interface MultipleShopsEntityPublish {
  entityId: number;
  shopIds: number[];
  is_published: boolean;
}

export interface BulkPublish {
  entityIds: number[];
  shopId: number;
  is_published: boolean;
}

export interface BulkPublishToMultipleShops {
  entityIds: number[];
  shopIds: number[];
  is_published: boolean;
}

export interface BulkPublishData {
  shopId: number;
  entityIds: number[];
  is_published: boolean;
}

export interface SelectedEntities {
  categories: number[];
  brands: number[];
  modelSeries: number[];
}

export class ShopCatalogService {
  private apiClient: ApiClient;
  private basePath = '/api/catalog/shops/catalog/shop-catalog';

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  // Generic methods for all entity types
  private async getStatus(entityType: string, shopId: number, entityId: number): Promise<ApiResponse<EntityStatusResponse>> {
    return this.apiClient.get<ApiResponse<EntityStatusResponse>>(
      `${this.basePath}/${entityType}/status`,
      { params: { shopId, entityId } }
    );
  }

  private async getStatuses(entityType: string, shopId: number, entityIds?: number[]): Promise<ApiResponse<EntityStatusResponse[]>> {
    const params: Record<string, string | number> = { shopId };
    if (entityIds && entityIds.length > 0) {
      params.entityIds = entityIds.join(',');
    }
    return this.apiClient.get<ApiResponse<EntityStatusResponse[]>>(
      `${this.basePath}/${entityType}/statuses`,
      { params }
    );
  }

  private async publishEntity(entityType: string, data: SingleEntityPublish): Promise<ApiResponse<EntityStatusResponse>> {
    return this.apiClient.post<ApiResponse<EntityStatusResponse>>(
      `${this.basePath}/${entityType}/publish`,
      data
    );
  }

  private async publishEntityToMultipleShops(entityType: string, data: MultipleShopsEntityPublish): Promise<ApiResponse<EntityStatusResponse[]>> {
    return this.apiClient.post<ApiResponse<EntityStatusResponse[]>>(
      `${this.basePath}/${entityType}/publish-multiple-shops`,
      data
    );
  }

  private async bulkPublishEntities(entityType: string, data: BulkPublish): Promise<ApiResponse<BulkStatusResponse>> {
    return this.apiClient.post<ApiResponse<BulkStatusResponse>>(
      `${this.basePath}/${entityType}/bulk-publish`,
      data
    );
  }

  private async bulkPublishEntitiesToMultipleShops(entityType: string, data: BulkPublishToMultipleShops): Promise<ApiResponse<BulkStatusResponse>> {
    return this.apiClient.post<ApiResponse<BulkStatusResponse>>(
      `${this.basePath}/${entityType}/bulk-publish-multiple-shops`,
      data
    );
  }

  // Brand specific methods
  async getBrandStatus(shopId: number, entityId: number): Promise<ApiResponse<EntityStatusResponse>> {
    return this.getStatus('brands', shopId, entityId);
  }

  async getBrandStatuses(shopId: number, entityIds?: number[]): Promise<ApiResponse<EntityStatusResponse[]>> {
    return this.getStatuses('brands', shopId, entityIds);
  }

  async publishBrand(data: SingleEntityPublish): Promise<ApiResponse<EntityStatusResponse>> {
    return this.publishEntity('brands', data);
  }

  async publishBrandToMultipleShops(data: MultipleShopsEntityPublish): Promise<ApiResponse<EntityStatusResponse[]>> {
    return this.publishEntityToMultipleShops('brands', data);
  }

  async bulkPublishBrands(data: BulkPublish): Promise<ApiResponse<BulkStatusResponse>> {
    return this.bulkPublishEntities('brands', data);
  }

  async bulkPublishBrandsToMultipleShops(data: BulkPublishToMultipleShops): Promise<ApiResponse<BulkStatusResponse>> {
    return this.bulkPublishEntitiesToMultipleShops('brands', data);
  }

  // Category specific methods
  async getCategoryStatus(shopId: number, entityId: number): Promise<ApiResponse<EntityStatusResponse>> {
    return this.getStatus('categories', shopId, entityId);
  }

  async getCategoryStatuses(shopId: number, entityIds?: number[]): Promise<ApiResponse<EntityStatusResponse[]>> {
    return this.getStatuses('categories', shopId, entityIds);
  }

  async publishCategory(data: SingleEntityPublish): Promise<ApiResponse<EntityStatusResponse>> {
    return this.publishEntity('categories', data);
  }

  async publishCategoryToMultipleShops(data: MultipleShopsEntityPublish): Promise<ApiResponse<EntityStatusResponse[]>> {
    return this.publishEntityToMultipleShops('categories', data);
  }

  async bulkPublishCategories(data: BulkPublish): Promise<ApiResponse<BulkStatusResponse>> {
    return this.bulkPublishEntities('categories', data);
  }

  async bulkPublishCategoriesToMultipleShops(data: BulkPublishToMultipleShops): Promise<ApiResponse<BulkStatusResponse>> {
    return this.bulkPublishEntitiesToMultipleShops('categories', data);
  }

  // Model Series specific methods
  async getModelSeriesStatus(shopId: number, entityId: number): Promise<ApiResponse<EntityStatusResponse>> {
    return this.getStatus('model-series', shopId, entityId);
  }

  async getModelSeriesStatuses(shopId: number, entityIds?: number[]): Promise<ApiResponse<EntityStatusResponse[]>> {
    return this.getStatuses('model-series', shopId, entityIds);
  }

  async publishModelSeries(data: SingleEntityPublish): Promise<ApiResponse<EntityStatusResponse>> {
    return this.publishEntity('model-series', data);
  }

  async publishModelSeriesToMultipleShops(data: MultipleShopsEntityPublish): Promise<ApiResponse<EntityStatusResponse[]>> {
    return this.publishEntityToMultipleShops('model-series', data);
  }

  async bulkPublishModelSeries(data: BulkPublish): Promise<ApiResponse<BulkStatusResponse>> {
    return this.apiClient.post<ApiResponse<BulkStatusResponse>>(
      `${this.basePath}/model-series/bulk-publish`,
      data
    );
  }

  async bulkPublishModelSeriesToMultipleShops(data: BulkPublishToMultipleShops): Promise<ApiResponse<BulkStatusResponse>> {
    return this.bulkPublishEntitiesToMultipleShops('model-series', data);
  }

  // Model specific methods
  async getModelStatus(shopId: number, entityId: number): Promise<ApiResponse<EntityStatusResponse>> {
    return this.getStatus('models', shopId, entityId);
  }

  async getModelStatuses(shopId: number, entityIds?: number[]): Promise<ApiResponse<EntityStatusResponse[]>> {
    return this.getStatuses('models', shopId, entityIds);
  }

  async publishModel(data: SingleEntityPublish): Promise<ApiResponse<EntityStatusResponse>> {
    return this.publishEntity('models', data);
  }

  async publishModelToMultipleShops(data: MultipleShopsEntityPublish): Promise<ApiResponse<EntityStatusResponse[]>> {
    return this.publishEntityToMultipleShops('models', data);
  }

  async bulkPublishModels(data: BulkPublish): Promise<ApiResponse<BulkStatusResponse>> {
    return this.bulkPublishEntities('models', data);
  }

  async bulkPublishModelsToMultipleShops(data: BulkPublishToMultipleShops): Promise<ApiResponse<BulkStatusResponse>> {
    return this.bulkPublishEntitiesToMultipleShops('models', data);
  }

  async bulkPublishAll(shopId: number, entities: SelectedEntities): Promise<void> {
    const promises = [];

    if (entities.categories.length > 0) {
      promises.push(this.bulkPublishCategories({ shopId, entityIds: entities.categories, is_published: true }));
    }
    if (entities.brands.length > 0) {
      promises.push(this.bulkPublishBrands({ shopId, entityIds: entities.brands, is_published: true }));
    }
    if (entities.modelSeries.length > 0) {
      promises.push(this.bulkPublishModelSeries({ shopId, entityIds: entities.modelSeries, is_published: true }));
    }

    const results = await Promise.allSettled(promises);
    
    results.forEach(result => {
      if (result.status === 'rejected') {
        // Log or handle individual promise rejections
        console.error("A bulk publish operation failed:", result.reason);
      }
    });

    // Optionally, you can check if any failed and throw a summary error
    if (results.some(r => r.status === 'rejected')) {
        const failedCount = results.filter(r => r.status === 'rejected').length;
        throw new Error(`${failedCount} catalog publish operation(s) failed.`);
    }
  }
}

// Create a default instance
export const shopCatalogService = new ShopCatalogService();

// Export a function to create an instance with a specific client
export const createShopCatalogService = (apiClient?: ApiClient) => new ShopCatalogService(apiClient); 