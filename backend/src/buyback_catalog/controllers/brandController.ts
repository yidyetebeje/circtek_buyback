import { Context } from "elysia";
import { brandService } from "../services/brandService";
import { 
  TBrandCreate, 
  TBrandUpdate,
  TBrandTranslationCreate
} from "../types/brandTypes"; 
import { NotFoundError, BadRequestError } from "../utils/errors";

export class BrandController {
  async getAll(ctx: Context) {
    try {
      const page = ctx.query.page ? parseInt(ctx.query.page as string, 10) : 1;
      const limit = ctx.query.limit ? parseInt(ctx.query.limit as string, 10) : 20;
      const orderBy = ctx.query.orderBy as string || 'order_no';
      const order = (ctx.query.order as string) === 'desc' ? 'desc' : 'asc';
      const {currentUserId, currentTenantId, currentRole} = ctx as any;
      
      let effectiveTenantId: number | undefined = undefined;
      if(currentTenantId !== undefined){
        effectiveTenantId = currentTenantId;
      }
      
      if (isNaN(page) || page < 1) throw new BadRequestError('Invalid page number.');
      if (isNaN(limit) || limit < 1) throw new BadRequestError('Invalid limit value.');
      
      const result = await brandService.getAllBrands(page, limit, orderBy, order, effectiveTenantId);
      return result;
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      ctx.set.status = 500;
      return { error: 'Failed to retrieve brands' };
    }
  }

  async getById(id: number, ctx: Context) {
    try {
      const brand = await brandService.getBrandById(id);
      return {
        data: brand,
        message: 'Brand retrieved successfully'
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
      console.error("Error in BrandController.getById:", error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve brand' };
    }
  }

  async create(data: TBrandCreate, ctx: Context) {
    try {
      const {currentUserId, currentTenantId, currentRole} = ctx as any;
      if(currentRole !== 'super_admin'){
        const tenantId = currentTenantId;
        if(tenantId === undefined){
          throw new BadRequestError('Tenant ID could not be determined from user information');
        }
        data.tenant_id = tenantId;
      }
      
      const newBrand = await brandService.createBrand(data);
      ctx.set.status = 201;
      return {
        data: newBrand,
        message: 'Brand created successfully'
      };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in BrandController.create:", error);
      ctx.set.status = 500;
      return { error: 'Failed to create brand' };
    }
  }

  async update(id: number, data: TBrandUpdate, ctx: Context) {
    try {
      if (Object.keys(data).length === 0) {
          throw new BadRequestError('No update data provided.');
      }
      
      const updatedBrand = await brandService.updateBrand(id, data);
      return updatedBrand;
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in BrandController.update:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update brand' };
    }
  }

  async delete(id: number, ctx: Context) {
    try {
      await brandService.deleteBrand(id);
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
      console.error("Error in BrandController.delete:", error);
      ctx.set.status = 500;
      return { error: 'Failed to delete brand' };
    }
  }

  async uploadIcon(id: number, file: File | Blob, ctx: Context) {
    try {
      const numericId = Number(id);
      if (isNaN(numericId)) {
        ctx.set.status = 400;
        return { error: 'Invalid brand ID format. ID must be a number.' };
      }
      
      const result = await brandService.uploadBrandIcon(numericId, file);
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
      console.error("Error in BrandController.uploadIcon:", error);
      ctx.set.status = 500;
      return { error: 'Failed to upload brand icon' };
    }
  }

  async getAllTranslations(ctx: Context) {
    try {
      const brandId = parseInt(ctx.params.id, 10);
      if (isNaN(brandId)) throw new BadRequestError('Invalid brand ID.');

      const translations = await brandService.getTranslationsByBrand(brandId);
      return { data: translations, message: 'Brand translations retrieved successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in BrandController.getAllTranslations:", error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve brand translations' };
    }
  }

  async createTranslation(ctx: Context) {
    try {
      const brandId = parseInt(ctx.params.id, 10);
      if (isNaN(brandId)) throw new BadRequestError('Invalid brand ID.');

      const translationData = ctx.body as TBrandTranslationCreate;
      const newTranslation = await brandService.createTranslation(brandId, translationData);
      ctx.set.status = 201;
      return { data: newTranslation, message: 'Brand translation created successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in BrandController.createTranslation:", error);
      ctx.set.status = 500;
      return { error: 'Failed to create brand translation' };
    }
  }

  async updateTranslation(ctx: Context) {
    try {
      const brandId = parseInt(ctx.params.id, 10);
      const languageId = parseInt(ctx.params.languageId, 10);
      if (isNaN(brandId)) throw new BadRequestError('Invalid brand ID.');
      if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

      const updateData = ctx.body as Partial<TBrandTranslationCreate>;
      if (Object.keys(updateData).length === 0) {
          throw new BadRequestError('No update data provided.');
      }

      const updatedTranslation = await brandService.updateTranslation(brandId, languageId, updateData);
      return { data: updatedTranslation, message: 'Brand translation updated successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in BrandController.updateTranslation:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update brand translation' };
    }
  }

  async deleteTranslation(ctx: Context) {
    try {
      const brandId = parseInt(ctx.params.id, 10);
      const languageId = parseInt(ctx.params.languageId, 10);
      if (isNaN(brandId)) throw new BadRequestError('Invalid brand ID.');
      if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

      await brandService.deleteTranslation(brandId, languageId);
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
      console.error("Error in BrandController.deleteTranslation:", error);
      ctx.set.status = 500;
      return { error: 'Failed to delete brand translation' };
    }
  }
  
  async upsertTranslation(ctx: Context) {
    try {
      const brandId = parseInt(ctx.params.id, 10);
      const languageId = parseInt(ctx.params.languageId, 10);
      if (isNaN(brandId)) throw new BadRequestError('Invalid brand ID.');
      if (isNaN(languageId)) throw new BadRequestError('Invalid language ID.');

      const translationData = ctx.body as TBrandTranslationCreate;
      const result = await brandService.upsertTranslation(brandId, languageId, translationData);
      return { data: result, message: 'Brand translation saved successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      console.error("Error in BrandController.upsertTranslation:", error);
      ctx.set.status = 500;
      return { error: 'Failed to save brand translation' };
    }
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
      order?: "asc" | "desc";
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

      const result = await brandService.getPublishedInShop(shopId, {
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
      console.error(`Error in BrandController.getPublishedInShop(${shopId}):`, error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve brands published in shop' };
    }
  }
}

export const brandController = new BrandController();
