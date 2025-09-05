import { Context } from "elysia";
import { shopCatalogService } from "../services/shopCatalogService";
import { TBulkPublish, TSingleEntityPublish, TEntityPublishStatus, TMultipleShopsEntityPublish, TBulkPublishToMultipleShops } from "../types/shopCatalogTypes";
import { BadRequestError, NotFoundError } from "../utils/errors";

export class ShopCatalogController {
  // BRANDS
  async getBrandStatus(ctx: Context) {
    try {
      const shopId = Number(ctx.query.shopId);
      const brandId = Number(ctx.query.entityId);
      
      if (isNaN(shopId) || isNaN(brandId)) {
        ctx.set.status = 400;
        return { error: 'Invalid shop ID or brand ID.' };
      }

      const status = await shopCatalogService.getBrandStatus(shopId, brandId);
      
      if (!status) {
        ctx.set.status = 404;
        return { error: `No publishing status found for brand ${brandId} in shop ${shopId}` };
      }
      
      return { data: status };
    } catch (error: any) {
      console.error("Error in ShopCatalogController.getBrandStatus:", error);
      ctx.set.status = 500;
      return { error: 'Failed to get brand status' };
    }
  }

  async getBrandStatuses(ctx: Context) {
    try {
      const shopId = Number(ctx.query.shopId);
      
      // Handle entityIds - can be array or string
      let entityIds: number[] | undefined;
      if (ctx.query.entityIds) {
        if (Array.isArray(ctx.query.entityIds)) {
          // Already an array of numbers
          entityIds = ctx.query.entityIds.map(id => Number(id));
        } else if (typeof ctx.query.entityIds === 'string') {
          // String that needs to be split
          entityIds = ctx.query.entityIds.split(',').map(id => Number(id));
        } else if (typeof ctx.query.entityIds === 'number') {
          // Single number
          entityIds = [Number(ctx.query.entityIds)];
        }
      }
      
      if (isNaN(shopId)) {
        ctx.set.status = 400;
        return { error: 'Invalid shop ID.' };
      }

      const statuses = await shopCatalogService.getBrandStatuses(shopId, entityIds);
      
      return { data: statuses };
    } catch (error: any) {
      console.error("Error in ShopCatalogController.getBrandStatuses:", error);
      ctx.set.status = 500;
      return { error: 'Failed to get brand statuses' };
    }
  }

  async publishBrand(data: TSingleEntityPublish, ctx: Context) {
    try {
      const result = await shopCatalogService.publishBrand(data);
      return { data: result };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.publishBrand:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update brand publishing status' };
    }
  }

  async publishBrandToMultipleShops(data: TMultipleShopsEntityPublish, ctx: Context) {
    try {
      const results = await shopCatalogService.publishBrandToMultipleShops(data);
      return { data: results };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.publishBrandToMultipleShops:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update brand publishing status for multiple shops' };
    }
  }

  async bulkPublishBrands(data: TBulkPublish, ctx: Context) {
    try {
      const results = await shopCatalogService.bulkPublishBrands(data);
      return { data: results };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.bulkPublishBrands:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update brand publishing statuses' };
    }
  }

  async bulkPublishBrandsToMultipleShops(data: TBulkPublishToMultipleShops, ctx: Context) {
    try {
      const results = await shopCatalogService.bulkPublishBrandsToMultipleShops(data);
      return { data: results };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.bulkPublishBrandsToMultipleShops:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update brand publishing statuses for multiple shops' };
    }
  }

  // DEVICE CATEGORIES
  async getCategoryStatus(ctx: Context) {
    try {
      const shopId = Number(ctx.query.shopId);
      const categoryId = Number(ctx.query.entityId);
      
      if (isNaN(shopId) || isNaN(categoryId)) {
        ctx.set.status = 400;
        return { error: 'Invalid shop ID or category ID.' };
      }

      const status = await shopCatalogService.getCategoryStatus(shopId, categoryId);
      
      if (!status) {
        ctx.set.status = 404;
        return { error: `No publishing status found for category ${categoryId} in shop ${shopId}` };
      }
      
      return { data: status };
    } catch (error: any) {
      console.error("Error in ShopCatalogController.getCategoryStatus:", error);
      ctx.set.status = 500;
      return { error: 'Failed to get category status' };
    }
  }

  async getCategoryStatuses(ctx: Context) {
    try {
      const shopId = Number(ctx.query.shopId);
      
      // Handle entityIds - can be array or string
      let entityIds: number[] | undefined;
      if (ctx.query.entityIds) {
        if (Array.isArray(ctx.query.entityIds)) {
          // Already an array of numbers
          entityIds = ctx.query.entityIds.map(id => Number(id));
        } else if (typeof ctx.query.entityIds === 'string') {
          // String that needs to be split
          entityIds = ctx.query.entityIds.split(',').map(id => Number(id));
        } else if (typeof ctx.query.entityIds === 'number') {
          // Single number
          entityIds = [Number(ctx.query.entityIds)];
        }
      }
      
      if (isNaN(shopId)) {
        ctx.set.status = 400;
        return { error: 'Invalid shop ID.' };
      }

      const statuses = await shopCatalogService.getCategoryStatuses(shopId, entityIds);
      
      return { data: statuses };
    } catch (error: any) {
      console.error("Error in ShopCatalogController.getCategoryStatuses:", error);
      ctx.set.status = 500;
      return { error: 'Failed to get category statuses' };
    }
  }

  async publishCategory(data: TSingleEntityPublish, ctx: Context) {
    try {
      const result = await shopCatalogService.publishCategory(data);
      return { data: result };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.publishCategory:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update category publishing status' };
    }
  }

  async publishCategoryToMultipleShops(data: TMultipleShopsEntityPublish, ctx: Context) {
    try {
      const results = await shopCatalogService.publishCategoryToMultipleShops(data);
      return { data: results };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.publishCategoryToMultipleShops:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update category publishing status for multiple shops' };
    }
  }

  async bulkPublishCategories(data: TBulkPublish, ctx: Context) {
    try {
      const results = await shopCatalogService.bulkPublishCategories(data);
      return { data: results };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.bulkPublishCategories:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update category publishing statuses' };
    }
  }

  async bulkPublishCategoriesToMultipleShops(data: TBulkPublishToMultipleShops, ctx: Context) {
    try {
      const results = await shopCatalogService.bulkPublishCategoriesToMultipleShops(data);
      return { data: results };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.bulkPublishCategoriesToMultipleShops:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update category publishing statuses for multiple shops' };
    }
  }

  // MODEL SERIES
  async getModelSeriesStatus(ctx: Context) {
    try {
      const shopId = Number(ctx.query.shopId);
      const seriesId = Number(ctx.query.entityId);
      
      if (isNaN(shopId) || isNaN(seriesId)) {
        ctx.set.status = 400;
        return { error: 'Invalid shop ID or model series ID.' };
      }

      const status = await shopCatalogService.getModelSeriesStatus(shopId, seriesId);
      
      if (!status) {
        ctx.set.status = 404;
        return { error: `No publishing status found for model series ${seriesId} in shop ${shopId}` };
      }
      
      return { data: status };
    } catch (error: any) {
      console.error("Error in ShopCatalogController.getModelSeriesStatus:", error);
      ctx.set.status = 500;
      return { error: 'Failed to get model series status' };
    }
  }

  async getModelSeriesStatuses(ctx: Context) {
    try {
      const shopId = Number(ctx.query.shopId);
      
      // Handle entityIds - can be array or string
      let entityIds: number[] | undefined;
      if (ctx.query.entityIds) {
        if (Array.isArray(ctx.query.entityIds)) {
          // Already an array of numbers
          entityIds = ctx.query.entityIds.map(id => Number(id));
        } else if (typeof ctx.query.entityIds === 'string') {
          // String that needs to be split
          entityIds = ctx.query.entityIds.split(',').map(id => Number(id));
        } else if (typeof ctx.query.entityIds === 'number') {
          // Single number
          entityIds = [Number(ctx.query.entityIds)];
        }
      }
      
      if (isNaN(shopId)) {
        ctx.set.status = 400;
        return { error: 'Invalid shop ID.' };
      }

      const statuses = await shopCatalogService.getModelSeriesStatuses(shopId, entityIds);
      
      return { data: statuses };
    } catch (error: any) {
      console.error("Error in ShopCatalogController.getModelSeriesStatuses:", error);
      ctx.set.status = 500;
      return { error: 'Failed to get model series statuses' };
    }
  }

  async publishModelSeries(data: TSingleEntityPublish, ctx: Context) {
    try {
      const result = await shopCatalogService.publishModelSeries(data);
      return { data: result };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.publishModelSeries:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update model series publishing status' };
    }
  }

  async publishModelSeriesToMultipleShops(data: TMultipleShopsEntityPublish, ctx: Context) {
    try {
      const results = await shopCatalogService.publishModelSeriesToMultipleShops(data);
      return { data: results };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.publishModelSeriesToMultipleShops:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update model series publishing status for multiple shops' };
    }
  }

  async bulkPublishModelSeries(data: TBulkPublish, ctx: Context) {
    try {
      const results = await shopCatalogService.bulkPublishModelSeries(data);
      return { data: results };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.bulkPublishModelSeries:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update model series publishing statuses' };
    }
  }

  async bulkPublishModelSeriesToMultipleShops(data: TBulkPublishToMultipleShops, ctx: Context) {
    try {
      const results = await shopCatalogService.bulkPublishModelSeriesToMultipleShops(data);
      return { data: results };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.bulkPublishModelSeriesToMultipleShops:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update model series publishing statuses for multiple shops' };
    }
  }

  // MODELS
  async getModelStatus(ctx: Context) {
    try {
      const shopId = Number(ctx.query.shopId);
      const modelId = Number(ctx.query.entityId);
      
      if (isNaN(shopId) || isNaN(modelId)) {
        ctx.set.status = 400;
        return { error: 'Invalid shop ID or model ID.' };
      }

      const status = await shopCatalogService.getModelStatus(shopId, modelId);
      
      if (!status) {
        ctx.set.status = 404;
        return { error: `No publishing status found for model ${modelId} in shop ${shopId}` };
      }
      
      return { data: status };
    } catch (error: any) {
      console.error("Error in ShopCatalogController.getModelStatus:", error);
      ctx.set.status = 500;
      return { error: 'Failed to get model status' };
    }
  }

  async getModelStatuses(ctx: Context) {
    try {
      const shopId = Number(ctx.query.shopId);
      
      // Handle entityIds - can be array or string
      let entityIds: number[] | undefined;
      if (ctx.query.entityIds) {
        if (Array.isArray(ctx.query.entityIds)) {
          // Already an array of numbers
          entityIds = ctx.query.entityIds.map(id => Number(id));
        } else if (typeof ctx.query.entityIds === 'string') {
          // String that needs to be split
          entityIds = ctx.query.entityIds.split(',').map(id => Number(id));
        } else if (typeof ctx.query.entityIds === 'number') {
          // Single number
          entityIds = [Number(ctx.query.entityIds)];
        }
      }
      
      if (isNaN(shopId)) {
        ctx.set.status = 400;
        return { error: 'Invalid shop ID.' };
      }

      const statuses = await shopCatalogService.getModelStatuses(shopId, entityIds);
      
      return { data: statuses };
    } catch (error: any) {
      console.error("Error in ShopCatalogController.getModelStatuses:", error);
      ctx.set.status = 500;
      return { error: 'Failed to get model statuses' };
    }
  }

  async publishModel(data: TSingleEntityPublish, ctx: Context) {
    try {
      const result = await shopCatalogService.publishModel(data);
      return { data: result };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.publishModel:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update model publishing status' };
    }
  }

  async publishModelToMultipleShops(data: TMultipleShopsEntityPublish, ctx: Context) {
    try {
      const results = await shopCatalogService.publishModelToMultipleShops(data);
      return { data: results };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.publishModelToMultipleShops:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update model publishing status for multiple shops' };
    }
  }

  async bulkPublishModels(data: TBulkPublish, ctx: Context) {
    try {
      const results = await shopCatalogService.bulkPublishModels(data);
      return { data: results };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.bulkPublishModels:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update model publishing statuses' };
    }
  }

  async bulkPublishModelsToMultipleShops(data: TBulkPublishToMultipleShops, ctx: Context) {
    try {
      const results = await shopCatalogService.bulkPublishModelsToMultipleShops(data);
      return { data: results };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.bulkPublishModelsToMultipleShops:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update model publishing statuses for multiple shops' };
    }
  }

  // PRICE MANAGEMENT METHODS
  async updateModelPrice(data: { shopId: number; modelId: number; basePrice: number }, ctx: Context) {
    try {
      const result = await shopCatalogService.updateModelPrice(data.shopId, data.modelId, data.basePrice);
      return { data: result };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.updateModelPrice:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update model price' };
    }
  }

  async updateBulkModelPrices(data: { shopId: number; modelIds: number[]; basePrice: number }, ctx: Context) {
    try {
      const result = await shopCatalogService.updateBulkModelPrices(data.shopId, data.modelIds, data.basePrice);
      return { data: result };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopCatalogController.updateBulkModelPrices:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update model prices' };
    }
  }
}

export const shopCatalogController = new ShopCatalogController(); 