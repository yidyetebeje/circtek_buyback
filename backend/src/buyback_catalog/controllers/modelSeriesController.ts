import { Context } from "elysia";
import { modelSeriesService } from "../services/modelSeriesService";
import { TModelSeriesCreate, TModelSeriesUpdate, ModelSeriesTranslationCreateSingleSchema, ModelSeriesTranslationUpdateSingleSchema } from "../types/modelSeriesTypes"; 
import { NotFoundError, BadRequestError, ConflictError } from "../utils/errors";

export class ModelSeriesController {
  async getAll(ctx: Context & { currentUserId: number; currentTenantId: number; currentRole: string }) {
    try {
      const page = ctx.query.page ? parseInt(ctx.query.page as string, 10) : 1;
      const limit = ctx.query.limit ? parseInt(ctx.query.limit as string, 10) : 20;
      const orderBy = ctx.query.orderBy as string || 'order_no';
      const order = (ctx.query.order as string) === 'desc' ? 'desc' : 'asc';
      const search = ctx.query.q as string | undefined;
      
      // Determine tenantId based on user role
      let effectiveTenantId: number | undefined = undefined;
      const queryTenantId = ctx.query.tenantId ? parseInt(ctx.query.tenantId as string, 10) : undefined;

      if(ctx.currentRole !== 'super-admin'){
        effectiveTenantId = ctx.currentTenantId;
      } else {
        effectiveTenantId = queryTenantId;
      }

      if (isNaN(page) || page < 1) throw new BadRequestError('Invalid page number.');
      if (isNaN(limit) || limit < 1) throw new BadRequestError('Invalid limit value.');
      // Validation for queryClientId (if parsed from query for admin) is handled above.

      const result = await modelSeriesService.getAllModelSeries(page, limit, orderBy, order, effectiveTenantId, search);
      return result;
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ModelSeriesController.getAll:", error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve model series' };
    }
  }

  async getById(id: number, ctx: Context) {
    try {
      const modelSeries = await modelSeriesService.getModelSeriesById(id);
      return {
        data: modelSeries,
        message: "Model series retrieved successfully"
      }
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in ModelSeriesController.getById:", error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve model series' };
    }
  }

  async create(data: TModelSeriesCreate, ctx: Context) { 
    try {
      const newModelSeries = await modelSeriesService.createModelSeries(data);
      ctx.set.status = 201;   
      return {
        data: newModelSeries,
        message: 'Model series created successfully'
      };
    } catch (error: any) {
        
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof ConflictError) {
        ctx.set.status = 409;
        return { error: error.message };
      }
      console.error("Error in ModelSeriesController.create:", error);
      ctx.set.status = 500;
      return { error: 'Failed to create model series' };
    }
  }

  async update(id: number, data: TModelSeriesUpdate, ctx: Context) {
    try {
      if (Object.keys(data).length === 0) {
          throw new BadRequestError('No update data provided.');
      }

      const updatedModelSeries = await modelSeriesService.updateModelSeries(id, data);
      return updatedModelSeries;
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      if (error instanceof ConflictError) {
        ctx.set.status = 409;
        return { error: error.message };
      }
      console.error("Error in ModelSeriesController.update:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update model series' };
    }
  }

  async delete(id: number, ctx: Context) {
    try {
      await modelSeriesService.deleteModelSeries(id);
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
      console.error("Error in ModelSeriesController.delete:", error);
      ctx.set.status = 500;
      return { error: 'Failed to delete model series' };
    }
  }

  /**
   * Upload an icon image for a model series
   * @param id Model Series ID
   * @param file File to upload
   * @param ctx Elysia context
   * @returns Object containing the URL of the uploaded icon
   */
  async uploadIcon(id: number, file: File | Blob, ctx: Context) {
    try {
      const numericId = Number(id);
      if (isNaN(numericId)) {
        ctx.set.status = 400;
        return { error: 'Invalid model series ID format. ID must be a number.' };
      }
      
      const result = await modelSeriesService.uploadModelSeriesIcon(numericId, file);
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
      console.error("Error in ModelSeriesController.uploadIcon:", error);
      ctx.set.status = 500;
      return { error: 'Failed to upload model series icon' };
    }
  }

  /**
   * Upload a main image for a model series
   * @param id Model Series ID
   * @param file File to upload
   * @param ctx Elysia context
   * @returns Object containing the URL of the uploaded image
   */
  async uploadImage(id: number, file: File | Blob, ctx: Context) {
    try {
      const numericId = Number(id);
      if (isNaN(numericId)) {
        ctx.set.status = 400;
        return { error: 'Invalid model series ID format. ID must be a number.' };
      }
      
      const result = await modelSeriesService.uploadModelSeriesImage(numericId, file);
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
      console.error("Error in ModelSeriesController.uploadImage:", error);
      ctx.set.status = 500;
      return { error: 'Failed to upload model series image' };
    }
  }

  // --- Translation Endpoints ---

  async getAllTranslations(ctx: Context) {
    try {
      const seriesId = parseInt(ctx.params.id, 10);
      if (isNaN(seriesId)) throw new BadRequestError('Invalid model series ID.');

      const translations = await modelSeriesService.getAllModelSeriesTranslations(seriesId);
      return { data: translations, message: 'Model series translations retrieved successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message }; // If the series itself wasn't found
      }
      console.error("Error in ModelSeriesController.getAllTranslations:", error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve model series translations' };
    }
  }

  async getTranslation(ctx: Context) {
    try {
      const seriesId = parseInt(ctx.params.id, 10);
      const languageId = parseInt(ctx.params.languageId, 10);
      if (isNaN(seriesId)) throw new BadRequestError('Invalid model series ID.');
      if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

      const translation = await modelSeriesService.getModelSeriesTranslation(seriesId, languageId);
      return { data: translation, message: 'Model series translation retrieved successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in ModelSeriesController.getTranslation:", error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve model series translation' };
    }
  }

  async createTranslation(ctx: Context) {
    try {
      const seriesId = parseInt(ctx.params.id, 10);
      if (isNaN(seriesId)) throw new BadRequestError('Invalid model series ID.');

      const translationData = ctx.body as typeof ModelSeriesTranslationCreateSingleSchema._type;
      // Note: Validation against schema happens at the route level

      const newTranslation = await modelSeriesService.createModelSeriesTranslation(seriesId, translationData);
      ctx.set.status = 201;
      return { data: newTranslation, message: 'Model series translation created successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) { // e.g., Series or Language not found
        ctx.set.status = 404;
        return { error: error.message };
      }
      // Handle potential duplicate entry errors
      if (error.code === 'ER_DUP_ENTRY') { 
          ctx.set.status = 409; // Conflict
          return { error: 'Translation for this model series and language already exists.' };
      }
      console.error("Error in ModelSeriesController.createTranslation:", error);
      ctx.set.status = 500;
      return { error: 'Failed to create model series translation' };
    }
  }

  async updateTranslation(ctx: Context) {
    try {
      const seriesId = parseInt(ctx.params.id, 10);
      const languageId = parseInt(ctx.params.languageId, 10);
      if (isNaN(seriesId)) throw new BadRequestError('Invalid model series ID.');
      if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

      const updateData = ctx.body as typeof ModelSeriesTranslationUpdateSingleSchema._type;
      if (Object.keys(updateData).length === 0) {
          throw new BadRequestError('No update data provided.');
      }
      // Note: Validation against schema happens at the route level

      const updatedTranslation = await modelSeriesService.updateModelSeriesTranslation(seriesId, languageId, updateData);
      return { data: updatedTranslation, message: 'Model series translation updated successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in ModelSeriesController.updateTranslation:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update model series translation' };
    }
  }

  async deleteTranslation(ctx: Context) {
    try {
      const seriesId = parseInt(ctx.params.id, 10);
      const languageId = parseInt(ctx.params.languageId, 10);
      if (isNaN(seriesId)) throw new BadRequestError('Invalid model series ID.');
      if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

      await modelSeriesService.deleteModelSeriesTranslation(seriesId, languageId);
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
      console.error("Error in ModelSeriesController.deleteTranslation:", error);
      ctx.set.status = 500;
      return { error: 'Failed to delete model series translation' };
    }
  }

  async upsertTranslation(ctx: Context) {
    try {
      const seriesId = parseInt(ctx.params.id, 10);
      const languageId = parseInt(ctx.params.languageId, 10);
      if (isNaN(seriesId)) throw new BadRequestError('Invalid model series ID.');
      if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

      const translationData = ctx.body as typeof ModelSeriesTranslationCreateSingleSchema._type;
      
      const result = await modelSeriesService.upsertModelSeriesTranslation(seriesId, languageId, translationData);
      return { data: result, message: 'Model series translation saved successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in ModelSeriesController.upsertTranslation:", error);
      ctx.set.status = 500;
      return { error: 'Failed to save model series translation' };
    }
  }

  /**
   * Get model series published in a specific shop
   * @param shopId Shop ID
   * @param options Pagination and filtering options
   * @param ctx Elysia context
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
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error(`Error in ModelSeriesController.getPublishedInShop(${shopId}):`, error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve model series published in shop' };
    }
  }

  async bulkUpsertTranslations(ctx: Context & { currentUserId: number }) {
    try {
      const { params, body, currentUserId } = ctx;
      const seriesId = parseInt(params.id, 10);

      if (!currentUserId) {
        throw new BadRequestError('User not found.');
      }

      if (isNaN(seriesId)) {
        throw new BadRequestError('Invalid model series ID format. ID must be a number.');
      }

      const { translations } = body as { translations: Array<{ language_id: number; title: string; description?: string; meta_title?: string; meta_description?: string; meta_keywords?: string; }> };

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
    } catch (error: any) {
      console.error("Error in ModelSeriesController.bulkUpsertTranslations:", error);

      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }

      throw new BadRequestError(
        error instanceof Error ? error.message : 'Unknown error occurred during bulk upsert'
      );
    }
  }
}

export const modelSeriesController = new ModelSeriesController();
