import Elysia, { t, type Context } from 'elysia'; 
import { brandController } from '../controllers/brandController';
import { 
  BrandCreateSchema, 
  BrandUpdateSchema, 
  FileUploadSchema,
  BrandTranslationCreateSchema,
  BrandTranslationUpdateSchema,
  PaginationQuerySchema,
  BrandIdParamSchema,
  BrandAndLanguageParamsSchema
} from '../types/brandTypes'; 
import { authMiddleware } from '@/middleware/auth';

export const brandRoutes = new Elysia({ prefix: '/brands' })
  .use(authMiddleware.isAuthenticated)
  .get('/', async (ctx) => brandController.getAll(ctx), { 
    query: PaginationQuerySchema, 
    detail: {
        summary: "Get List of Brands",
        tags: ['Brands']
    }
  })
  .post('/', async (ctx) => {
    return brandController.create(ctx);
  }, {
    body: BrandCreateSchema, 
    detail: { 
        summary: 'Create a new Brand', 
        tags: ['Brands'] 
    }
  })
  .get('/:id',
    async (ctx) => brandController.getById(ctx),
    {
        params: BrandIdParamSchema, 
        detail: {
            summary: 'Get Brand by ID',
            tags: ['Brands']
        }
    }
  ).put('/:id',
    async (ctx) => brandController.update(ctx),
    {
        params: BrandIdParamSchema, 
        body: BrandUpdateSchema, 
        detail: {
            summary: 'Update Brand by ID',
            tags: ['Brands']
        }
    }
  ).delete('/:id',
    async (ctx) => brandController.delete(ctx),
    {
        params: BrandIdParamSchema, 
        detail: {
            summary: 'Delete Brand by ID',
            tags: ['Brands']
        }
    }
  ).post('/:id/icon',
    async (ctx) => brandController.uploadIcon(ctx),
    {
        params: BrandIdParamSchema, 
        body: FileUploadSchema,
        detail: {
            summary: 'Upload Brand Icon',
            description: 'Upload an icon image for a brand',
            tags: ['Brands']
        }
    }
  ).get('/:id/translations', 
    async (ctx) => brandController.getTranslationsByBrand(ctx), 
    {
      params: BrandIdParamSchema, 
      detail: {
        summary: 'Get brand translations',
        description: 'Retrieve all translations for a specific brand',
        tags: ['Brand Translations']
      }
    }
  ).post('/:id/translations', 
    async (ctx) => brandController.createTranslation(ctx),
    {
      params: BrandIdParamSchema, 
      body: BrandTranslationCreateSchema,
      detail: {
        summary: 'Create brand translation',
        description: 'Create a new translation for a brand',
        tags: ['Brand Translations']
      }
    }
  )
  
  // PUT update translation
  .put('/:id/translations/:languageId', 
    async (ctx) => brandController.updateTranslation(ctx),
    {
      params: BrandAndLanguageParamsSchema, 
      body: BrandTranslationUpdateSchema,
      detail: {
        summary: 'Update brand translation',
        description: 'Update an existing translation for a brand',
        tags: ['Brand Translations']
      }
    }
  )
  
  // DELETE translation
  .delete('/:id/translations/:languageId', 
    async (ctx) => brandController.deleteTranslation(ctx),
    {
      params: BrandAndLanguageParamsSchema, 
      detail: {
        summary: 'Delete brand translation',
        description: 'Delete a specific translation for a brand',
        tags: ['Brand Translations']
      }
    }
  )
  
  // PUT upsert translation
  .put('/:id/translations/:languageId/upsert', 
    async (ctx) => brandController.upsertTranslation(ctx),
    {
      params: BrandAndLanguageParamsSchema, 
      body: BrandTranslationCreateSchema, 
      detail: {
        summary: 'Upsert brand translation',
        description: 'Create or update a translation for a brand',
        tags: ['Brand Translations']
      }
    }
  )
  
  // PUT bulk upsert translations
  .put('/:id/translations/bulk', 
    async (ctx) => brandController.bulkUpsertTranslations(ctx),
    {
      params: BrandIdParamSchema,
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
        summary: 'Bulk upsert brand translations',
        description: 'Create or update multiple translations for a brand in a single request',
        tags: ['Brand Translations']
      }
    }
  );
