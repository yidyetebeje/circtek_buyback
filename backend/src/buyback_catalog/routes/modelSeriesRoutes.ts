import Elysia, { t, type Context } from 'elysia'; 
import { modelSeriesController } from '../controllers/modelSeriesController';
import { ModelSeriesCreateSchema, ModelSeriesUpdateSchema, FileUploadSchema, ModelSeriesTranslationCreateSingleSchema, ModelSeriesTranslationUpdateSingleSchema } from '../types/modelSeriesTypes'; 
import { requireRole } from '../../auth';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors';

export const modelSeriesRoutes = new Elysia({ prefix: '/model-series' })
  .use(requireRole([])) // Add centralized authentication middleware
  // GET /model-series - Retrieve all model series with pagination/sorting/filtering
  .get('/', async (ctx) => {
    try {
      const page = ctx.query.page ? Number(ctx.query.page) : undefined;
      const limit = ctx.query.limit ? Number(ctx.query.limit) : undefined;
      const orderBy = ctx.query.orderBy as string | undefined;
      const order = ctx.query.order as 'asc' | 'desc' | undefined;
      const tenantId = ctx.query.tenantId ? Number(ctx.query.tenantId) : undefined;
      const search = ctx.query.q as string | undefined;
      const { currentTenantId, currentRole } = ctx as any;

      const result = await modelSeriesController.getAll({
        page,
        limit,
        orderBy,
        order,
        tenantId,
        search,
        currentTenantId,
        currentRole
      });
      return result;
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in getAll route:", error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve model series' };
    }
  }, {
    query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, default: 20 })),
        orderBy: t.Optional(t.String({ default: 'order_no' })),
        order: t.Optional(t.Enum({ asc: 'asc', desc: 'desc' }, { default: 'asc' })),
        tenantId: t.Optional(t.Numeric()),
        q: t.Optional(t.String()),
    }),
    detail: {
        summary: "Get List of Model Series",
        tags: ['Model Series']
    }
  })

  // POST /model-series - Create a new model series
  .post('/', async (ctx) => {
    try {
      // Get tenantId from authenticated user
      const data = { ...ctx.body } as any;
      const { currentUserId, currentTenantId } = ctx as any;
      if (currentUserId) {
        // Add tenant_id to the data
        data.tenant_id = currentTenantId;
        // Ensure client_id is a number as required by the schema
        const tenantId = currentTenantId; // Using tenant as client for now
        if (tenantId !== undefined) {
          data.tenantId = tenantId;
        } else {
          ctx.set.status = 400;
          return { error: 'Client ID could not be determined from user information' };
        }
      } else {
        ctx.set.status = 401;
        return { error: 'User must be authenticated to create a model series' };
      }
      const result = await modelSeriesController.create(data);
      ctx.set.status = 201;
      return result;
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof ConflictError) {
        ctx.set.status = 409;
        return { error: error.message };
      }
      console.error("Error in create route:", error);
      ctx.set.status = 500;
      return { error: 'Failed to create model series' };
    }
  }, {
    body: ModelSeriesCreateSchema, 
    detail: { 
        summary: 'Create a new Model Series', 
        tags: ['Model Series'] 
    }
  })

  // GET /model-series/{id} - Retrieve a specific model series by ID
  .get('/:id',
    async (ctx) => { 
        try {
          const numericId = parseInt(ctx.params.id, 10);
          if (isNaN(numericId)) {
              ctx.set.status = 400; // Bad Request
              return { error: 'Invalid model series ID format. ID must be a number.' };
          }
          const result = await modelSeriesController.getById(numericId);
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
          return { error: 'Failed to retrieve model series' };
        }
    },
    {
        detail: {
            summary: 'Get Model Series by ID',
            tags: ['Model Series']
        }
    }
  )

  // PUT /model-series/{id} - Update a specific model series by ID
  .put('/:id',
    async (ctx) => { 
        try {
          const numericId = parseInt(ctx.params.id, 10);
          if (isNaN(numericId)) {
              ctx.set.status = 400;
              return { error: 'Invalid model series ID format. ID must be a number.' };
          }
          const result = await modelSeriesController.update(numericId, ctx.body);
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
          if (error instanceof ConflictError) {
            ctx.set.status = 409;
            return { error: error.message };
          }
          console.error("Error in update route:", error);
          ctx.set.status = 500;
          return { error: 'Failed to update model series' };
        }
    },
    {
        body: ModelSeriesUpdateSchema, 
        detail: {
            summary: 'Update Model Series by ID',
            tags: ['Model Series']
        }
    }
  )

  // DELETE /model-series/{id} - Delete a specific model series by ID
  .delete('/:id',
    async (ctx) => { 
        try {
          const numericId = parseInt(ctx.params.id, 10);
          if (isNaN(numericId)) {
              ctx.set.status = 400;
              return { error: 'Invalid model series ID format. ID must be a number.' };
          }
          await modelSeriesController.delete(numericId);
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
          return { error: 'Failed to delete model series' };
        }
    },
    {
        detail: {
            summary: 'Delete Model Series by ID',
            tags: ['Model Series']
        }
    }
  )

  // POST /model-series/{id}/icon - Upload an icon image for a model series
  .post('/:id/icon',
    async (ctx) => { 
        try {
          const numericId = parseInt(ctx.params.id, 10);
          if (isNaN(numericId)) {
              ctx.set.status = 400;
              return { error: 'Invalid model series ID format. ID must be a number.' };
          }
          const result = await modelSeriesController.uploadIcon(numericId, ctx.body.file);
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
          console.error("Error in uploadIcon route:", error);
          ctx.set.status = 500;
          return { error: 'Failed to upload model series icon' };
        }
    },
    {
        body: FileUploadSchema,
        detail: {
            summary: 'Upload Model Series Icon',
            description: 'Upload an icon image for a model series',
            tags: ['Model Series']
        }
    }
  )

  // POST /model-series/{id}/image - Upload a main image for a model series
  .post('/:id/image',
    async (ctx) => { 
        try {
          const numericId = parseInt(ctx.params.id, 10);
          if (isNaN(numericId)) {
              ctx.set.status = 400;
              return { error: 'Invalid model series ID format. ID must be a number.' };
          }
          const result = await modelSeriesController.uploadImage(numericId, ctx.body.file);
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
          return { error: 'Failed to upload model series image' };
        }
    },
    {
        body: FileUploadSchema,
        detail: {
            summary: 'Upload Model Series Image',
            description: 'Upload a main image for a model series',
            tags: ['Model Series']
        }
    }
  )

  // --- Translation Routes ---

  // GET /model-series/{id}/translations - Retrieve all translations for a model series
  .get('/:id/translations', async (ctx) => {
    try {
      const seriesId = Number(ctx.params.id);
      if (isNaN(seriesId)) {
        ctx.set.status = 400;
        return { error: 'Invalid model series ID format. ID must be a number.' };
      }
      const result = await modelSeriesController.getAllTranslations(seriesId);
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
      return { error: 'Failed to retrieve model series translations' };
    }
  }, {
    detail: {
        summary: 'Get All Translations for a Model Series',
        tags: ['Model Series', 'Translations']
    },
    params: t.Object({ id: t.Numeric() })
  })

  // GET /model-series/{id}/translations/{languageId} - Retrieve a specific translation
  .get('/:id/translations/:languageId', async (ctx) => {
    try {
      const seriesId = Number(ctx.params.id);
      const languageId = Number(ctx.params.languageId);
      if (isNaN(seriesId) || isNaN(languageId)) {
        ctx.set.status = 400;
        return { error: 'Invalid ID format. IDs must be numbers.' };
      }
      const result = await modelSeriesController.getTranslation(seriesId, languageId);
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
      return { error: 'Failed to retrieve model series translation' };
    }
  }, {
    detail: {
        summary: 'Get a Specific Translation for a Model Series',
        tags: ['Model Series', 'Translations']
    },
    params: t.Object({ 
        id: t.Numeric(),
        languageId: t.Numeric()
    })
  })

  // POST /model-series/{id}/translations - Create a new translation for a model series
  .post('/:id/translations', async (ctx) => {
    try {
      const seriesId = Number(ctx.params.id);
      if (isNaN(seriesId)) {
        ctx.set.status = 400;
        return { error: 'Invalid model series ID format. ID must be a number.' };
      }
      const translationData = ctx.body as typeof ModelSeriesTranslationCreateSingleSchema._type;
      const result = await modelSeriesController.createTranslation(seriesId, translationData);
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
        return { error: 'Translation for this model series and language already exists.' };
      }
      console.error("Error in createTranslation route:", error);
      ctx.set.status = 500;
      return { error: 'Failed to create model series translation' };
    }
  }, {
    body: ModelSeriesTranslationCreateSingleSchema,
    detail: {
        summary: 'Create a Translation for a Model Series',
        tags: ['Model Series', 'Translations']
    },
    params: t.Object({ id: t.Numeric() })
  })

  // PUT /model-series/{id}/translations/{languageId} - Update a specific translation
  .put('/:id/translations/:languageId', async (ctx) => {
    try {
      const seriesId = Number(ctx.params.id);
      const languageId = Number(ctx.params.languageId);
      if (isNaN(seriesId) || isNaN(languageId)) {
        ctx.set.status = 400;
        return { error: 'Invalid ID format. IDs must be numbers.' };
      }
      const updateData = ctx.body as typeof ModelSeriesTranslationUpdateSingleSchema._type;
      const result = await modelSeriesController.updateTranslation(seriesId, languageId, updateData);
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
      return { error: 'Failed to update model series translation' };
    }
  }, {
    body: ModelSeriesTranslationUpdateSingleSchema,
    detail: {
        summary: 'Update a Specific Translation for a Model Series',
        tags: ['Model Series', 'Translations']
    },
    params: t.Object({ 
        id: t.Numeric(),
        languageId: t.Numeric()
    })
  })

  // DELETE /model-series/{id}/translations/{languageId} - Delete a specific translation
  .delete('/:id/translations/:languageId', async (ctx) => {
    try {
      const seriesId = Number(ctx.params.id);
      const languageId = Number(ctx.params.languageId);
      if (isNaN(seriesId) || isNaN(languageId)) {
        ctx.set.status = 400;
        return { error: 'Invalid ID format. IDs must be numbers.' };
      }
      await modelSeriesController.deleteTranslation(seriesId, languageId);
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
      return { error: 'Failed to delete model series translation' };
    }
  }, {
    detail: {
        summary: 'Delete a Specific Translation for a Model Series',
        tags: ['Model Series', 'Translations']
    },
    params: t.Object({ 
        id: t.Numeric(),
        languageId: t.Numeric()
    })
  })

  // PUT /model-series/{id}/translations/{languageId}/upsert - Upsert (create or update) a specific translation
  .put('/:id/translations/:languageId/upsert', async (ctx) => {
    try {
      const seriesId = Number(ctx.params.id);
      const languageId = Number(ctx.params.languageId);
      if (isNaN(seriesId) || isNaN(languageId)) {
        ctx.set.status = 400;
        return { error: 'Invalid ID format. IDs must be numbers.' };
      }
      const translationData = ctx.body as typeof ModelSeriesTranslationCreateSingleSchema._type;
      const result = await modelSeriesController.upsertTranslation(seriesId, languageId, translationData);
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
      return { error: 'Failed to save model series translation' };
    }
  }, {
    body: ModelSeriesTranslationCreateSingleSchema,
    detail: {
        summary: 'Upsert a Translation for a Model Series',
        description: 'Create or update a translation for a model series',
        tags: ['Model Series', 'Translations']
    },
    params: t.Object({ 
        id: t.Numeric(),
        languageId: t.Numeric()
    })
  })

  // POST /model-series/{id}/translations/bulk-upsert - Bulk upsert translations
  .post('/:id/translations/bulk-upsert', async (ctx) => {
    try {
      const seriesId = Number(ctx.params.id);
      if (isNaN(seriesId)) {
        ctx.set.status = 400;
        return { error: 'Invalid model series ID format. ID must be a number.' };
      }
      const { translations } = ctx.body as { translations: Array<{ language_id: number; title: string; description?: string; meta_title?: string; meta_description?: string; meta_keywords?: string; }> };
      const result = await modelSeriesController.bulkUpsertTranslations(seriesId, translations);
      return result;
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        ctx.set.status = error instanceof BadRequestError ? 400 : 404;
        return { error: error.message };
      }
      console.error("Error in bulkUpsertTranslations route:", error);
      ctx.set.status = 500;
      return { error: 'Failed to bulk upsert model series translations' };
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
        })
      )
    }),
    detail: {
      summary: 'Bulk upsert model series translations',
      description: 'Create or update multiple translations for a model series in a single request',
      tags: ['Model Series', 'Translations']
    },
    params: t.Object({ id: t.Numeric() })
  })

  // POST /model-series/{id}/translations/bulk - Bulk upsert translations
  .post('/:id/translations/bulk', async (ctx) => {
    try {
      const seriesId = Number(ctx.params.id);
      if (isNaN(seriesId)) {
        ctx.set.status = 400;
        return { error: 'Invalid model series ID format. ID must be a number.' };
      }
      const { translations } = ctx.body as { translations: Array<{ language_id: number; title: string; description?: string; meta_title?: string; meta_description?: string; meta_keywords?: string; }> };
      const result = await modelSeriesController.bulkUpsertTranslations(seriesId, translations);
      return result;
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        ctx.set.status = error instanceof BadRequestError ? 400 : 404;
        return { error: error.message };
      }
      console.error("Error in bulkUpsertTranslations route:", error);
      ctx.set.status = 500;
      return { error: 'Failed to bulk upsert model series translations' };
    }
  })
