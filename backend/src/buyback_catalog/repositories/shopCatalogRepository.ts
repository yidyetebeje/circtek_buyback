import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { 
  shop_brands, 
  shop_device_categories, 
  shop_model_series, 
  shop_models
} from "../../db/shops.schema";
import {
  brands,
  device_categories,
  model_series,
  models
} from "../../db/buyback_catalogue.schema";
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
    const result = await db.select()
      .from(shop_brands)
      .where(and(
        eq(shop_brands.shop_id, shopId),
        eq(shop_brands.brand_id, brandId)
      ))
      .limit(1);
    return result[0] || null;
  }

  async getBrandStatuses(shopId: number, brandIds?: number[]) {
    const whereCondition = brandIds?.length 
      ? and(
          eq(shop_brands.shop_id, shopId),
          inArray(shop_brands.brand_id, brandIds)
        )
      : eq(shop_brands.shop_id, shopId);

    const results = await db.select({
      id: shop_brands.id,
      shop_id: shop_brands.shop_id,
      brand_id: shop_brands.brand_id,
      is_published: shop_brands.is_published,
      createdAt: shop_brands.createdAt,
      updatedAt: shop_brands.updatedAt,
      brand: {
        id: brands.id,
        title: brands.title
      }
    })
    .from(shop_brands)
    .leftJoin(brands, eq(shop_brands.brand_id, brands.id))
    .where(whereCondition);

    // If brandIds were provided, ensure we return status for all requested ids
    if (brandIds?.length) {
      // Create a map of existing statuses
      const statusMap = new Map(results.map(r => [r.brand_id, r]));
      
      // Return results for all brandIds, with null for those not found
      return Promise.all(brandIds.map(async (brandId) => {
        const status = statusMap.get(brandId);
        if (status) return status;
        
        // Check if brand exists
        const brandResult = await db.select({
          id: brands.id,
          title: brands.title
        })
        .from(brands)
        .where(eq(brands.id, brandId))
        .limit(1);
        const brandExists = brandResult[0] || null;
        
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
      await db.update(shop_brands)
        .set({ 
          is_published: data.is_published,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shop_brands.shop_id, data.shop_id),
          eq(shop_brands.brand_id, data.brand_id)
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

      const result = await db.insert(shop_brands).values(dbData);
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
    const existing = await db.select({
      brand_id: shop_brands.brand_id
    })
    .from(shop_brands)
    .where(and(
      eq(shop_brands.shop_id, shopId),
      inArray(shop_brands.brand_id, brandIds)
    ));

    const existingBrandIds = existing.map(e => e.brand_id);
    const newBrandIds = brandIds.filter(id => !existingBrandIds.includes(id));

    // Update existing
    if (existingBrandIds.length > 0) {
      await db.update(shop_brands)
        .set({ 
          is_published: isPublished,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shop_brands.shop_id, shopId),
          inArray(shop_brands.brand_id, existingBrandIds)
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

      await db.insert(shop_brands).values(values);
    }

    // Return updated statuses
    return this.getBrandStatuses(shopId, brandIds);
  }

  // DEVICE CATEGORIES
  async getCategoryStatus(shopId: number, categoryId: number) {
    const result = await db.select()
      .from(shop_device_categories)
      .where(and(
        eq(shop_device_categories.shop_id, shopId),
        eq(shop_device_categories.category_id, categoryId)
      ))
      .limit(1);
    return result[0] || null;
  }

  async getCategoryStatuses(shopId: number, categoryIds?: number[]) {
    const whereCondition = categoryIds?.length 
      ? and(
          eq(shop_device_categories.shop_id, shopId),
          inArray(shop_device_categories.category_id, categoryIds)
        )
      : eq(shop_device_categories.shop_id, shopId);

    const results = await db.select({
      id: shop_device_categories.id,
      shop_id: shop_device_categories.shop_id,
      category_id: shop_device_categories.category_id,
      is_published: shop_device_categories.is_published,
      createdAt: shop_device_categories.createdAt,
      updatedAt: shop_device_categories.updatedAt,
      category: {
        id: device_categories.id,
        title: device_categories.title
      }
    })
    .from(shop_device_categories)
    .leftJoin(device_categories, eq(shop_device_categories.category_id, device_categories.id))
    .where(whereCondition);

    // If categoryIds were provided, ensure we return status for all requested ids
    if (categoryIds?.length) {
      // Create a map of existing statuses
      const statusMap = new Map(results.map(r => [r.category_id, r]));
      
      // Return results for all categoryIds, with null for those not found
      return Promise.all(categoryIds.map(async (categoryId) => {
        const status = statusMap.get(categoryId);
        if (status) return status;
        
        // Check if category exists
        const categoryResult = await db.select({
          id: device_categories.id,
          title: device_categories.title
        })
        .from(device_categories)
        .where(eq(device_categories.id, categoryId))
        .limit(1);
        const categoryExists = categoryResult[0] || null;
        
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
      await db.update(shop_device_categories)
        .set({ 
          is_published: data.is_published,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shop_device_categories.shop_id, data.shop_id),
          eq(shop_device_categories.category_id, data.category_id)
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

      const result = await db.insert(shop_device_categories).values(dbData);
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
    const existing = await db.select({
      category_id: shop_device_categories.category_id
    })
    .from(shop_device_categories)
    .where(and(
      eq(shop_device_categories.shop_id, shopId),
      inArray(shop_device_categories.category_id, categoryIds)
    ));

    const existingCategoryIds = existing.map(e => e.category_id);
    const newCategoryIds = categoryIds.filter(id => !existingCategoryIds.includes(id));

    // Update existing
    if (existingCategoryIds.length > 0) {
      await db.update(shop_device_categories)
        .set({ 
          is_published: isPublished,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shop_device_categories.shop_id, shopId),
          inArray(shop_device_categories.category_id, existingCategoryIds)
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

      await db.insert(shop_device_categories).values(values);
    }

    // Return updated statuses
    return this.getCategoryStatuses(shopId, categoryIds);
  }

  // MODEL SERIES
  async getModelSeriesStatus(shopId: number, seriesId: number) {
    const result = await db.select()
      .from(shop_model_series)
      .where(and(
        eq(shop_model_series.shop_id, shopId),
        eq(shop_model_series.series_id, seriesId)
      ))
      .limit(1);
    return result[0] || null;
  }

  async getModelSeriesStatuses(shopId: number, seriesIds?: number[]) {
    const whereCondition = seriesIds?.length 
      ? and(
          eq(shop_model_series.shop_id, shopId),
          inArray(shop_model_series.series_id, seriesIds)
        )
      : eq(shop_model_series.shop_id, shopId);

    const results = await db.select({
      id: shop_model_series.id,
      shop_id: shop_model_series.shop_id,
      series_id: shop_model_series.series_id,
      is_published: shop_model_series.is_published,
      createdAt: shop_model_series.createdAt,
      updatedAt: shop_model_series.updatedAt,
      series: {
        id: model_series.id,
        title: model_series.title
      }
    })
    .from(shop_model_series)
    .leftJoin(model_series, eq(shop_model_series.series_id, model_series.id))
    .where(whereCondition);

    // If seriesIds were provided, ensure we return status for all requested ids
    if (seriesIds?.length) {
      // Create a map of existing statuses
      const statusMap = new Map(results.map(r => [r.series_id, r]));
      
      // Return results for all seriesIds, with null for those not found
      return Promise.all(seriesIds.map(async (seriesId) => {
        const status = statusMap.get(seriesId);
        if (status) return status;
        
        // Check if series exists
        const seriesResult = await db.select({
          id: model_series.id,
          title: model_series.title
        })
        .from(model_series)
        .where(eq(model_series.id, seriesId))
        .limit(1);
        const seriesExists = seriesResult[0] || null;
        
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
      await db.update(shop_model_series)
        .set({ 
          is_published: data.is_published,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shop_model_series.shop_id, data.shop_id),
          eq(shop_model_series.series_id, data.series_id)
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

      const result = await db.insert(shop_model_series).values(dbData);
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
    const existing = await db.select({
      series_id: shop_model_series.series_id
    })
    .from(shop_model_series)
    .where(and(
      eq(shop_model_series.shop_id, shopId),
      inArray(shop_model_series.series_id, seriesIds)
    ));

    const existingSeriesIds = existing.map(e => e.series_id);
    const newSeriesIds = seriesIds.filter(id => !existingSeriesIds.includes(id));

    // Update existing
    if (existingSeriesIds.length > 0) {
      await db.update(shop_model_series)
        .set({ 
          is_published: isPublished,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shop_model_series.shop_id, shopId),
          inArray(shop_model_series.series_id, existingSeriesIds)
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

      await db.insert(shop_model_series).values(values);
    }

    // Return updated statuses
    return this.getModelSeriesStatuses(shopId, seriesIds);
  }

  // MODELS
  async getModelStatus(shopId: number, modelId: number) {
    const result = await db.select()
      .from(shop_models)
      .where(and(
        eq(shop_models.shop_id, shopId),
        eq(shop_models.model_id, modelId)
      ))
      .limit(1);
    return result[0] || null;
  }

  async getModelStatuses(shopId: number, modelIds?: number[]) {
    const whereCondition = modelIds?.length 
      ? and(
          eq(shop_models.shop_id, shopId),
          inArray(shop_models.model_id, modelIds)
        )
      : eq(shop_models.shop_id, shopId);

    const results = await db.select({
      id: shop_models.id,
      shop_id: shop_models.shop_id,
      model_id: shop_models.model_id,
      is_published: shop_models.is_published,
      base_price: shop_models.base_price,
      createdAt: shop_models.createdAt,
      updatedAt: shop_models.updatedAt,
      model: {
        id: models.id,
        title: models.title
      }
    })
    .from(shop_models)
    .leftJoin(models, eq(shop_models.model_id, models.id))
    .where(whereCondition);

    // If modelIds were provided, ensure we return status for all requested ids
    if (modelIds?.length) {
      // Create a map of existing statuses
      const statusMap = new Map(results.map(r => [r.model_id, r]));
      
      // Return results for all modelIds, with null for those not found
      return Promise.all(modelIds.map(async (modelId) => {
        const status = statusMap.get(modelId);
        if (status) return status;
        
        // Check if model exists and get its base price
        const modelResult = await db.select({
          id: models.id,
          title: models.title,
          base_price: models.base_price
        })
        .from(models)
        .where(eq(models.id, modelId))
        .limit(1);
        const modelExists = modelResult[0] || null;
        
        if (!modelExists) return null;
        
        // Return default unpublished status
        return { 
          id: 0, 
          shop_id: shopId, 
          model_id: modelId, 
          is_published: 0,
          base_price: modelExists.base_price,
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
      
      await db.update(shop_models)
        .set(updateData)
        .where(and(
          eq(shop_models.shop_id, data.shop_id),
          eq(shop_models.model_id, data.model_id)
        ));
      
      return {
        ...existing,
        is_published: data.is_published,
        base_price: data.base_price !== undefined ? data.base_price : existing.base_price,
        updatedAt: formattedDate
      };
    } else {
      // Create new - if base_price not provided, get it from the model
      // Get base price from the model if not provided
      let basePrice = data.base_price;
      if (basePrice === undefined) {
        const modelResult = await db.select({
          base_price: models.base_price
        })
        .from(models)
        .where(eq(models.id, data.model_id))
        .limit(1);
        basePrice = modelResult[0]?.base_price || undefined;
      }
      
      const dbData = {
        shop_id: data.shop_id,
        model_id: data.model_id,
        is_published: data.is_published,
        base_price: basePrice,
        createdAt: formattedDate,
        updatedAt: formattedDate
      };

      const result = await db.insert(shop_models).values(dbData);
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
    const existing = await db.select({
      model_id: shop_models.model_id
    })
    .from(shop_models)
    .where(and(
      eq(shop_models.shop_id, shopId),
      inArray(shop_models.model_id, modelIds)
    ));

    const existingModelIds = existing.map((e: any) => e.model_id);
    const newModelIds = modelIds.filter(id => !existingModelIds.includes(id));

    // Update existing
    if (existingModelIds.length > 0) {
      await db.update(shop_models)
        .set({ 
          is_published: isPublished,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shop_models.shop_id, shopId),
          inArray(shop_models.model_id, existingModelIds)
        ));
    }

    // Create new
    if (newModelIds.length > 0) {
      // Get base prices for new models from the original models table
      const modelPrices = await db.select({
        id: models.id,
        base_price: models.base_price
      })
      .from(models)
      .where(inArray(models.id, newModelIds));
      
      const priceMap = new Map(modelPrices.map((m: any) => [m.id, m.base_price]));
      
      const values = newModelIds.map(modelId => ({
        shop_id: shopId,
        model_id: modelId,
        is_published: isPublished,
        base_price: priceMap.get(modelId) || undefined,
        createdAt: formattedDate,
        updatedAt: formattedDate
      }));

      await db.insert(shop_models).values(values);
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
      await db.update(shop_models)
        .set({ 
          base_price: basePrice,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shop_models.shop_id, shopId),
          eq(shop_models.model_id, modelId)
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

      const result = await db.insert(shop_models).values(dbData);
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
    const existing = await db.select({
      model_id: shop_models.model_id
    })
    .from(shop_models)
    .where(and(
      eq(shop_models.shop_id, shopId),
      inArray(shop_models.model_id, modelIds)
    ));

    const existingModelIds = existing.map((e: any) => e.model_id);
    const newModelIds = modelIds.filter(id => !existingModelIds.includes(id));

    // Update existing
    if (existingModelIds.length > 0) {
      await db.update(shop_models)
        .set({ 
          base_price: basePrice,
          updatedAt: formattedDate
        })
        .where(and(
          eq(shop_models.shop_id, shopId),
          inArray(shop_models.model_id, existingModelIds)
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

      await db.insert(shop_models).values(values);
    }

    // Return updated statuses
    return this.getModelStatuses(shopId, modelIds);
  }
}

export const shopCatalogRepository = new ShopCatalogRepository(); 