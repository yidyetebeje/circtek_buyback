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
  async getAll(params: {
    page?: number;
    limit?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
    category_id?: string;
    brand_id?: string;
    series_id?: string;
    title?: string;
    tenant_id?: number;
    currentTenantId?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const orderBy = params.orderBy || 'title';
    const order = params.order || 'asc';
    const titleSearch = params.title || undefined;
    const categoryIds = parseIds(params.category_id);
    const brandIds = parseIds(params.brand_id);
    const seriesIds = parseIds(params.series_id);
    
    let effectiveTenantId: number | undefined = undefined;
    if (params.currentTenantId !== undefined) {
      effectiveTenantId = params.currentTenantId;
    }
    
    if (isNaN(page) || page < 1) throw new BadRequestError('Invalid page number.');
    if (isNaN(limit) || limit < 1) throw new BadRequestError('Invalid limit value.');
    
    const result = await modelService.getAllModels(page, limit, orderBy, order, titleSearch, categoryIds, brandIds, seriesIds, effectiveTenantId);
    return result;
  }

  async getById(id: number) {
    const model = await modelService.getModelById(id);
    return {
      data: model,
      message: 'Model retrieved successfully'
    };
  }

  /**
   * Create a new model with optional base_price
   * @param data Model data including title, base_price, and other properties
   * @param currentTenantId Current tenant ID from authenticated user
   * @param currentRole Current user role
   * @returns The newly created model
   */
  async create(data: TModelCreate, currentTenantId?: number, currentRole?: string) {
    if (currentRole !== 'super_admin' && currentRole !== 'super-admin') {
      const tenantId = currentTenantId;
      if (tenantId === undefined) {
        throw new BadRequestError('Tenant ID could not be determined from user information');
      }
      data.tenant_id = tenantId;
    }
    if (data.base_price !== undefined && data.base_price !== null && isNaN(Number(data.base_price))) {
      throw new BadRequestError('Invalid base_price format. Price must be a number.');
    }

    const newModel = await modelService.createModel(data);
    return {
      data: newModel,
      message: 'Model created successfully'
    };
  }

  /**
   * Update a model's properties including base_price
   * @param id Model ID to update
   * @param data Updated model data which may include base_price
   * @returns The updated model
   */
  async update(id: number, data: TModelUpdate) {
    if (Object.keys(data).length === 0) {
      throw new BadRequestError('No update data provided.');
    }
    if (data.base_price !== undefined && data.base_price !== null && isNaN(Number(data.base_price))) {
      throw new BadRequestError('Invalid base_price format. Price must be a number.');
    }

    const updatedModel = await modelService.updateModel(id, data);
    return updatedModel;
  }

  async delete(id: number) {
    await modelService.deleteModel(id);
  }

  /**
   * Upload an image for a model
   * @param id Model ID
   * @param file File to upload
   * @returns Object containing the URL of the uploaded image
   */
  async uploadImage(id: number, file: File | Blob) {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      throw new BadRequestError('Invalid model ID format. ID must be a number.');
    }
    
    const result = await modelService.uploadModelImage(numericId, file);
    return result;
  }

  // --- Translation Endpoints ---

  async getAllTranslations(modelId: number) {
    if (isNaN(modelId)) throw new BadRequestError('Invalid model ID.');

    const translations = await modelService.getAllModelTranslations(modelId);
    return { data: translations, message: 'Model translations retrieved successfully' };
  }

  async getTranslation(modelId: number, languageId: number) {
    if (isNaN(modelId)) throw new BadRequestError('Invalid model ID.');
    if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

    const translation = await modelService.getModelTranslation(modelId, languageId);
    return { data: translation, message: 'Model translation retrieved successfully' };
  }

  async createTranslation(modelId: number, translationData: typeof ModelTranslationCreateSingleSchema._type) {
    if (isNaN(modelId)) throw new BadRequestError('Invalid model ID.');

    const newTranslation = await modelService.createModelTranslation(modelId, translationData);
    return { data: newTranslation, message: 'Model translation created successfully' };
  }

  async updateTranslation(modelId: number, languageId: number, updateData: typeof ModelTranslationUpdateSingleSchema._type) {
    if (isNaN(modelId)) throw new BadRequestError('Invalid model ID.');
    if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No update data provided.');
    }

    const updatedTranslation = await modelService.updateModelTranslation(modelId, languageId, updateData);
    return { data: updatedTranslation, message: 'Model translation updated successfully' };
  }

  async deleteTranslation(modelId: number, languageId: number) {
    if (isNaN(modelId)) throw new BadRequestError('Invalid model ID.');
    if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

    await modelService.deleteModelTranslation(modelId, languageId);
  }

  async upsertTranslation(modelId: number, languageId: number, translationData: typeof ModelTranslationCreateSingleSchema._type) {
    if (isNaN(modelId)) throw new BadRequestError('Invalid model ID.');
    if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

    const result = await modelService.upsertModelTranslation(modelId, languageId, translationData);
    return { data: result, message: 'Model translation saved successfully' };
  }

  async bulkUpsertTranslations(
    modelId: number,
    translations: Array<{ language_id: number; title: string; description?: string; meta_title?: string; meta_description?: string; meta_keywords?: string; specifications?: string; }>
  ) {
    if (isNaN(modelId)) {
      throw new BadRequestError('Invalid model ID format. ID must be a number.');
    }

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
  }

  /**
   * Get models published in a specific shop
   * @param shopId Shop ID
   * @param options Pagination and filtering options
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
    }
  ) {
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
  }

  /**
   * Get models published in a specific shop filtered by category slug
   * @param shopId Shop ID
   * @param categorySlug Category SEF URL (slug)
   * @param options Pagination and filtering options
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
    }
  ) {
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
  }

  /**
   * Get a specific model by its SEF URL that is published in a shop, including question set assignments
   */
  async getPublishedModelInShopBySlug(shopId: number, modelSefUrl: string) {
    const model = await modelService.getPublishedModelInShopBySlug(shopId, modelSefUrl);
    
    return {
      data: model
    };
  }
}

export const modelController = new ModelController();
