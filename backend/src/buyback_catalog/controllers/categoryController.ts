import { categoryService } from "../services/categoryService";
import { Context } from "elysia";
import { NotFoundError, BadRequestError } from "../utils/errors";

import {
  TCategoryCreate, 
  TCategoryUpdate, 
  TCategoryWithTranslationsCreate,
  TCategoryWithTranslationsUpdate,
  TCategoryTranslationCreate, 
  TCategoryTranslationUpdate,  
  CategoryIdParamSchema, 
  CategorySlugParamSchema, 
  FileUploadSchema,
  PaginationQuerySchema, 
  CategoryAndLanguageParamsSchema 
} from '../types/categoryTypes';
import { Static } from '@sinclair/typebox'; // For type inference from Elysia/TypeBox schemas

export class CategoryController {
  async getAllCategories(ctx: Context<{ query: Static<typeof PaginationQuerySchema> }> & { currentUserId: number; currentTenantId: number; currentRole: string }) {
    const { query, currentTenantId, currentRole } = ctx;
    const { page, limit, orderBy, order, tenantId: queryTenantId } = query;
    let effectiveTenantId: number | undefined = queryTenantId;
    if (currentRole !== 'super_admin') {
        effectiveTenantId = currentTenantId;
    } else {
        effectiveTenantId = queryTenantId;
    }
    const categories = await categoryService.getAllCategories(page!, limit!, orderBy!, order!, effectiveTenantId);
    return {
      message: "Categories retrieved successfully.",
      data: categories.data,
      meta: categories.meta,
      errors: null
    };
  }

  async getCategoryById(ctx: Context<{ params: Static<typeof CategoryIdParamSchema> }>) {
    const { params } = ctx;
    const category = await categoryService.getCategoryById(params.categoryId);
    return {
      message: "Category retrieved successfully.",
      data: category,
      errors: null
    };
  }

  async getCategoryBySlug(ctx: Context<{ params: Static<typeof CategorySlugParamSchema> }>) {
    const { params, currentTenantId } = ctx as any;
    const category = await categoryService.getCategoryBySlug(params.slug, currentTenantId);
    return {
      message: "Category retrieved successfully by slug.",
      data: category,
      errors: null
    };
  }

  async createCategory(ctx: Context<{ body: TCategoryCreate }> & { currentUserId: number; currentTenantId: number; error: Context['error'] }) {
    const { body, currentTenantId, error: ElysiaError } = ctx;
    const data = { ...body };
    if (currentTenantId === undefined) {
      return ElysiaError(400, 'Tenant ID could not be determined from user information');
    }
    data.tenant_id = currentTenantId;
    const newCategory =  await categoryService.createCategory(data);
    return {
      status: 201, 
      message: "Category created successfully.",
      data: newCategory,
      errors: null
    };
  }

  async updateCategory(ctx: Context<{ params: Static<typeof CategoryIdParamSchema>, body: TCategoryUpdate }>) {
    const { params, body } = ctx;
    const updatedCategory = await categoryService.updateCategory(params.categoryId, body);
    return {
      message: "Category updated successfully.",
      data: updatedCategory,
      errors: null
    };
  }

  async deleteCategory(ctx: Context<{ params: Static<typeof CategoryIdParamSchema> }>) {
    const { params } = ctx;
    await categoryService.deleteCategory(params.categoryId);
    ctx.set.status = 204;
    return;
  }

  async createCategoryWithTranslations(ctx: Context<{ body: TCategoryWithTranslationsCreate }> & { currentUserId: number; currentTenantId: number; error: Context['error'] }) {
    const { body, currentTenantId, error: ElysiaError } = ctx;
    const data = { ...body };
    if (currentTenantId === undefined) {
      return ElysiaError(400, 'Tenant ID could not be determined from user information');
    }
    data.category = { ...data.category, tenant_id: currentTenantId };
    const newCategoryWithTranslations = await categoryService.createCategoryWithTranslations(data);
    return {
      status: 201, 
      message: "Category with translations created successfully.",
      data: newCategoryWithTranslations,
      errors: null
    };
  }

  async updateCategoryWithTranslations(ctx: Context<{ params: Static<typeof CategoryIdParamSchema>, body: TCategoryWithTranslationsUpdate }>) {
    const { params, body } = ctx;
    const updatedCategoryWithTranslations = await categoryService.updateCategoryWithTranslations(params.categoryId, body);
    return {
      message: "Category with translations updated successfully.",
      data: updatedCategoryWithTranslations,
      errors: null
    };
  }

  async uploadCategoryIcon(ctx: Context<{ params: Static<typeof CategoryIdParamSchema>, body: Static<typeof FileUploadSchema> }>) {
    const { params, body } = ctx;
    const uploadResult = await categoryService.uploadCategoryIcon(params.categoryId, body.file);
    return {
      message: "Category icon uploaded successfully.",
      data: uploadResult,
      errors: null
    };
  }

  async getTranslationsByCategory(ctx: Context<{ params: Static<typeof CategoryIdParamSchema> }>) {
    const { params } = ctx;
    const translations = await categoryService.getTranslationsByCategory(params.categoryId);
    return {
      message: "Category translations retrieved successfully.",
      data: translations,
      errors: null
    };
  }

  async createTranslation(ctx: Context<{ params: { categoryId: number }, body: TCategoryTranslationCreate }>) {
    const { params, body } = ctx;
    const newTranslation = await categoryService.createTranslation(params.categoryId, body);
    return {
        status: 201,
        message: "Translation created successfully.",
        data: newTranslation,
        errors: null
    };
  }

  async updateTranslation(ctx: Context<{ params: Static<typeof CategoryAndLanguageParamsSchema>, body: TCategoryTranslationUpdate }>) {
    const { params, body } = ctx;
    const updatedTranslation = await categoryService.updateTranslation(params.categoryId, params.languageId, body);
    return {
      message: "Translation updated successfully.",
      data: updatedTranslation,
      errors: null
    };
  }

  async deleteTranslation(ctx: Context<{ params: Static<typeof CategoryAndLanguageParamsSchema> }>) {
    const { params } = ctx;
    await categoryService.deleteTranslation(params.categoryId, params.languageId);
    ctx.set.status = 204;
    return;
  }

  async upsertTranslation(ctx: Context<{ params: Static<typeof CategoryAndLanguageParamsSchema>, body: TCategoryTranslationCreate }>) {
    const { params, body } = ctx;
    const upsertedTranslation = await categoryService.upsertTranslation(params.categoryId, params.languageId, body);
    return {
      message: "Translation upserted successfully.",
      data: upsertedTranslation,
      errors: null
    };
  }

  async bulkUpsertTranslations(ctx: Context<{ params: Static<typeof CategoryIdParamSchema>, body: { translations: Array<{ language_id: number; title: string; description?: string; meta_title?: string; meta_description?: string; meta_keywords?: string; }> } }> & { currentUserId: number }) {
    try {
      const { params, body, currentUserId } = ctx;
      const categoryId = params.categoryId;

      if (!currentUserId) {
        throw new BadRequestError('User not found.');
      }

      if (isNaN(categoryId)) {
        throw new BadRequestError('Invalid category ID format. ID must be a number.');
      }

      const { translations } = body;
      
      if (!translations || !Array.isArray(translations) || translations.length === 0) {
        throw new BadRequestError('Translations array is required and must not be empty.');
      }

      // Validate each translation
      for (const translation of translations) {
        if (!translation.language_id || !translation.title) {
          throw new BadRequestError('Each translation must have language_id and title.');
        }
      }

      const results = await categoryService.bulkUpsertTranslations(categoryId, translations);

      const message = results.errors.length > 0 
        ? `Bulk upsert completed with ${results.created} created, ${results.updated} updated, and ${results.errors.length} errors.`
        : `Bulk upsert completed successfully: ${results.created} created, ${results.updated} updated.`;

      return {
        success: results.errors.length === 0,
        message,
        data: results,
        errors: results.errors.length > 0 ? results.errors : null
      };
    } catch (error) {
      console.error("Error in CategoryController.bulkUpsertTranslations:", error);
      
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Unknown error occurred during bulk upsert'
      );
    }
  }

  async getPublishedInShop(
    shopId: number,
    options: {
      page?: number;
      limit?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
      search?: string;
      tenantId?: number; // This tenantId is for filtering categories by tenant, if applicable
    },
    _ctx?: Context // Context might not be needed if not setting status directly
  ) {
    if (isNaN(shopId)) {
      throw new BadRequestError('Invalid shop ID.');
    }
    
    const page = options.page || 1;
    const limit = options.limit || 20;
    const orderBy = options.orderBy || 'title';
    const order = options.order || 'asc';
    const search = options.search || '';
    const filterByTenantId = options.tenantId; 

    if (isNaN(page) || page < 1) throw new BadRequestError('Invalid page number.');
    if (isNaN(limit) || limit < 1) throw new BadRequestError('Invalid limit value.');
    if (filterByTenantId !== undefined && isNaN(filterByTenantId)) throw new BadRequestError('Invalid tenant ID.');

    const publishedCategories = await categoryService.getPublishedInShop(shopId, {
      page,
      limit,
      orderBy,
      order,
      search,
      tenantId: filterByTenantId
    });
    return {
      message: "Published categories in shop retrieved successfully.",
      data: publishedCategories.data,
      meta: publishedCategories.meta,
      errors: null
    };
    // Errors (NotFoundError, BadRequestError, or others) will propagate to Elysia's error handler
  }
}

export const categoryController = new CategoryController();
