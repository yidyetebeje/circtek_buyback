import { Context } from "elysia";
import { modelService } from "../services/modelService"; 
import { TModelCreate, TModelUpdate, ModelTranslationCreateSingleSchema, ModelTranslationUpdateSingleSchema } from "../types/modelTypes"; 
import { NotFoundError, BadRequestError } from "../utils/errors"; 

// Helper function to parse comma-separated IDs or single ID
const parseIds = (idsParam: string | number | undefined): number[] | undefined => {
    if (idsParam === undefined || idsParam === null) {
        return undefined;
    }
    const idString = String(idsParam).trim();
    if (idString === '') {
        return undefined;
    }
    const ids = idString.split(',').map(id => {
        const num = parseInt(id.trim(), 10);
        if (isNaN(num)) {
            throw new BadRequestError(`Invalid ID format in list: '${id}'. All IDs must be numbers.`);
        }
        return num;
    });
    return ids.length > 0 ? ids : undefined;
};

export class ModelController {
  async getAll(ctx: Context ) { // Add user to context type
    try {
      const page = ctx.query.page ? parseInt(ctx.query.page as string, 10) : 1;
      const limit = ctx.query.limit ? parseInt(ctx.query.limit as string, 10) : 20;
      const orderBy = ctx.query.orderBy as string || 'title';
      const order = (ctx.query.order as string) === 'desc' ? 'desc' : 'asc';
      const titleSearch = ctx.query.title as string | undefined;
      const categoryIds = parseIds(ctx.query.category_id);
      const brandIds = parseIds(ctx.query.brand_id);
      const seriesIds = parseIds(ctx.query.series_id);
      const {currentUserId, currentTenantId} = ctx as any;

      
      let effectiveTenantId: number | undefined = undefined;
      if(currentTenantId !== undefined){
        effectiveTenantId = currentTenantId;
      }
      
      if (isNaN(page) || page < 1) throw new BadRequestError('Invalid page number.');
      if (isNaN(limit) || limit < 1) throw new BadRequestError('Invalid limit value.');
      
      const result = await modelService.getAllModels(page, limit, orderBy, order, titleSearch, categoryIds, brandIds, seriesIds, effectiveTenantId);
      return result;
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      ctx.set.status = 500;
      return { error: 'Failed to retrieve models' };
    }
  }

  async getById(id: number, ctx: Context) {
    try {
      const model = await modelService.getModelById(id);
      return {
        data: model,
        message: 'Model retrieved successfully'
      };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in ModelController.getById:", error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve model' };
    }
  }

  /**
   * Create a new model with optional base_price
   * @param data Model data including title, base_price, and other properties
   * @param ctx Elysia context
   * @returns The newly created model
   */
  async create(data: TModelCreate, ctx: Context ) { 
    try {
      const {currentUserId, currentTenantId, currentRole} = ctx as any;
      if(currentRole !== 'super_admin'){
       const tenantId = currentTenantId;
        if(tenantId === undefined){
          throw new BadRequestError('Tenant ID could not be determined from user information');
        }
        data.tenant_id = tenantId;
      }
      if (data.base_price !== undefined && data.base_price !== null && isNaN(Number(data.base_price))) {
        throw new BadRequestError('Invalid base_price format. Price must be a number.');
      }

      const newModel = await modelService.createModel(data);
      ctx.set.status = 201;   
      return {
        data: newModel,
        message: 'Model created successfully'
      };
    } catch (error: any) {
        
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ModelController.create:", error);
      ctx.set.status = 500;
      return { error: 'Failed to create model' };
    }
  }

  /**
   * Update a model's properties including base_price
   * @param id Model ID to update
   * @param data Updated model data which may include base_price
   * @param ctx Elysia context
   * @returns The updated model
   */
  async update(id: number, data: TModelUpdate, ctx: Context ) {
    try {
      if (Object.keys(data).length === 0) {
          throw new BadRequestError('No update data provided.');
      }
      if (data.base_price !== undefined && data.base_price !== null && isNaN(Number(data.base_price))) {
        throw new BadRequestError('Invalid base_price format. Price must be a number.');
      }

      const updatedModel = await modelService.updateModel(id, data);
      return updatedModel;
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in ModelController.update:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update model' };
    }
  }

  async delete(id: number, ctx: Context) {
    try {
      await modelService.deleteModel(id);
      ctx.set.status = 204; 
      return; 
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404; 
        return { error: error.message };
      }
      console.error("Error in ModelController.delete:", error);
      ctx.set.status = 500;
      return { error: 'Failed to delete model' };
    }
  }

  /**
   * Upload an image for a model
   * @param id Model ID
   * @param file File to upload
   * @param ctx Elysia context
   * @returns Object containing the URL of the uploaded image
   */
  async uploadImage(id: number, file: File | Blob, ctx: Context) {
    try {
      const numericId = Number(id);
      if (isNaN(numericId)) {
        ctx.set.status = 400;
        return { error: 'Invalid model ID format. ID must be a number.' };
      }
      
      const result = await modelService.uploadModelImage(numericId, file);
      return result;
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in ModelController.uploadImage:", error);
      ctx.set.status = 500;
      return { error: 'Failed to upload model image' };
    }
  }

  // --- Translation Endpoints ---

  async getAllTranslations(ctx: Context) {
    try {
      const modelId = parseInt(ctx.params.id, 10);
      if (isNaN(modelId)) throw new BadRequestError('Invalid model ID.');

      const translations = await modelService.getAllModelTranslations(modelId);
      return { data: translations, message: 'Model translations retrieved successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message }; // If the model itself wasn't found
      }
      console.error("Error in ModelController.getAllTranslations:", error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve model translations' };
    }
  }

  async getTranslation(ctx: Context) {
    try {
      const modelId = parseInt(ctx.params.id, 10);
      const languageId = parseInt(ctx.params.languageId, 10);
      if (isNaN(modelId)) throw new BadRequestError('Invalid model ID.');
      if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

      const translation = await modelService.getModelTranslation(modelId, languageId);
      return { data: translation, message: 'Model translation retrieved successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in ModelController.getTranslation:", error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve model translation' };
    }
  }

  async createTranslation(ctx: Context) {
    try {
      const modelId = parseInt(ctx.params.id, 10);
      if (isNaN(modelId)) throw new BadRequestError('Invalid model ID.');

      const translationData = ctx.body as typeof ModelTranslationCreateSingleSchema._type;
      // Note: Validation against ModelTranslationCreateSingleSchema happens at the route level

      const newTranslation = await modelService.createModelTranslation(modelId, translationData);
      ctx.set.status = 201;
      return { data: newTranslation, message: 'Model translation created successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) { // e.g., Model or Language not found
        ctx.set.status = 404;
        return { error: error.message };
      }
      // Handle potential duplicate entry errors (e.g., unique constraint violation)
      if (error.code === 'ER_DUP_ENTRY') { 
          ctx.set.status = 409; // Conflict
          return { error: 'Translation for this model and language already exists.' };
      }
      console.error("Error in ModelController.createTranslation:", error);
      ctx.set.status = 500;
      return { error: 'Failed to create model translation' };
    }
  }

  async updateTranslation(ctx: Context) {
    try {
      const modelId = parseInt(ctx.params.id, 10);
      const languageId = parseInt(ctx.params.languageId, 10);
      if (isNaN(modelId)) throw new BadRequestError('Invalid model ID.');
      if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

      const updateData = ctx.body as typeof ModelTranslationUpdateSingleSchema._type;
      if (Object.keys(updateData).length === 0) {
          throw new BadRequestError('No update data provided.');
      }
      // Note: Validation against ModelTranslationUpdateSingleSchema happens at the route level

      const updatedTranslation = await modelService.updateModelTranslation(modelId, languageId, updateData);
      return { data: updatedTranslation, message: 'Model translation updated successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in ModelController.updateTranslation:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update model translation' };
    }
  }

  async deleteTranslation(ctx: Context) {
    try {
      const modelId = parseInt(ctx.params.id, 10);
      const languageId = parseInt(ctx.params.languageId, 10);
      if (isNaN(modelId)) throw new BadRequestError('Invalid model ID.');
      if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

      await modelService.deleteModelTranslation(modelId, languageId);
      ctx.set.status = 204;
      return; 
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in ModelController.deleteTranslation:", error);
      ctx.set.status = 500;
      return { error: 'Failed to delete model translation' };
    }
  }

  async upsertTranslation(ctx: Context) {
    try {
      const modelId = parseInt(ctx.params.id, 10);
      const languageId = parseInt(ctx.params.languageId, 10);
      if (isNaN(modelId)) throw new BadRequestError('Invalid model ID.');
      if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

      const translationData = ctx.body as typeof ModelTranslationCreateSingleSchema._type;
      
      const result = await modelService.upsertModelTranslation(modelId, languageId, translationData);
      return { data: result, message: 'Model translation saved successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in ModelController.upsertTranslation:", error);
      ctx.set.status = 500;
      return { error: 'Failed to save model translation' };
    }
  }

  async bulkUpsertTranslations(ctx: Context) {
    try {
      const { params, body, currentUserId, currentTenantId, currentRole } = ctx as any;
      const modelId = parseInt(params.id, 10);

      if (!currentUserId) {
        throw new BadRequestError('User not found.');
      }

      if (isNaN(modelId)) {
        throw new BadRequestError('Invalid model ID format. ID must be a number.');
      }

      const { translations } = body as { translations: Array<{ language_id: number; title: string; description?: string; meta_title?: string; meta_description?: string; meta_keywords?: string; specifications?: string; }> };
      
      if (!translations || !Array.isArray(translations) || translations.length === 0) {
        throw new BadRequestError('Translations array is required and must not be empty.');
      }

      // Validate each translation
      for (const translation of translations) {
        if (!translation.language_id || !translation.title) {
          throw new BadRequestError('Each translation must have language_id and title.');
        }
      }

      const results = await modelService.bulkUpsertTranslations(modelId, translations);

      const message = results.errors.length > 0 
        ? `Bulk upsert completed with ${results.created} created, ${results.updated} updated, and ${results.errors.length} errors.`
        : `Bulk upsert completed successfully: ${results.created} created, ${results.updated} updated.`;

      return {
        success: results.errors.length === 0,
        message,
        data: results,
        errors: results.errors.length > 0 ? results.errors : null
      };
    } catch (error: any) {
      console.error("Error in ModelController.bulkUpsertTranslations:", error);
      
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Unknown error occurred during bulk upsert'
      );
    }
  }

  /**
   * Get models published in a specific shop
   * @param shopId Shop ID
   * @param options Pagination and filtering options
   * @param ctx Elysia context
   * @returns Paginated list of models published in the shop
   */
  async getPublishedInShop(
    shopId: number,
    options: {
      page?: number;
      limit?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
      search?: string;
      categoryId?: number;
      brandId?: number;
      modelSeriesId?: number;
      tenantId?: number;
    },
    ctx: Context
  ) {
    try {
      if (isNaN(shopId)) throw new BadRequestError('Invalid shop ID.');
      
      const page = options.page || 1;
      const limit = options.limit || 20;
      const orderBy = options.orderBy || 'title';
      const order = options.order || 'asc';
      const search = options.search || '';
      const categoryId = options.categoryId;
      const brandId = options.brandId;
      const modelSeriesId = options.modelSeriesId;
      const tenantId = options.tenantId;

      if (isNaN(page) || page < 1) throw new BadRequestError('Invalid page number.');
      if (isNaN(limit) || limit < 1) throw new BadRequestError('Invalid limit value.');
      if (categoryId !== undefined && isNaN(categoryId)) throw new BadRequestError('Invalid category ID.');
      if (brandId !== undefined && isNaN(brandId)) throw new BadRequestError('Invalid brand ID.');
      if (modelSeriesId !== undefined && isNaN(modelSeriesId)) throw new BadRequestError('Invalid model series ID.');
      if (tenantId !== undefined && isNaN(tenantId)) throw new BadRequestError('Invalid client ID.');

      const result = await modelService.getPublishedInShop(shopId, {
        page,
        limit,
        orderBy,
        order,
        search,
        categoryId,
        brandId,
        modelSeriesId,
        tenantId
      });

      return result;
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error(`Error in ModelController.getPublishedInShop(${shopId}):`, error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve models published in shop' };
    }
  }

  /**
   * Get models published in a specific shop filtered by category slug
   * @param shopId Shop ID
   * @param categorySlug Category SEF URL (slug)
   * @param options Pagination and filtering options
   * @param ctx Elysia context
   * @returns Paginated list of models published in the shop belonging to the specified category
   */
  async getPublishedInShopByCategory(
    shopId: number,
    categorySlug: string,
    options: {
      page?: number;
      limit?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
      search?: string;
      brandId?: number;
      modelSeriesId?: number;
      tenantId?: number;
    },
    ctx: Context
  ) {
    try {
      if (isNaN(shopId)) throw new BadRequestError('Invalid shop ID.');
      if (!categorySlug) throw new BadRequestError('Category slug is required.');
      
      const page = options.page || 1;
      const limit = options.limit || 20;
      const orderBy = options.orderBy || 'title';
      const order = options.order || 'asc';
      const search = options.search || '';
      const brandId = options.brandId;
      const modelSeriesId = options.modelSeriesId;
      const tenantId = options.tenantId;

      if (isNaN(page) || page < 1) throw new BadRequestError('Invalid page number.');
      if (isNaN(limit) || limit < 1) throw new BadRequestError('Invalid limit value.');
      if (brandId !== undefined && isNaN(brandId)) throw new BadRequestError('Invalid brand ID.');
      if (modelSeriesId !== undefined && isNaN(modelSeriesId)) throw new BadRequestError('Invalid model series ID.');
      if (tenantId !== undefined && isNaN(tenantId)) throw new BadRequestError('Invalid client ID.');

      const result = await modelService.getPublishedInShopByCategory(shopId, categorySlug, {
        page,
        limit,
        orderBy,
        order,
        search,
        brandId,
        modelSeriesId,
        tenantId
      });

      return result;
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error(`Error in ModelController.getPublishedInShopByCategory(${shopId}, ${categorySlug}):`, error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve models published in shop for the specified category' };
    }
  }

  /**
   * Get a specific model by its SEF URL that is published in a shop, including question set assignments
   */
  async getPublishedModelInShopBySlug(shopId: number, modelSefUrl: string, ctx: Context) {
    try {
      // Call service method to fetch the model with its question sets
      const model = await modelService.getPublishedModelInShopBySlug(shopId, modelSefUrl);
      
      return {
        data: model
      };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error(`Error in ModelController.getPublishedModelInShopBySlug for shopId ${shopId} and modelSefUrl ${modelSefUrl}:`, error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve model' };
    }
  }
}

export const modelController = new ModelController();
