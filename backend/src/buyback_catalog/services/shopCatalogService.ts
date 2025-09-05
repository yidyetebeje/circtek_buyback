import { shopCatalogRepository } from "../repositories/shopCatalogRepository";
import { 
  TBulkPublish, 
  TEntityStatusResponse, 
  TBulkStatusResponse, 
  TSingleEntityPublish,
  TShopModelPriceUpdate,
  TBulkPriceUpdate,
  TModelStatusResponse,
  TMultipleShopsEntityPublish,
  TBulkPublishToMultipleShops
} from "../types/shopCatalogTypes";
import { NotFoundError, BadRequestError } from "../utils/errors";

export class ShopCatalogService {
  // BRANDS
  async getBrandStatus(shopId: number, brandId: number): Promise<TEntityStatusResponse | null> {
    const status = await shopCatalogRepository.getBrandStatus(shopId, brandId);
    
    if (!status) return null;
    
    return {
      entityId: status.brand_id,
      shopId: status.shop_id,
      is_published: Boolean(status.is_published)
    };
  }
  
  async getBrandStatuses(shopId: number, brandIds?: number[]): Promise<TEntityStatusResponse[]> {
    const statuses = await shopCatalogRepository.getBrandStatuses(shopId, brandIds);
    
    // Filter out nulls and assert remaining values are non-null
    const nonNullStatuses = statuses.filter((status): status is NonNullable<typeof status> => status !== null);
    
    return nonNullStatuses.map(status => ({
      entityId: status.brand_id,
      shopId: status.shop_id,
      is_published: Boolean(status.is_published)
    }));
  }
  
  async publishBrand(data: TSingleEntityPublish): Promise<TEntityStatusResponse> {
    return this.publishEntityInShop(data.entityId, data.shopId, data.is_published, 'brand');
  }
  
  async publishBrandToMultipleShops(data: TMultipleShopsEntityPublish) {
    const results: TEntityStatusResponse[] = [];
    const errors: { shopId: number; error: string }[] = [];

    // Process each shop ID in parallel
    const promises = data.shopIds.map(shopId => 
      this.publishEntityInShop(data.entityId, shopId, data.is_published, 'brand')
        .then(result => results.push(result))
        .catch(error => errors.push({ shopId, error: error.message }))
    );

    await Promise.all(promises);

    return {
      successful: results,
      failed: errors
    };
  }
  
  async bulkPublishBrands(data: TBulkPublish): Promise<TBulkStatusResponse> {
    return this.bulkPublishEntitiesInShop(data.entityIds, data.shopId, data.is_published, 'brand');
  }
  
  async bulkPublishBrandsToMultipleShops(data: TBulkPublishToMultipleShops) {
    const results: TEntityStatusResponse[] = [];
    const errors: { entityId: number; shopId: number; error: string }[] = [];

    // Process each combination of entity and shop in parallel
    const promises = [];

    for (const entityId of data.entityIds) {
      for (const shopId of data.shopIds) {
        promises.push(
          this.publishEntityInShop(entityId, shopId, data.is_published, 'brand')
            .then(result => results.push(result))
            .catch(error => errors.push({ entityId, shopId, error: error.message }))
        );
      }
    }

    await Promise.all(promises);

    return {
      successful: results,
      failed: errors.map(({ entityId, error }) => ({ entityId, error })) // Format to match existing API
    };
  }
  
  // DEVICE CATEGORIES
  async getCategoryStatus(shopId: number, categoryId: number): Promise<TEntityStatusResponse | null> {
    const status = await shopCatalogRepository.getCategoryStatus(shopId, categoryId);
    
    if (!status) return null;
    
    return {
      entityId: status.category_id,
      shopId: status.shop_id,
      is_published: Boolean(status.is_published)
    };
  }
  
  async getCategoryStatuses(shopId: number, categoryIds?: number[]): Promise<TEntityStatusResponse[]> {
    const statuses = await shopCatalogRepository.getCategoryStatuses(shopId, categoryIds);
    
    // Filter out nulls and assert remaining values are non-null
    const nonNullStatuses = statuses.filter((status): status is NonNullable<typeof status> => status !== null);
    
    return nonNullStatuses.map(status => ({
      entityId: status.category_id,
      shopId: status.shop_id,
      is_published: Boolean(status.is_published)
    }));
  }
  
  async publishCategory(data: TSingleEntityPublish): Promise<TEntityStatusResponse> {
    return this.publishEntityInShop(data.entityId, data.shopId, data.is_published, 'category');
  }
  
  async publishCategoryToMultipleShops(data: TMultipleShopsEntityPublish) {
    const results: TEntityStatusResponse[] = [];
    const errors: { shopId: number; error: string }[] = [];

    // Process each shop ID in parallel
    const promises = data.shopIds.map(shopId => 
      this.publishEntityInShop(data.entityId, shopId, data.is_published, 'category')
        .then(result => results.push(result))
        .catch(error => errors.push({ shopId, error: error.message }))
    );

    await Promise.all(promises);

    return {
      successful: results,
      failed: errors
    };
  }
  
  async bulkPublishCategories(data: TBulkPublish): Promise<TBulkStatusResponse> {
    return this.bulkPublishEntitiesInShop(data.entityIds, data.shopId, data.is_published, 'category');
  }
  
  async bulkPublishCategoriesToMultipleShops(data: TBulkPublishToMultipleShops) {
    const results: TEntityStatusResponse[] = [];
    const errors: { entityId: number; shopId: number; error: string }[] = [];

    // Process each combination of entity and shop in parallel
    const promises = [];

    for (const entityId of data.entityIds) {
      for (const shopId of data.shopIds) {
        promises.push(
          this.publishEntityInShop(entityId, shopId, data.is_published, 'category')
            .then(result => results.push(result))
            .catch(error => errors.push({ entityId, shopId, error: error.message }))
        );
      }
    }

    await Promise.all(promises);

    return {
      successful: results,
      failed: errors.map(({ entityId, error }) => ({ entityId, error })) // Format to match existing API
    };
  }
  
  // MODEL SERIES
  async getModelSeriesStatus(shopId: number, seriesId: number): Promise<TEntityStatusResponse | null> {
    const status = await shopCatalogRepository.getModelSeriesStatus(shopId, seriesId);
    
    if (!status) return null;
    
    return {
      entityId: status.series_id,
      shopId: status.shop_id,
      is_published: Boolean(status.is_published)
    };
  }
  
  async getModelSeriesStatuses(shopId: number, seriesIds?: number[]): Promise<TEntityStatusResponse[]> {
    const statuses = await shopCatalogRepository.getModelSeriesStatuses(shopId, seriesIds);
    
    // Filter out nulls and assert remaining values are non-null
    const nonNullStatuses = statuses.filter((status): status is NonNullable<typeof status> => status !== null);
    
    return nonNullStatuses.map(status => ({
      entityId: status.series_id,
      shopId: status.shop_id,
      is_published: Boolean(status.is_published)
    }));
  }
  
  async publishModelSeries(data: TSingleEntityPublish): Promise<TEntityStatusResponse> {
    return this.publishEntityInShop(data.entityId, data.shopId, data.is_published, 'model-series');
  }
  
  async publishModelSeriesToMultipleShops(data: TMultipleShopsEntityPublish) {
    const results: TEntityStatusResponse[] = [];
    const errors: { shopId: number; error: string }[] = [];

    // Process each shop ID in parallel
    const promises = data.shopIds.map(shopId => 
      this.publishEntityInShop(data.entityId, shopId, data.is_published, 'model-series')
        .then(result => results.push(result))
        .catch(error => errors.push({ shopId, error: error.message }))
    );

    await Promise.all(promises);

    return {
      successful: results,
      failed: errors
    };
  }
  
  async bulkPublishModelSeries(data: TBulkPublish): Promise<TBulkStatusResponse> {
    return this.bulkPublishEntitiesInShop(data.entityIds, data.shopId, data.is_published, 'model-series');
  }
  
  async bulkPublishModelSeriesToMultipleShops(data: TBulkPublishToMultipleShops) {
    const results: TEntityStatusResponse[] = [];
    const errors: { entityId: number; shopId: number; error: string }[] = [];

    // Process each combination of entity and shop in parallel
    const promises = [];

    for (const entityId of data.entityIds) {
      for (const shopId of data.shopIds) {
        promises.push(
          this.publishEntityInShop(entityId, shopId, data.is_published, 'model-series')
            .then(result => results.push(result))
            .catch(error => errors.push({ entityId, shopId, error: error.message }))
        );
      }
    }

    await Promise.all(promises);

    return {
      successful: results,
      failed: errors.map(({ entityId, error }) => ({ entityId, error })) // Format to match existing API
    };
  }
  
  // MODELS
  async getModelStatus(shopId: number, modelId: number): Promise<TModelStatusResponse | null> {
    const status = await shopCatalogRepository.getModelStatus(shopId, modelId);
    
    if (!status) return null;
    
    return {
      entityId: status.model_id,
      shopId: status.shop_id,
      is_published: Boolean(status.is_published),
      base_price: status.base_price ?? undefined
    };
  }
  
  async getModelStatuses(shopId: number, modelIds?: number[]): Promise<TModelStatusResponse[]> {
    const statuses = await shopCatalogRepository.getModelStatuses(shopId, modelIds);
    
    // Filter out nulls and assert remaining values are non-null
    const nonNullStatuses = statuses.filter((status): status is NonNullable<typeof status> => status !== null);
    
    return nonNullStatuses.map(status => ({
      entityId: status.model_id,
      shopId: status.shop_id,
      is_published: Boolean(status.is_published),
      base_price: (status as any).base_price ?? undefined,
      model: (status as any).model ? {
        id: (status as any).model.id,
        title: (status as any).model.title
      } : undefined
    }));
  }
  
  async publishModel(data: TSingleEntityPublish): Promise<TEntityStatusResponse> {
    return this.publishEntityInShop(data.entityId, data.shopId, data.is_published, 'model');
  }
  
  async publishModelToMultipleShops(data: TMultipleShopsEntityPublish) {
    const results: TEntityStatusResponse[] = [];
    const errors: { shopId: number; error: string }[] = [];

    // Process each shop ID in parallel
    const promises = data.shopIds.map(shopId => 
      this.publishEntityInShop(data.entityId, shopId, data.is_published, 'model')
        .then(result => results.push(result))
        .catch(error => errors.push({ shopId, error: error.message }))
    );

    await Promise.all(promises);

    return {
      successful: results,
      failed: errors
    };
  }
  
  async bulkPublishModels(data: TBulkPublish): Promise<TBulkStatusResponse> {
    return this.bulkPublishEntitiesInShop(data.entityIds, data.shopId, data.is_published, 'model');
  }
  
  async bulkPublishModelsToMultipleShops(data: TBulkPublishToMultipleShops) {
    const results: TEntityStatusResponse[] = [];
    const errors: { entityId: number; shopId: number; error: string }[] = [];

    // Process each combination of entity and shop in parallel
    const promises = [];

    for (const entityId of data.entityIds) {
      for (const shopId of data.shopIds) {
        promises.push(
          this.publishEntityInShop(entityId, shopId, data.is_published, 'model')
            .then(result => results.push(result))
            .catch(error => errors.push({ entityId, shopId, error: error.message }))
        );
      }
    }

    await Promise.all(promises);

    return {
      successful: results,
      failed: errors.map(({ entityId, error }) => ({ entityId, error })) // Format to match existing API
    };
  }

  // PRICE MANAGEMENT
  async updateModelPrice(shopId: number, modelId: number, basePrice: number): Promise<{ modelId: number; shopId: number; basePrice: number }> {
    const result = await shopCatalogRepository.updateModelPrice(shopId, modelId, basePrice);
    
    return {
      modelId: result.model_id,
      shopId: result.shop_id,
      basePrice: (result as any).base_price ?? 0
    };
  }

  async updateBulkModelPrices(shopId: number, modelIds: number[], basePrice: number): Promise<{ modelId: number; shopId: number; basePrice: number }[]> {
    if (!modelIds.length) {
      throw new BadRequestError("No model IDs provided");
    }

    const results = await shopCatalogRepository.updateBulkModelPrices(shopId, modelIds, basePrice);
    
    // Filter out nulls and assert remaining values are non-null
    const nonNullResults = results.filter((result): result is NonNullable<typeof result> => result !== null);
    
    return nonNullResults.map(result => ({
      modelId: result.model_id,
      shopId: result.shop_id,
      basePrice: (result as any).base_price ?? basePrice
    }));
  }

  // Helper methods
  async publishEntityInShop(entityId: number, shopId: number, is_published: boolean, entityType: string): Promise<TEntityStatusResponse> {
    let result;
    
    switch (entityType) {
      case 'brand':
        result = await shopCatalogRepository.setBrandStatus({
          brand_id: entityId,
          shop_id: shopId,
          is_published: is_published ? 1 : 0
        });
        return {
          entityId: result.brand_id,
          shopId: result.shop_id,
          is_published: Boolean(result.is_published)
        };
      
      case 'category':
        result = await shopCatalogRepository.setCategoryStatus({
          category_id: entityId,
          shop_id: shopId,
          is_published: is_published ? 1 : 0
        });
        return {
          entityId: result.category_id,
          shopId: result.shop_id,
          is_published: Boolean(result.is_published)
        };
      
      case 'model-series':
        result = await shopCatalogRepository.setModelSeriesStatus({
          series_id: entityId,
          shop_id: shopId,
          is_published: is_published ? 1 : 0
        });
        return {
          entityId: result.series_id,
          shopId: result.shop_id,
          is_published: Boolean(result.is_published)
        };
      
      case 'model':
        result = await shopCatalogRepository.setModelStatus({
          model_id: entityId,
          shop_id: shopId,
          is_published: is_published ? 1 : 0
        });
        return {
          entityId: result.model_id,
          shopId: result.shop_id,
          is_published: Boolean(result.is_published)
        };
      
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  async bulkPublishEntitiesInShop(entityIds: number[], shopId: number, is_published: boolean, entityType: string): Promise<TBulkStatusResponse> {
    if (!entityIds.length) {
      throw new BadRequestError(`No ${entityType} IDs provided`);
    }
    
    let results;
    let successful: TEntityStatusResponse[] = [];
    let failed: { entityId: number; error: string }[] = [];
    
    switch (entityType) {
      case 'brand':
        results = await shopCatalogRepository.setBrandStatuses(
          shopId, 
          entityIds, 
          is_published ? 1 : 0
        );
        
        // Filter out nulls and assert remaining values are non-null
        const nonNullBrandResults = results.filter((result): result is NonNullable<typeof result> => result !== null);
        
        // Process all successful updates
        nonNullBrandResults.forEach(result => {
          successful.push({
            entityId: result.brand_id,
            shopId: result.shop_id,
            is_published: Boolean(result.is_published)
          });
        });
        break;
      
      case 'category':
        results = await shopCatalogRepository.setCategoryStatuses(
          shopId, 
          entityIds, 
          is_published ? 1 : 0
        );
        
        // Filter out nulls and assert remaining values are non-null
        const nonNullCategoryResults = results.filter((result): result is NonNullable<typeof result> => result !== null);
        
        // Process all successful updates
        nonNullCategoryResults.forEach(result => {
          successful.push({
            entityId: result.category_id,
            shopId: result.shop_id,
            is_published: Boolean(result.is_published)
          });
        });
        break;
      
      case 'model-series':
        results = await shopCatalogRepository.setModelSeriesStatuses(
          shopId, 
          entityIds, 
          is_published ? 1 : 0
        );
        
        // Filter out nulls and assert remaining values are non-null
        const nonNullModelSeriesResults = results.filter((result): result is NonNullable<typeof result> => result !== null);
        
        // Process all successful updates
        nonNullModelSeriesResults.forEach(result => {
          successful.push({
            entityId: result.series_id,
            shopId: result.shop_id,
            is_published: Boolean(result.is_published)
          });
        });
        break;
      
      case 'model':
        results = await shopCatalogRepository.setModelStatuses(
          shopId, 
          entityIds, 
          is_published ? 1 : 0
        );
        
        // Filter out nulls and assert remaining values are non-null
        const nonNullModelResults = results.filter((result): result is NonNullable<typeof result> => result !== null);
        
        // Process all successful updates
        nonNullModelResults.forEach(result => {
          successful.push({
            entityId: result.model_id,
            shopId: result.shop_id,
            is_published: Boolean(result.is_published)
          });
        });
        break;
      
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
    
    return { successful, failed };
  }
}

export const shopCatalogService = new ShopCatalogService(); 