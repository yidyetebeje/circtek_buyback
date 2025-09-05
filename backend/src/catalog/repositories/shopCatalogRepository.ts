import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { 
  shopBrands, 
  shopDeviceCategories, 
  shopModelSeries, 
  shopModels,
  brands,
  deviceCategories,
  modelSeries,
  models
} from "../../db/schema/catalog";
import { 
  TShopBrandInsert, 
  TShopCategoryInsert, 
  TShopModelSeriesInsert, 
  TShopModelInsert,
  TShopModelPriceUpdate,
  TBulkPriceUpdate
} from "../types/shopCatalogTypes";

// Helper to remove undefined keys from an object
function removeUndefinedKeys<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}

export class ShopCatalogRepository {
  // BRANDS
  async getBrandStatus(shopId: number, brandId: number) {
    return db.query.shopBrands.findFirst({
      where: and(
        eq(shopBrands.shop_id, shopId),
        eq(shopBrands.brand_id, brandId)
      )
    });
  }

  async getBrandStatuses(shopId: number, brandIds?: number[]) {
    const whereCondition = brandIds?.length 
      ? and(
          eq(shopBrands.shop_id, shopId),
          inArray(shopBrands.brand_id, brandIds)
        )
      : eq(shopBrands.shop_id, shopId);

    const results = await db.query.shopBrands.findMany({
      where: whereCondition,
      with: {
        brand: {
          columns: {
            id: true,
            title: true
          }
        }
      }
    });

    // If brandIds were provided, ensure we return status for all requested ids
    if (brandIds?.length) {
      // Create a map of existing statuses
      const statusMap = new Map(results.map(r => [r.brand_id, r]));
      
      // Return results for all brandIds, with null for those not found
      return Promise.all(brandIds.map(async (brandId) => {
        const status = statusMap.get(brandId);
        if (status) return status;
        
        // Check if brand exists
        const brandExists = await db.query.brands.findFirst({
          where: eq(brands.id, brandId),
          columns: { id: true, title: true }
        });
        
        if (!brandExists) return null;
        
        // Return default unpublished status
        return { 
          id: 0, 
          shop_id: shopId, 
          brand_id: brandId, 
          is_published: 0,
          createdAt: null,
          updatedAt: null,
          brand: brandExists
        };
      })).then(results => results.filter(Boolean));
    }

    return results;
  }

  async setBrandStatus(data: TShopBrandInsert) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

    // Check if the relationship already exists
    const existing = await this.getBrandStatus(data.shop_id, data.brand_id);
    
    if (existing) {
      // Update existing
      await db.update(shopBrands)
        .set({ 
          is_published: data.is_published,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shopBrands.shop_id, data.shop_id),
          eq(shopBrands.brand_id, data.brand_id)
        ));
      
      return {
        ...existing,
        is_published: data.is_published,
        updatedAt: formattedDate
      };
    } else {
      // Create new
      const dbData = {
        shop_id: data.shop_id,
        brand_id: data.brand_id,
        is_published: data.is_published,
        createdAt: formattedDate,
        updatedAt: formattedDate
      };

      const result = await db.insert(shopBrands).values(dbData);
      const insertId = result?.[0]?.insertId ?? 0;
      
      return {
        id: insertId,
        ...dbData
      };
    }
  }

  async setBrandStatuses(shopId: number, brandIds: number[], isPublished: number) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

    // Get existing relationships
    const existing = await db.query.shopBrands.findMany({
      where: and(
        eq(shopBrands.shop_id, shopId),
        inArray(shopBrands.brand_id, brandIds)
      ),
      columns: {
        brand_id: true
      }
    });

    const existingBrandIds = existing.map(e => e.brand_id);
    const newBrandIds = brandIds.filter(id => !existingBrandIds.includes(id));

    // Update existing
    if (existingBrandIds.length > 0) {
      await db.update(shopBrands)
        .set({ 
          is_published: isPublished,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shopBrands.shop_id, shopId),
          inArray(shopBrands.brand_id, existingBrandIds)
        ));
    }

    // Create new
    if (newBrandIds.length > 0) {
      const values = newBrandIds.map(brandId => ({
        shop_id: shopId,
        brand_id: brandId,
        is_published: isPublished,
        createdAt: formattedDate,
        updatedAt: formattedDate
      }));

      await db.insert(shopBrands).values(values);
    }

    // Return updated statuses
    return this.getBrandStatuses(shopId, brandIds);
  }

  // DEVICE CATEGORIES
  async getCategoryStatus(shopId: number, categoryId: number) {
    return db.query.shopDeviceCategories.findFirst({
      where: and(
        eq(shopDeviceCategories.shop_id, shopId),
        eq(shopDeviceCategories.category_id, categoryId)
      )
    });
  }

  async getCategoryStatuses(shopId: number, categoryIds?: number[]) {
    const whereCondition = categoryIds?.length 
      ? and(
          eq(shopDeviceCategories.shop_id, shopId),
          inArray(shopDeviceCategories.category_id, categoryIds)
        )
      : eq(shopDeviceCategories.shop_id, shopId);

    const results = await db.query.shopDeviceCategories.findMany({
      where: whereCondition,
      with: {
        category: {
          columns: {
            id: true,
            title: true
          }
        }
      }
    });

    // If categoryIds were provided, ensure we return status for all requested ids
    if (categoryIds?.length) {
      // Create a map of existing statuses
      const statusMap = new Map(results.map(r => [r.category_id, r]));
      
      // Return results for all categoryIds, with null for those not found
      return Promise.all(categoryIds.map(async (categoryId) => {
        const status = statusMap.get(categoryId);
        if (status) return status;
        
        // Check if category exists
        const categoryExists = await db.query.deviceCategories.findFirst({
          where: eq(deviceCategories.id, categoryId),
          columns: { id: true, title: true }
        });
        
        if (!categoryExists) return null;
        
        // Return default unpublished status
        return { 
          id: 0, 
          shop_id: shopId, 
          category_id: categoryId, 
          is_published: 0,
          createdAt: null,
          updatedAt: null,
          category: categoryExists
        };
      })).then(results => results.filter(Boolean));
    }

    return results;
  }

  async setCategoryStatus(data: TShopCategoryInsert) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

    // Check if the relationship already exists
    const existing = await this.getCategoryStatus(data.shop_id, data.category_id);
    
    if (existing) {
      // Update existing
      await db.update(shopDeviceCategories)
        .set({ 
          is_published: data.is_published,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shopDeviceCategories.shop_id, data.shop_id),
          eq(shopDeviceCategories.category_id, data.category_id)
        ));
      
      return {
        ...existing,
        is_published: data.is_published,
        updatedAt: formattedDate
      };
    } else {
      // Create new
      const dbData = {
        shop_id: data.shop_id,
        category_id: data.category_id,
        is_published: data.is_published,
        createdAt: formattedDate,
        updatedAt: formattedDate
      };

      const result = await db.insert(shopDeviceCategories).values(dbData);
      const insertId = result?.[0]?.insertId ?? 0;
      
      return {
        id: insertId,
        ...dbData
      };
    }
  }

  async setCategoryStatuses(shopId: number, categoryIds: number[], isPublished: number) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

    // Get existing relationships
    const existing = await db.query.shopDeviceCategories.findMany({
      where: and(
        eq(shopDeviceCategories.shop_id, shopId),
        inArray(shopDeviceCategories.category_id, categoryIds)
      ),
      columns: {
        category_id: true
      }
    });

    const existingCategoryIds = existing.map(e => e.category_id);
    const newCategoryIds = categoryIds.filter(id => !existingCategoryIds.includes(id));

    // Update existing
    if (existingCategoryIds.length > 0) {
      await db.update(shopDeviceCategories)
        .set({ 
          is_published: isPublished,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shopDeviceCategories.shop_id, shopId),
          inArray(shopDeviceCategories.category_id, existingCategoryIds)
        ));
    }

    // Create new
    if (newCategoryIds.length > 0) {
      const values = newCategoryIds.map(categoryId => ({
        shop_id: shopId,
        category_id: categoryId,
        is_published: isPublished,
        createdAt: formattedDate,
        updatedAt: formattedDate
      }));

      await db.insert(shopDeviceCategories).values(values);
    }

    // Return updated statuses
    return this.getCategoryStatuses(shopId, categoryIds);
  }

  // MODEL SERIES
  async getModelSeriesStatus(shopId: number, seriesId: number) {
    return db.query.shopModelSeries.findFirst({
      where: and(
        eq(shopModelSeries.shop_id, shopId),
        eq(shopModelSeries.series_id, seriesId)
      )
    });
  }

  async getModelSeriesStatuses(shopId: number, seriesIds?: number[]) {
    const whereCondition = seriesIds?.length 
      ? and(
          eq(shopModelSeries.shop_id, shopId),
          inArray(shopModelSeries.series_id, seriesIds)
        )
      : eq(shopModelSeries.shop_id, shopId);

    const results = await db.query.shopModelSeries.findMany({
      where: whereCondition,
      with: {
        series: {
          columns: {
            id: true,
            title: true
          }
        }
      }
    });

    // If seriesIds were provided, ensure we return status for all requested ids
    if (seriesIds?.length) {
      // Create a map of existing statuses
      const statusMap = new Map(results.map(r => [r.series_id, r]));
      
      // Return results for all seriesIds, with null for those not found
      return Promise.all(seriesIds.map(async (seriesId) => {
        const status = statusMap.get(seriesId);
        if (status) return status;
        
        // Check if series exists
        const seriesExists = await db.query.modelSeries.findFirst({
          where: eq(modelSeries.id, seriesId),
          columns: { id: true, title: true }
        });
        
        if (!seriesExists) return null;
        
        // Return default unpublished status
        return { 
          id: 0, 
          shop_id: shopId, 
          series_id: seriesId, 
          is_published: 0,
          createdAt: null,
          updatedAt: null,
          series: seriesExists
        };
      })).then(results => results.filter(Boolean));
    }

    return results;
  }

  async setModelSeriesStatus(data: TShopModelSeriesInsert) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

    // Check if the relationship already exists
    const existing = await this.getModelSeriesStatus(data.shop_id, data.series_id);
    
    if (existing) {
      // Update existing
      await db.update(shopModelSeries)
        .set({ 
          is_published: data.is_published,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shopModelSeries.shop_id, data.shop_id),
          eq(shopModelSeries.series_id, data.series_id)
        ));
      
      return {
        ...existing,
        is_published: data.is_published,
        updatedAt: formattedDate
      };
    } else {
      // Create new
      const dbData = {
        shop_id: data.shop_id,
        series_id: data.series_id,
        is_published: data.is_published,
        createdAt: formattedDate,
        updatedAt: formattedDate
      };

      const result = await db.insert(shopModelSeries).values(dbData);
      const insertId = result?.[0]?.insertId ?? 0;
      
      return {
        id: insertId,
        ...dbData
      };
    }
  }

  async setModelSeriesStatuses(shopId: number, seriesIds: number[], isPublished: number) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

    // Get existing relationships
    const existing = await db.query.shopModelSeries.findMany({
      where: and(
        eq(shopModelSeries.shop_id, shopId),
        inArray(shopModelSeries.series_id, seriesIds)
      ),
      columns: {
        series_id: true
      }
    });

    const existingSeriesIds = existing.map(e => e.series_id);
    const newSeriesIds = seriesIds.filter(id => !existingSeriesIds.includes(id));

    // Update existing
    if (existingSeriesIds.length > 0) {
      await db.update(shopModelSeries)
        .set({ 
          is_published: isPublished,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shopModelSeries.shop_id, shopId),
          inArray(shopModelSeries.series_id, existingSeriesIds)
        ));
    }

    // Create new
    if (newSeriesIds.length > 0) {
      const values = newSeriesIds.map(seriesId => ({
        shop_id: shopId,
        series_id: seriesId,
        is_published: isPublished,
        createdAt: formattedDate,
        updatedAt: formattedDate
      }));

      await db.insert(shopModelSeries).values(values);
    }

    // Return updated statuses
    return this.getModelSeriesStatuses(shopId, seriesIds);
  }

  // MODELS
  async getModelStatus(shopId: number, modelId: number) {
    return db.query.shopModels.findFirst({
      where: and(
        eq(shopModels.shop_id, shopId),
        eq(shopModels.model_id, modelId)
      )
    });
  }

  async getModelStatuses(shopId: number, modelIds?: number[]) {
    const whereCondition = modelIds?.length 
      ? and(
          eq(shopModels.shop_id, shopId),
          inArray(shopModels.model_id, modelIds)
        )
      : eq(shopModels.shop_id, shopId);

    const results = await db.query.shopModels.findMany({
      where: whereCondition,
      with: {
        model: {
          columns: {
            id: true,
            title: true
          }
        }
      }
    });

    // If modelIds were provided, ensure we return status for all requested ids
    if (modelIds?.length) {
      // Create a map of existing statuses
      const statusMap = new Map(results.map(r => [r.model_id, r]));
      
      // Return results for all modelIds, with null for those not found
      return Promise.all(modelIds.map(async (modelId) => {
        const status = statusMap.get(modelId);
        if (status) return status;
        
        // Check if model exists
        const modelExists = await db.query.models.findFirst({
          where: eq(models.id, modelId),
          columns: { id: true, title: true }
        });
        
        if (!modelExists) return null;
        
        // Return default unpublished status
        return { 
          id: 0, 
          shop_id: shopId, 
          model_id: modelId, 
          is_published: 0,
          createdAt: null,
          updatedAt: null,
          model: modelExists
        };
      })).then(results => results.filter(Boolean));
    }

    return results;
  }

  async setModelStatus(data: TShopModelInsert) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

    // Check if the relationship already exists
    const existing = await this.getModelStatus(data.shop_id, data.model_id);
    
    if (existing) {
      // Update existing
      const updateData: any = {
        is_published: data.is_published,
        updatedAt: formattedDate
      };
      
      // Only update base_price if it's provided
      if (data.base_price !== undefined) {
        updateData.base_price = data.base_price;
      }
      
      await db.update(shopModels)
        .set(updateData)
        .where(and(
          eq(shopModels.shop_id, data.shop_id),
          eq(shopModels.model_id, data.model_id)
        ));
      
      return {
        ...existing,
        is_published: data.is_published,
        base_price: data.base_price !== undefined ? data.base_price : existing.base_price,
        updatedAt: formattedDate
      };
    } else {
      // Create new - if base_price not provided, get it from the model
      let basePrice = data.base_price;
      
      if (basePrice === undefined) {
        const model = await db.query.models.findFirst({
          where: eq(models.id, data.model_id),
          columns: { base_price: true }
        });
        basePrice = model?.base_price || undefined;
      }
      
      const dbData = {
        shop_id: data.shop_id,
        model_id: data.model_id,
        is_published: data.is_published,
        base_price: basePrice,
        createdAt: formattedDate,
        updatedAt: formattedDate
      };

      const result = await db.insert(shopModels).values(dbData);
      const insertId = result?.[0]?.insertId ?? 0;
      
      return {
        id: insertId,
        ...dbData
      };
    }
  }

  async setModelStatuses(shopId: number, modelIds: number[], isPublished: number) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

    // Get existing relationships
    const existing = await db.query.shopModels.findMany({
      where: and(
        eq(shopModels.shop_id, shopId),
        inArray(shopModels.model_id, modelIds)
      ),
      columns: {
        model_id: true
      }
    });

    const existingModelIds = existing.map(e => e.model_id);
    const newModelIds = modelIds.filter(id => !existingModelIds.includes(id));

    // Update existing
    if (existingModelIds.length > 0) {
      await db.update(shopModels)
        .set({ 
          is_published: isPublished,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shopModels.shop_id, shopId),
          inArray(shopModels.model_id, existingModelIds)
        ));
    }

    // Create new
    if (newModelIds.length > 0) {
      // Get base prices for new models from the original models table
      const modelPrices = await db.query.models.findMany({
        where: inArray(models.id, newModelIds),
        columns: { id: true, base_price: true }
      });
      
      const priceMap = new Map(modelPrices.map(m => [m.id, m.base_price]));
      
      const values = newModelIds.map(modelId => ({
        shop_id: shopId,
        model_id: modelId,
        is_published: isPublished,
        base_price: priceMap.get(modelId) || undefined,
        createdAt: formattedDate,
        updatedAt: formattedDate
      }));

      await db.insert(shopModels).values(values);
    }

    // Return updated statuses
    return this.getModelStatuses(shopId, modelIds);
  }

  // PRICE MANAGEMENT METHODS
  async updateModelPrice(shopId: number, modelId: number, basePrice: number) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

    // Check if the relationship already exists
    const existing = await this.getModelStatus(shopId, modelId);
    
    if (existing) {
      // Update existing
      await db.update(shopModels)
        .set({ 
          base_price: basePrice,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shopModels.shop_id, shopId),
          eq(shopModels.model_id, modelId)
        ));
      
      return {
        ...existing,
        base_price: basePrice,
        updatedAt: formattedDate
      };
    } else {
      // Create new shop model with the price
      const dbData = {
        shop_id: shopId,
        model_id: modelId,
        is_published: 0, // Default to unpublished
        base_price: basePrice,
        createdAt: formattedDate,
        updatedAt: formattedDate
      };

      const result = await db.insert(shopModels).values(dbData);
      const insertId = result?.[0]?.insertId ?? 0;
      
      return {
        id: insertId,
        ...dbData
      };
    }
  }

  async updateBulkModelPrices(shopId: number, modelIds: number[], basePrice: number) {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

    // Get existing relationships
    const existing = await db.query.shopModels.findMany({
      where: and(
        eq(shopModels.shop_id, shopId),
        inArray(shopModels.model_id, modelIds)
      ),
      columns: {
        model_id: true
      }
    });

    const existingModelIds = existing.map(e => e.model_id);
    const newModelIds = modelIds.filter(id => !existingModelIds.includes(id));

    // Update existing
    if (existingModelIds.length > 0) {
      await db.update(shopModels)
        .set({ 
          base_price: basePrice,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shopModels.shop_id, shopId),
          inArray(shopModels.model_id, existingModelIds)
        ));
    }

    // Create new
    if (newModelIds.length > 0) {
      const values = newModelIds.map(modelId => ({
        shop_id: shopId,
        model_id: modelId,
        is_published: 0, // Default to unpublished
        base_price: basePrice,
        createdAt: formattedDate,
        updatedAt: formattedDate
      }));

      await db.insert(shopModels).values(values);
    }

    // Return updated statuses
    return this.getModelStatuses(shopId, modelIds);
  }
}

export const shopCatalogRepository = new ShopCatalogRepository(); 