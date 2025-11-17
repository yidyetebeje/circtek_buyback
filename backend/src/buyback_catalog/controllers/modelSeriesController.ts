import { modelSeriesService } from "../services/modelSeriesService";
import { TModelSeriesCreate, TModelSeriesUpdate, ModelSeriesTranslationCreateSingleSchema, ModelSeriesTranslationUpdateSingleSchema } from "../types/modelSeriesTypes"; 
import { NotFoundError, BadRequestError, ConflictError } from "../utils/errors";

export class ModelSeriesController {
  async getAll(params: {
    page?: number;
    limit?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
    tenantId?: number;
    search?: string;
    currentTenantId: number;
    currentRole: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const orderBy = params.orderBy || 'order_no';
    const order = params.order || 'asc';
    const search = params.search;
    
    // Determine tenantId based on user role
    let effectiveTenantId: number | undefined = undefined;
    if (params.currentRole !== 'super-admin') {
      effectiveTenantId = params.currentTenantId;
    } else {
      effectiveTenantId = params.tenantId;
    }

    if (isNaN(page) || page < 1) throw new BadRequestError('Invalid page number.');
    if (isNaN(limit) || limit < 1) throw new BadRequestError('Invalid limit value.');

    const result = await modelSeriesService.getAllModelSeries(page, limit, orderBy, order, effectiveTenantId, search);
    return result;
  }

  async getById(id: number) {
    const modelSeries = await modelSeriesService.getModelSeriesById(id);
    return {
      data: modelSeries,
      message: "Model series retrieved successfully"
    };
  }

  async create(data: TModelSeriesCreate) {
    const newModelSeries = await modelSeriesService.createModelSeries(data);
    return {
      data: newModelSeries,
      message: 'Model series created successfully'
    };
  }

  async update(id: number, data: TModelSeriesUpdate) {
    if (Object.keys(data).length === 0) {
      throw new BadRequestError('No update data provided.');
    }

    const updatedModelSeries = await modelSeriesService.updateModelSeries(id, data);
    return updatedModelSeries;
  }

  async delete(id: number) {
    await modelSeriesService.deleteModelSeries(id);
  }

  /**
   * Upload an icon image for a model series
   * @param id Model Series ID
   * @param file File to upload
   * @returns Object containing the URL of the uploaded icon
   */
  async uploadIcon(id: number, file: File | Blob) {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      throw new BadRequestError('Invalid model series ID format. ID must be a number.');
    }
    
    const result = await modelSeriesService.uploadModelSeriesIcon(numericId, file);
    return result;
  }

  /**
   * Upload a main image for a model series
   * @param id Model Series ID
   * @param file File to upload
   * @returns Object containing the URL of the uploaded image
   */
  async uploadImage(id: number, file: File | Blob) {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      throw new BadRequestError('Invalid model series ID format. ID must be a number.');
    }
    
    const result = await modelSeriesService.uploadModelSeriesImage(numericId, file);
    return result;
  }

  // --- Translation Endpoints ---

  async getAllTranslations(seriesId: number) {
    if (isNaN(seriesId)) throw new BadRequestError('Invalid model series ID.');

    const translations = await modelSeriesService.getAllModelSeriesTranslations(seriesId);
    return { data: translations, message: 'Model series translations retrieved successfully' };
  }

  async getTranslation(seriesId: number, languageId: number) {
    if (isNaN(seriesId)) throw new BadRequestError('Invalid model series ID.');
    if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

    const translation = await modelSeriesService.getModelSeriesTranslation(seriesId, languageId);
    return { data: translation, message: 'Model series translation retrieved successfully' };
  }

  async createTranslation(seriesId: number, translationData: typeof ModelSeriesTranslationCreateSingleSchema._type) {
    if (isNaN(seriesId)) throw new BadRequestError('Invalid model series ID.');

    const newTranslation = await modelSeriesService.createModelSeriesTranslation(seriesId, translationData);
    return { data: newTranslation, message: 'Model series translation created successfully' };
  }

  async updateTranslation(seriesId: number, languageId: number, updateData: typeof ModelSeriesTranslationUpdateSingleSchema._type) {
    if (isNaN(seriesId)) throw new BadRequestError('Invalid model series ID.');
    if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No update data provided.');
    }

    const updatedTranslation = await modelSeriesService.updateModelSeriesTranslation(seriesId, languageId, updateData);
    return { data: updatedTranslation, message: 'Model series translation updated successfully' };
  }

  async deleteTranslation(seriesId: number, languageId: number) {
    if (isNaN(seriesId)) throw new BadRequestError('Invalid model series ID.');
    if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

    await modelSeriesService.deleteModelSeriesTranslation(seriesId, languageId);
  }

  async upsertTranslation(seriesId: number, languageId: number, translationData: typeof ModelSeriesTranslationCreateSingleSchema._type) {
    if (isNaN(seriesId)) throw new BadRequestError('Invalid model series ID.');
    if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

    const result = await modelSeriesService.upsertModelSeriesTranslation(seriesId, languageId, translationData);
    return { data: result, message: 'Model series translation saved successfully' };
  }

  /**
   * Get model series published in a specific shop
   * @param shopId Shop ID
   * @param options Pagination and filtering options
   * @returns Paginated list of model series published in the shop
   */
  async getPublishedInShop(
    shopId: number,
    options: {
      page?: number;
      limit?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
      search?: string;
      tenantId?: number;
    }
  ) {
    if (isNaN(shopId)) throw new BadRequestError('Invalid shop ID.');
    
    const page = options.page || 1;
    const limit = options.limit || 20;
    const orderBy = options.orderBy || 'title';
    const order = options.order || 'asc';
    const search = options.search || '';
    const tenantId = options.tenantId;

    if (isNaN(page) || page < 1) throw new BadRequestError('Invalid page number.');
    if (isNaN(limit) || limit < 1) throw new BadRequestError('Invalid limit value.');
    if (tenantId !== undefined && isNaN(tenantId)) throw new BadRequestError('Invalid tenant ID.');

    const result = await modelSeriesService.getPublishedInShop(shopId, {
      page,
      limit,
      orderBy,
      order,
      search,
      tenantId
    });

    return result;
  }

  async bulkUpsertTranslations(
    seriesId: number,
    translations: Array<{ language_id: number; title: string; description?: string; meta_title?: string; meta_description?: string; meta_keywords?: string; }>
  ) {
    if (isNaN(seriesId)) {
      throw new BadRequestError('Invalid model series ID format. ID must be a number.');
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

    const results = await modelSeriesService.bulkUpsertTranslations(seriesId, translations);

    const message = results.errors && results.errors.length > 0
      ? `Bulk upsert completed with ${results.created} created, ${results.updated} updated, and ${results.errors.length} errors.`
      : `Bulk upsert completed successfully: ${results.created} created, ${results.updated} updated.`;

    return {
      success: !results.errors || results.errors.length === 0,
      message,
      data: results,
      errors: results.errors && results.errors.length > 0 ? results.errors : null
    };
  }
}

export const modelSeriesController = new ModelSeriesController();
