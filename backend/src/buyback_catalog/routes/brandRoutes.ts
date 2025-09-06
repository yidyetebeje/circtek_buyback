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
import { requireRole } from '../../auth';

export const brandRoutes = new Elysia({ prefix: '/brands' })
  .use(requireRole([]))
  .get('/', async (ctx) => brandController.getAll(ctx as any), { 
    query: PaginationQuerySchema, 
    detail: {
        summary: "Get List of Brands",
        tags: ['Brands']
    }
  })
  .post('/', async (ctx) => {
    return brandController.create(ctx.body as any, ctx as any);
  }, {
    body: BrandCreateSchema, 
    detail: { 
        summary: 'Create a new Brand', 
        tags: ['Brands'] 
    }
  })
  .get('/:id',
    async (ctx) => {
      const id = parseInt(ctx.params.id, 10);
      return brandController.getById(id, ctx as any);
    },
    {
        params: BrandIdParamSchema, 
        detail: {
            summary: 'Get Brand by ID',
            tags: ['Brands']
        }
    }
  ).put('/:id',
    async (ctx) => {
      const id = parseInt(ctx.params.id, 10);
      return brandController.update(id, ctx.body as any, ctx as any);
    },
    {
        params: BrandIdParamSchema, 
        body: BrandUpdateSchema, 
        detail: {
            summary: 'Update Brand by ID',
            tags: ['Brands']
        }
    }
  ).delete('/:id',
    async (ctx) => {
      const id = parseInt(ctx.params.id, 10);
      return brandController.delete(id, ctx as any);
    },
    {
        params: BrandIdParamSchema, 
        detail: {
            summary: 'Delete Brand by ID',
            tags: ['Brands']
        }
    }
  ).post('/:id/icon',
    async (ctx) => {
      const id = parseInt(ctx.params.id, 10);
      return brandController.uploadIcon(id, ctx.body.file, ctx as any);
    },
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
    async (ctx) => brandController.getAllTranslations(ctx as any), 
    {
      params: BrandIdParamSchema, 
      detail: {
        summary: 'Get brand translations',
        description: 'Retrieve all translations for a specific brand',
        tags: ['Brand Translations']
      }
    }
  ).post('/:id/translations', 
    async (ctx) => brandController.createTranslation(ctx as any),
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
    async (ctx) => brandController.updateTranslation(ctx as any),
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
    async (ctx) => brandController.deleteTranslation(ctx as any),
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
    async (ctx) => brandController.upsertTranslation(ctx as any),
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
    async (ctx) => brandController.bulkUpsertTranslations(ctx as any),
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
