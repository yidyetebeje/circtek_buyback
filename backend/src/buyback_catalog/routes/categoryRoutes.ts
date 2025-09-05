import { Elysia } from 'elysia';
import { categoryController } from '../controllers/categoryController';
import {
  CategoryCreateSchema,
  CategoryUpdateSchema,
  CategoryIdParamSchema,
  CategoryWithTranslationsCreateSchema,
  CategoryWithTranslationsUpdateSchema,
  CategoryTranslationCreateSchema,
  CategoryTranslationUpdateSchema,
  FileUploadSchema
} from '../types/categoryTypes';
import { t } from 'elysia';
import {
  PaginationQuerySchema,
  CategorySlugParamSchema,
  TranslationParamsSchema,
  CategoryAndLanguageParamsSchema
} from '../types/categoryTypes';
import { authMiddleware, type JwtUser } from '@/middleware/auth';
import { getClientId } from '../utils/getId';

export const categoryRoutes = new Elysia({ prefix: '/categories' })
  .use(authMiddleware.isAuthenticated)
  .get('/', 
    async (ctx) => {
      return await categoryController.getAllCategories(ctx as any);
    }, {
      query: PaginationQuerySchema,
      detail: {
        summary: 'Get all categories',
        description: 'Retrieve a paginated list of all device categories',
        tags: ['Categories']
      }
    }
  )
  
  // GET category by ID
  .get('/:categoryId', 
    async (ctx) => {
      return await categoryController.getCategoryById(ctx);
    }, {
      params: CategoryIdParamSchema,
      detail: {
        summary: 'Get category by ID',
        description: 'Retrieve a single device category by its ID',
        tags: ['Categories']
      }
    }
  )
  
  // GET category by slug
  .get('/slug/:slug/client/:clientId', 
    async (ctx) => {
      return await categoryController.getCategoryBySlug(ctx);
    }, {
      params: CategorySlugParamSchema,
      detail: {
        summary: 'Get category by slug',
        description: 'Retrieve a single device category by its slug and client ID',
        tags: ['Categories']
      }
    }
  )
  
  // POST create new category
  .post('/', 
    async (ctx) => {
      return await categoryController.createCategory(ctx as any);
    }, {
      body: CategoryCreateSchema,
      detail: {
        summary: 'Create a new category',
        description: 'Create a new device category',
        tags: ['Categories']
      }
    }
  )
  
  // PUT update category
  .put('/:categoryId', 
    async (ctx) => {
      return await categoryController.updateCategory(ctx);
    }, {
      params: CategoryIdParamSchema,
      body: CategoryUpdateSchema,
      detail: {
        summary: 'Update category',
        description: 'Update an existing device category by its ID',
        tags: ['Categories']
      }
    }
  )
  
  // DELETE category
  .delete('/:categoryId', 
    async (ctx) => {
      return await categoryController.deleteCategory(ctx);
    }, {
      params: CategoryIdParamSchema,
      detail: {
        summary: 'Delete category',
        description: 'Delete a device category by its ID',
        tags: ['Categories']
      }
    }
  )
  
  // POST create category with translations
  .post('/with-translations', 
    async (ctx) => {
      return await categoryController.createCategoryWithTranslations(ctx as any);
    }, {
      body: CategoryWithTranslationsCreateSchema,
      detail: {
        summary: 'Create category with translations',
        description: 'Create a new device category with multiple translations in one request',
        tags: ['Categories']
      }
    }
  )
  
  // PUT update category with translations
  .put('/:categoryId/with-translations', 
    async (ctx) => {
      return await categoryController.updateCategoryWithTranslations(ctx);
    }, {
      params: CategoryIdParamSchema,
      body: CategoryWithTranslationsUpdateSchema,
      detail: {
        summary: 'Update category with translations',
        description: 'Update an existing device category and its translations in one request',
        tags: ['Categories']
      }
    }
  )
  
  // POST upload category icon
  .post('/:categoryId/icon', 
    async (ctx) => {
      return await categoryController.uploadCategoryIcon(ctx);
    }, {
      params: CategoryIdParamSchema,
      body: FileUploadSchema,
      detail: {
        summary: 'Upload category icon',
        description: 'Upload an icon image for a device category',
        tags: ['Categories']
      }
    }
  )
  
  // Translations endpoints
  
  // GET translations by category
  .get('/:categoryId/translations', 
    async (ctx) => {
      return await categoryController.getTranslationsByCategory(ctx);
    }, {
      params: CategoryIdParamSchema, 
      detail: {
        summary: 'Get category translations',
        description: 'Retrieve all translations for a specific device category',
        tags: ['Category Translations']
      }
    }
  )
  
  // POST create translation
  .post('/:categoryId/translations', 
    async (ctx) => {
      return await categoryController.createTranslation(ctx);
    }, {
      params: CategoryIdParamSchema, 
      body: CategoryTranslationCreateSchema,
      detail: {
        summary: 'Create category translation',
        description: 'Create a new translation for a device category',
        tags: ['Category Translations']
      }
    }
  )
  
  // PUT update translation
  .put('/:categoryId/translations/:languageId', 
    async (ctx) => {
      return await categoryController.updateTranslation(ctx);
    }, {
      params: CategoryAndLanguageParamsSchema,
      body: CategoryTranslationUpdateSchema,
      detail: {
        summary: 'Update category translation',
        description: 'Update an existing translation for a device category',
        tags: ['Category Translations']
      }
    }
  )
  
  // PUT upsert translation (create or update)
  .put('/:categoryId/translations/:languageId/upsert', 
    async (ctx) => {
      return await categoryController.upsertTranslation(ctx);
    }, {
      params: CategoryAndLanguageParamsSchema,
      body: CategoryTranslationCreateSchema,
      detail: {
        summary: 'Upsert category translation',
        description: 'Create a new translation or update an existing one for a device category',
        tags: ['Category Translations']
      }
    }
  )
  
  // PUT bulk upsert translations
  .put('/:categoryId/translations/bulk', 
    async (ctx) => categoryController.bulkUpsertTranslations(ctx),
    {
      params: CategoryIdParamSchema,
      body: t.Object({
        translations: t.Array(
          t.Object({
            language_id: t.Number({ minimum: 1 }),
            title: t.String({ minLength: 1, maxLength: 255 }),
            description: t.Optional(t.String()),
            meta_title: t.Optional(t.String({ maxLength: 255 })),
            meta_description: t.Optional(t.String()),
            meta_keywords: t.Optional(t.String()),
          })
        )
      }),
      detail: {
        summary: 'Bulk upsert category translations',
        description: 'Create or update multiple translations for a category in a single request',
        tags: ['Category Translations']
      }
    }
  )
  
  // DELETE translation
  .delete('/:categoryId/translations/:languageId', 
    async (ctx) => {
      return await categoryController.deleteTranslation(ctx);
    }, {
      params: CategoryAndLanguageParamsSchema,
      detail: {
        summary: 'Delete category translation',
        description: 'Delete a translation for a device category',
        tags: ['Category Translations']
      }
    }
  );
