import { Context } from "elysia";
import { Static } from '@sinclair/typebox';
import { JwtUser } from "@/middleware/auth";
import { brandService } from "../services/brandService";
import { 
  TBrandCreate, 
  TBrandUpdate,
  TBrandTranslationCreate,
  // TBrandTranslationUpdate, // This type is not defined, using Partial<TBrandTranslationCreate> instead
  PaginationQuerySchema,
  BrandIdParamSchema,
  BrandAndLanguageParamsSchema,
  FileUploadSchema
} from "../types/brandTypes"; 
import { NotFoundError, BadRequestError } from "../utils/errors";
import { getClientId } from "../utils/getId";

export class BrandController {
  async getAll(ctx: Context<{ query: Static<typeof PaginationQuerySchema> }> & { user: JwtUser | null }) {
    const { query, user } = ctx;
    const { page, limit, orderBy, order, clientId: queryClientId } = query;
    if(!user){
      throw new BadRequestError('User not found.');
    }
    let effectiveClientId: number | undefined = queryClientId;
    if (user.roleSlug !== 'super-admin') {
        const userClientId = getClientId(user);
        effectiveClientId = userClientId; 
    } else {
        effectiveClientId = queryClientId; 
    }
    const result = await brandService.getAllBrands(page!, limit!, orderBy!, order!, effectiveClientId);
    return {
      message: "Brands retrieved successfully.",
      data: result.data,
      meta: result.meta,
      errors: null
    };
  }

  async getById(ctx: Context<{ params: Static<typeof BrandIdParamSchema> }> & { user: JwtUser | null }) {
    const { params } = ctx;
    const numericId = parseInt(params.id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestError('Invalid brand ID format. ID must be a number.');
    }
    const brand = await brandService.getBrandById(numericId);
    if(!brand){
      throw new NotFoundError(`Brand with ID ${numericId} not found.`);
    }
    return {
      message: "Brand retrieved successfully.",
      data: brand,
      errors: null
    };
  }

  async create(ctx: Context<{ body: TBrandCreate }> & { user: JwtUser | null; error: Context['error'] }) { 
    const { body, user, error: ElysiaError } = ctx;
    const data = { ...body };
    if(!user){
      throw new BadRequestError('User not found.');
    }
    const clientId = getClientId(user);

    if (clientId === undefined && user.roleSlug !== 'super-admin') { // Allow super-admin to specify client_id in body
      return ElysiaError(400, 'Client ID could not be determined from user information for non-admin user.');
    }
    
    if (user.roleSlug !== 'super-admin') {
      data.client_id = clientId!;
    } else if (!data.client_id) {
      return ElysiaError(400, 'client_id is required in the body for super-admin.');
    }
    const newBrand = await brandService.createBrand(data);
    ctx.set.status = 201;
    return {
      message: "Brand created successfully.",
      data: newBrand,
      errors: null
    };
  }

  async update(ctx: Context<{ params: Static<typeof BrandIdParamSchema>, body: TBrandUpdate }> & { user: JwtUser | null }) {
    const { params, body, user } = ctx;
    const numericId = parseInt(params.id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestError('Invalid brand ID format. ID must be a number.');
    }
    if (Object.keys(body).length === 0) {
        throw new BadRequestError('No update data provided.');
    }
    const updatedBrand = await brandService.updateBrand(numericId, body);
    return {
      message: "Brand updated successfully.",
      data: updatedBrand,
      errors: null
    };
  }

  async delete(ctx: Context<{ params: Static<typeof BrandIdParamSchema> }> & { user: JwtUser | null }) {
    const { params, user } = ctx;
    const numericId = parseInt(params.id, 10);
    if(!user){
      throw new BadRequestError('User not found.');
    }
    if (isNaN(numericId)) {
      throw new BadRequestError('Invalid brand ID format. ID must be a number.');
    }
    await brandService.deleteBrand(numericId);
    ctx.set.status = 204; 
    return; 
  }

  async uploadIcon(ctx: Context<{ params: Static<typeof BrandIdParamSchema>, body: Static<typeof FileUploadSchema> }> & { user: JwtUser | null }) {
    const { params, body, user } = ctx;
    const numericId = parseInt(params.id, 10);
    if(!user){
      throw new BadRequestError('User not found.');
    }
    if (isNaN(numericId)) {
      throw new BadRequestError('Invalid brand ID format. ID must be a number.');
    }
    const result = await brandService.uploadBrandIcon(numericId, body.file);
    return {
      message: "Brand icon uploaded successfully.",
      data: result,
      errors: null
    };
  }

  async getTranslationsByBrand(ctx: Context<{ params: Static<typeof BrandIdParamSchema> }> & { user: JwtUser | null }) {
    const { params, user } = ctx;
    const numericId = parseInt(params.id, 10);
    if(!user){
      throw new BadRequestError('User not found.');
    }
    if (isNaN(numericId)) {
      throw new BadRequestError('Invalid brand ID format. ID must be a number.');
    }
    const translations = await brandService.getTranslationsByBrand(numericId);
    return {
      message: "Brand translations retrieved successfully.",
      data: translations,
      errors: null
    };
  }

  async createTranslation(ctx: Context<{ params: Static<typeof BrandIdParamSchema>, body: TBrandTranslationCreate }> & { user: JwtUser | null }) {
    const { params, body, user } = ctx;
    const numericBrandId = parseInt(params.id, 10);
    if(!user){
      throw new BadRequestError('User not found.');
    }
    if (isNaN(numericBrandId)) {
      throw new BadRequestError('Invalid brand ID format. ID must be a number.');
    }
    const newTranslation = await brandService.createTranslation(numericBrandId, body);
    ctx.set.status = 201;
    return {
      message: "Brand translation created successfully.",
      data: newTranslation,
      errors: null
    };
  }

  async updateTranslation(ctx: Context<{ params: Static<typeof BrandAndLanguageParamsSchema>, body: Partial<TBrandTranslationCreate> }> & { user: JwtUser | null }) {
    const { params, body, user } = ctx;
    const numericBrandId = parseInt(params.id, 10);
    if(!user){
      throw new BadRequestError('User not found.');
    }
    if (isNaN(numericBrandId)) {
      throw new BadRequestError('Invalid brand ID format. ID must be a number.');
    }
    const updatedTranslation = await brandService.updateTranslation(numericBrandId, params.languageId, body);
    return {
      message: "Brand translation updated successfully.",
      data: updatedTranslation,
      errors: null
    };
  }

  async deleteTranslation(ctx: Context<{ params: Static<typeof BrandAndLanguageParamsSchema> }> & { user: JwtUser | null }) {
    const { params, user } = ctx;
    const numericBrandId = parseInt(params.id, 10);
    if(!user){
      throw new BadRequestError('User not found.');
    }
    if (isNaN(numericBrandId)) {
      throw new BadRequestError('Invalid brand ID format. ID must be a number.');
    }
    await brandService.deleteTranslation(numericBrandId, params.languageId);
    ctx.set.status = 204;
    return;
  }
  
  async upsertTranslation(ctx: Context<{ params: Static<typeof BrandAndLanguageParamsSchema>, body: TBrandTranslationCreate }> & { user: JwtUser | null }) {
    const { params, body, user } = ctx;
    const numericBrandId = parseInt(params.id, 10);
    if(!user){
      throw new BadRequestError('User not found.');
    }
    if (isNaN(numericBrandId)) {
      throw new BadRequestError('Invalid brand ID format. ID must be a number.');
    }
    const upsertedTranslation = await brandService.upsertTranslation(numericBrandId, params.languageId, body);
    return {
      message: "Brand translation upserted successfully.",
      data: upsertedTranslation,
      errors: null
    };
  }

  async bulkUpsertTranslations(ctx: Context) {
    try {
      const brandId = parseInt(ctx.params.id, 10);
      if (isNaN(brandId)) {
        ctx.set.status = 400;
        return { error: 'Invalid brand ID format. ID must be a number.' };
      }

      const { translations } = ctx.body as { translations: Array<{
        language_id: number;
        title: string;
        description?: string;
        meta_title?: string;
        meta_description?: string;
        meta_keywords?: string;
      }> };

      if (!translations || !Array.isArray(translations) || translations.length === 0) {
        ctx.set.status = 400;
        return { error: 'Translations array is required and must not be empty' };
      }

      const results = await brandService.bulkUpsertTranslations(brandId, translations);
      
      const successCount = results.created + results.updated;
      const errorCount = results.errors.length;
      
      let message = '';
      if (successCount > 0 && errorCount === 0) {
        message = `Successfully processed ${successCount} translations (${results.created} created, ${results.updated} updated)`;
      } else if (successCount > 0 && errorCount > 0) {
        message = `Partially completed: ${successCount} successful, ${errorCount} failed`;
      } else {
        message = `All ${errorCount} translations failed`;
      }

      return {
        success: true,
        data: results,
        message
      };
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        ctx.set.status = error instanceof BadRequestError ? 400 : 404;
        return { error: error.message };
      }
      console.error("Error in BrandController.bulkUpsertTranslations:", error);
      ctx.set.status = 500;
      return { error: 'Failed to process bulk brand translations' };
    }
  }

  /**
   * Get brands published in a specific shop
   * @param shopId Shop ID
   * @param options Pagination and filtering options
   * @param ctx Elysia context
   * @returns Paginated list of brands published in the shop
   */
  async getPublishedInShop(
    shopId: number, 
    options: {
      page?: number;
      limit?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
      search?: string;
      clientId?: number;
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
      const clientId = options.clientId;

      if (isNaN(page) || page < 1) throw new BadRequestError('Invalid page number.');
      if (isNaN(limit) || limit < 1) throw new BadRequestError('Invalid limit value.');
      if (clientId !== undefined && isNaN(clientId)) throw new BadRequestError('Invalid client ID.');

      const result = await brandService.getPublishedInShop(shopId, {
        page,
        limit,
        orderBy,
        order,
        search,
        clientId
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
      console.error(`Error in BrandController.getPublishedInShop(${shopId}):`, error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve brands published in shop' };
    }
  }
}

export const brandController = new BrandController();
