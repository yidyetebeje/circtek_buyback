import Elysia, { t, type Context } from 'elysia'; 
import { modelController } from '../controllers/modelController';
import { ModelCreateSchema, ModelUpdateSchema, FileUploadSchema, ModelTranslationCreateSingleSchema, ModelTranslationUpdateSingleSchema } from '../types/modelTypes';
import { requireRole } from '../../auth'; 
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors';

export const modelRoutes = new Elysia({ prefix: '/models' })
  // Protect the GET /models route with authentication
  .use(requireRole([])) // Added authentication middleware
  .get('/', async (ctx) => {
    try {
      const page = ctx.query.page ? Number(ctx.query.page) : undefined;
      const limit = ctx.query.limit ? Number(ctx.query.limit) : undefined;
      const orderBy = ctx.query.orderBy as string | undefined;
      const order = ctx.query.order as 'asc' | 'desc' | undefined;
      const category_id = ctx.query.category_id as string | undefined;
      const brand_id = ctx.query.brand_id as string | undefined;
      const series_id = ctx.query.series_id as string | undefined;
      const title = ctx.query.title as string | undefined;
      const tenant_id = ctx.query.tenant_id ? Number(ctx.query.tenant_id) : undefined;
      const { currentTenantId } = ctx as any;

      const result = await modelController.getAll({
        page,
        limit,
        orderBy,
        order,
        category_id,
        brand_id,
        series_id,
        title,
        tenant_id,
        currentTenantId
      });
      return result;
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in getAll route:", error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve models' };
    }
  }, {
    query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, default: 20 })),
        orderBy: t.Optional(t.String({ default: 'title' })),
        order: t.Optional(t.Enum({ asc: 'asc', desc: 'desc' }, { default: 'asc' })),
        category_id: t.Optional(t.String()),
        brand_id: t.Optional(t.String()),
        series_id: t.Optional(t.String()),
        title: t.Optional(t.String()),
        tenant_id: t.Optional(t.Numeric())
    }),
    detail: {
        summary: "Get List of Models",
        description: "Retrieve models with options for pagination, sorting, and filtering by single or multiple category/brand/series IDs (comma-separated).",
        tags: ['Models']
    }
  })
  
  // GET /models/{id} - Retrieve a specific model by ID - public read access
  .get('/:id',
    async (ctx) => { 
        try {
          const numericId = parseInt(ctx.params.id, 10);
          if (isNaN(numericId)) {
              ctx.set.status = 400; // Bad Request
              return { error: 'Invalid model ID format. ID must be a number.' };
          }
          const result = await modelController.getById(numericId);
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
          console.error("Error in getById route:", error);
          ctx.set.status = 500;
          return { error: 'Failed to retrieve model' };
        }
    },
    {
        detail: {
            summary: 'Get Model by ID',
            tags: ['Models']
        }
    }
  )
  
  // All operations below require authentication
  .group('', app => app
    // Apply authentication middleware to write operations
    .use(requireRole([]))
    
    // POST /models - Create a new model
    .post('/', async (ctx) => {
      try {
        // Get tenantId from authenticated user
        const data = { ...ctx.body } as any;
        const { currentUserId, currentTenantId, currentRole } = ctx as any;
        if (currentUserId) {
          // Add tenant_id to the data
          data.tenant_id = currentTenantId;
          // Ensure client_id is a number as required by the schema
          const tenantId = currentTenantId; // Using tenant as client for now
          if (tenantId !== undefined) {
            data.tenant_id = tenantId;
          } else {
            ctx.set.status = 400;
            return { error: 'Tenant ID could not be determined from user information' };
          }
        } else {
          ctx.set.status = 401;
          return { error: 'User must be authenticated to create a model' };
        }
        const result = await modelController.create(data, currentTenantId, currentRole);
        ctx.set.status = 201;
        return result;
      } catch (error: any) {
        if (error instanceof BadRequestError) {
          ctx.set.status = 400;
          return { error: error.message };
        }
        console.error("Error in create route:", error);
        ctx.set.status = 500;
        return { error: 'Failed to create model' };
      }
    }, {
      body: ModelCreateSchema, 
      detail: { 
          summary: 'Create a new Model',
          description: 'Create a new device model with properties like title, base_price, relationships to category, brand, etc.',
          tags: ['Models'] 
      }
    })

    // PUT /models/{id} - Update a specific model by ID
    .put('/:id',
      async (ctx) => { 
          try {
            const numericId = parseInt(ctx.params.id, 10);
            if (isNaN(numericId)) {
                ctx.set.status = 400;
                return { error: 'Invalid model ID format. ID must be a number.' };
            }
            const result = await modelController.update(numericId, ctx.body);
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
            console.error("Error in update route:", error);
            ctx.set.status = 500;
            return { error: 'Failed to update model' };
          }
      },
      {
          body: ModelUpdateSchema, 
          detail: {
              summary: 'Update Model by ID',
              description: 'Update model properties including title, base_price, category, brand, etc.',
              tags: ['Models']
          }
      }
    )

    // DELETE /models/{id} - Delete a specific model by ID
    .delete('/:id',
      async (ctx) => { 
          try {
            const numericId = parseInt(ctx.params.id, 10);
            if (isNaN(numericId)) {
                ctx.set.status = 400;
                return { error: 'Invalid model ID format. ID must be a number.' };
            }
            await modelController.delete(numericId);
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
            console.error("Error in delete route:", error);
            ctx.set.status = 500;
            return { error: 'Failed to delete model' };
          }
      },
      {
          detail: {
              summary: 'Delete Model by ID',
              tags: ['Models']
          }
      }
    )

    // POST /models/{id}/image - Upload an image for a model
    .post('/:id/image',
      async (ctx) => { 
          try {
            const numericId = parseInt(ctx.params.id, 10);
            if (isNaN(numericId)) {
                ctx.set.status = 400;
                return { error: 'Invalid model ID format. ID must be a number.' };
            }
            const result = await modelController.uploadImage(numericId, ctx.body.file);
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
            console.error("Error in uploadImage route:", error);
            ctx.set.status = 500;
            return { error: 'Failed to upload model image' };
          }
      },
      {
          body: FileUploadSchema,
          detail: {
              summary: 'Upload Model Image',
              description: 'Upload an image for a model',
              tags: ['Models']
          }
      }
    )

    // --- Translation Routes ---

    // GET /models/{id}/translations - Retrieve all translations for a model
    .get('/:id/translations', async (ctx) => {
      try {
        const modelId = Number(ctx.params.id);
        if (isNaN(modelId)) {
          ctx.set.status = 400;
          return { error: 'Invalid model ID format. ID must be a number.' };
        }
        const result = await modelController.getAllTranslations(modelId);
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
        console.error("Error in getAllTranslations route:", error);
        ctx.set.status = 500;
        return { error: 'Failed to retrieve model translations' };
      }
    }, {
      detail: {
          summary: 'Get All Translations for a Model',
          tags: ['Models', 'Translations']
      },
      params: t.Object({ id: t.Numeric() })
    })

    // GET /models/{id}/translations/{languageId} - Retrieve a specific translation
    .get('/:id/translations/:languageId', async (ctx) => {
      try {
        const modelId = Number(ctx.params.id);
        const languageId = Number(ctx.params.languageId);
        if (isNaN(modelId) || isNaN(languageId)) {
          ctx.set.status = 400;
          return { error: 'Invalid ID format. IDs must be numbers.' };
        }
        const result = await modelController.getTranslation(modelId, languageId);
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
        console.error("Error in getTranslation route:", error);
        ctx.set.status = 500;
        return { error: 'Failed to retrieve model translation' };
      }
    }, {
      detail: {
          summary: 'Get a Specific Translation for a Model',
          tags: ['Models', 'Translations']
      },
      params: t.Object({ 
          id: t.Numeric(),
          languageId: t.Numeric()
      })
    })

    // POST /models/{id}/translations - Create a new translation for a model
    .post('/:id/translations', async (ctx) => {
      try {
        const modelId = Number(ctx.params.id);
        if (isNaN(modelId)) {
          ctx.set.status = 400;
          return { error: 'Invalid model ID format. ID must be a number.' };
        }
        const translationData = ctx.body as typeof ModelTranslationCreateSingleSchema._type;
        const result = await modelController.createTranslation(modelId, translationData);
        ctx.set.status = 201;
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
        // Handle potential duplicate entry errors
        if (error.code === 'ER_DUP_ENTRY') {
          ctx.set.status = 409;
          return { error: 'Translation for this model and language already exists.' };
        }
        console.error("Error in createTranslation route:", error);
        ctx.set.status = 500;
        return { error: 'Failed to create model translation' };
      }
    }, {
      body: ModelTranslationCreateSingleSchema,
      detail: {
          summary: 'Create a Translation for a Model',
          tags: ['Models', 'Translations']
      },
      params: t.Object({ id: t.Numeric() })
    })

    // PUT /models/{id}/translations/{languageId} - Update a specific translation
    .put('/:id/translations/:languageId', async (ctx) => {
      try {
        const modelId = Number(ctx.params.id);
        const languageId = Number(ctx.params.languageId);
        if (isNaN(modelId) || isNaN(languageId)) {
          ctx.set.status = 400;
          return { error: 'Invalid ID format. IDs must be numbers.' };
        }
        const updateData = ctx.body as typeof ModelTranslationUpdateSingleSchema._type;
        const result = await modelController.updateTranslation(modelId, languageId, updateData);
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
        console.error("Error in updateTranslation route:", error);
        ctx.set.status = 500;
        return { error: 'Failed to update model translation' };
      }
    }, {
      body: ModelTranslationUpdateSingleSchema,
      detail: {
          summary: 'Update a Specific Translation for a Model',
          tags: ['Models', 'Translations']
      },
      params: t.Object({ 
          id: t.Numeric(),
          languageId: t.Numeric()
      })
    })

    // DELETE /models/{id}/translations/{languageId} - Delete a specific translation
    .delete('/:id/translations/:languageId', async (ctx) => {
      try {
        const modelId = Number(ctx.params.id);
        const languageId = Number(ctx.params.languageId);
        if (isNaN(modelId) || isNaN(languageId)) {
          ctx.set.status = 400;
          return { error: 'Invalid ID format. IDs must be numbers.' };
        }
        await modelController.deleteTranslation(modelId, languageId);
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
        console.error("Error in deleteTranslation route:", error);
        ctx.set.status = 500;
        return { error: 'Failed to delete model translation' };
      }
    }, {
      detail: {
          summary: 'Delete a Specific Translation for a Model',
          tags: ['Models', 'Translations']
      },
      params: t.Object({ 
          id: t.Numeric(),
          languageId: t.Numeric()
      })
    })

    // PUT /models/{id}/translations/{languageId}/upsert - Create or update a translation
    .put('/:id/translations/:languageId/upsert', async (ctx) => {
      try {
        const modelId = Number(ctx.params.id);
        const languageId = Number(ctx.params.languageId);
        if (isNaN(modelId) || isNaN(languageId)) {
          ctx.set.status = 400;
          return { error: 'Invalid ID format. IDs must be numbers.' };
        }
        const translationData = ctx.body as typeof ModelTranslationCreateSingleSchema._type;
        const result = await modelController.upsertTranslation(modelId, languageId, translationData);
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
        console.error("Error in upsertTranslation route:", error);
        ctx.set.status = 500;
        return { error: 'Failed to save model translation' };
      }
    }, {
      body: ModelTranslationCreateSingleSchema,
      detail: {
          summary: 'Upsert a Translation for a Model',
          description: 'Create a new translation or update an existing one for a model',
          tags: ['Models', 'Translations']
      },
      params: t.Object({ 
          id: t.Numeric(),
          languageId: t.Numeric()
      })
    })

    // POST /models/{id}/translations/bulk-upsert - Bulk upsert translations
    .post('/:id/translations/bulk-upsert', async (ctx) => {
      try {
        const modelId = Number(ctx.params.id);
        if (isNaN(modelId)) {
          ctx.set.status = 400;
          return { error: 'Invalid model ID format. ID must be a number.' };
        }
        const { translations } = ctx.body as { translations: Array<{ language_id: number; title: string; description?: string; meta_title?: string; meta_description?: string; meta_keywords?: string; specifications?: string; }> };
        const result = await modelController.bulkUpsertTranslations(modelId, translations);
        return result;
      } catch (error: any) {
        if (error instanceof BadRequestError || error instanceof NotFoundError) {
          ctx.set.status = error instanceof BadRequestError ? 400 : 404;
          return { error: error.message };
        }
        console.error("Error in bulkUpsertTranslations route:", error);
        ctx.set.status = 500;
        return { error: 'Failed to bulk upsert model translations' };
      }
    }, {
      body: t.Object({
        translations: t.Array(
          t.Object({
            language_id: t.Number({ minimum: 1 }),
            title: t.String({ minLength: 1, maxLength: 255 }),
            description: t.Optional(t.String()),
            meta_title: t.Optional(t.String({ maxLength: 255 })),
            meta_description: t.Optional(t.String()),
            meta_keywords: t.Optional(t.String()),
            specifications: t.Optional(t.String()), // JSON string
          })
        )
      }),
      detail: {
        summary: 'Bulk upsert model translations',
        description: 'Create or update multiple translations for a model in a single request',
        tags: ['Models', 'Translations']
      },
      params: t.Object({ 
        id: t.Numeric()
      })
    })

    // Legacy route alias for backward compatibility
    .post('/:id/translations/bulk', async (ctx) => {
      try {
        const modelId = Number(ctx.params.id);
        if (isNaN(modelId)) {
          ctx.set.status = 400;
          return { error: 'Invalid model ID format. ID must be a number.' };
        }
        const { translations } = ctx.body as { translations: Array<{ language_id: number; title: string; description?: string; meta_title?: string; meta_description?: string; meta_keywords?: string; specifications?: string; }> };
        const result = await modelController.bulkUpsertTranslations(modelId, translations);
        return result;
      } catch (error: any) {
        if (error instanceof BadRequestError || error instanceof NotFoundError) {
          ctx.set.status = error instanceof BadRequestError ? 400 : 404;
          return { error: error.message };
        }
        console.error("Error in bulkUpsertTranslations route:", error);
        ctx.set.status = 500;
        return { error: 'Failed to bulk upsert model translations' };
      }
    })
  );
