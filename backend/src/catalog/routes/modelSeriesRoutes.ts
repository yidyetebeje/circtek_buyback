import Elysia, { t, type Context } from 'elysia'; 
import { modelSeriesController } from '../controllers/modelSeriesController';
import { ModelSeriesCreateSchema, ModelSeriesUpdateSchema, FileUploadSchema, ModelSeriesTranslationCreateSingleSchema, ModelSeriesTranslationUpdateSingleSchema } from '../types/modelSeriesTypes'; 
import { authMiddleware, type JwtUser } from '@/middleware/auth';
import { getClientId } from '../utils/getId';

export const modelSeriesRoutes = new Elysia({ prefix: '/model-series' })
  .use(authMiddleware.isAuthenticated) // Add centralized authentication middleware
  // GET /model-series - Retrieve all model series with pagination/sorting/filtering
  .get('/', modelSeriesController.getAll, {
    query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, default: 20 })),
        orderBy: t.Optional(t.String({ default: 'order_no' })),
        order: t.Optional(t.Enum({ asc: 'asc', desc: 'desc' }, { default: 'asc' })),
        clientId: t.Optional(t.Numeric()),
        q: t.Optional(t.String()),
    }),
    detail: {
        summary: "Get List of Model Series",
        tags: ['Model Series']
    }
  })

  // POST /model-series - Create a new model series
  .post('/', (ctx) => {
    // Get clientId from authenticated user
    const data = { ...ctx.body };
    if (ctx.user) {
      // Ensure client_id is a number as required by the schema
      const clientId = getClientId(ctx.user);
      if (clientId !== undefined) {
        data.client_id = clientId;
      } else {
        ctx.set.status = 400;
        return { error: 'Client ID could not be determined from user information' };
      }
    } else {
      ctx.set.status = 401;
      return { error: 'User must be authenticated to create a model series' };
    }
    return modelSeriesController.create(data, ctx);
  }, {
    body: ModelSeriesCreateSchema, 
    detail: { 
        summary: 'Create a new Model Series', 
        tags: ['Model Series'] 
    }
  })

  // GET /model-series/{id} - Retrieve a specific model series by ID
  .get('/:id',
    (ctx) => { 
        const numericId = parseInt(ctx.params.id, 10);
        if (isNaN(numericId)) {
            ctx.set.status = 400; // Bad Request
            return { error: 'Invalid model series ID format. ID must be a number.' };
        }
        return modelSeriesController.getById(numericId, ctx);
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
    (ctx) => { 
        const numericId = parseInt(ctx.params.id, 10);
        if (isNaN(numericId)) {
            ctx.set.status = 400;
            return { error: 'Invalid model series ID format. ID must be a number.' };
        }
        return modelSeriesController.update(numericId, ctx.body, ctx);
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
    (ctx) => { 
        const numericId = parseInt(ctx.params.id, 10);
        if (isNaN(numericId)) {
            ctx.set.status = 400;
            return { error: 'Invalid model series ID format. ID must be a number.' };
        }
        return modelSeriesController.delete(numericId, ctx);
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
    (ctx) => { 
        const numericId = parseInt(ctx.params.id, 10);
        if (isNaN(numericId)) {
            ctx.set.status = 400;
            return { error: 'Invalid model series ID format. ID must be a number.' };
        }
        return modelSeriesController.uploadIcon(numericId, ctx.body.file, ctx);
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
    (ctx) => { 
        const numericId = parseInt(ctx.params.id, 10);
        if (isNaN(numericId)) {
            ctx.set.status = 400;
            return { error: 'Invalid model series ID format. ID must be a number.' };
        }
        return modelSeriesController.uploadImage(numericId, ctx.body.file, ctx);
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
  .get('/:id/translations', modelSeriesController.getAllTranslations, {
    detail: {
        summary: 'Get All Translations for a Model Series',
        tags: ['Model Series', 'Translations']
    },
    params: t.Object({ id: t.Numeric() })
  })

  // GET /model-series/{id}/translations/{languageId} - Retrieve a specific translation
  .get('/:id/translations/:languageId', modelSeriesController.getTranslation, {
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
  .post('/:id/translations', modelSeriesController.createTranslation, {
    body: ModelSeriesTranslationCreateSingleSchema,
    detail: {
        summary: 'Create a Translation for a Model Series',
        tags: ['Model Series', 'Translations']
    },
    params: t.Object({ id: t.Numeric() })
  })

  // PUT /model-series/{id}/translations/{languageId} - Update a specific translation
  .put('/:id/translations/:languageId', modelSeriesController.updateTranslation, {
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
  .delete('/:id/translations/:languageId', modelSeriesController.deleteTranslation, {
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
  .put('/:id/translations/:languageId/upsert', modelSeriesController.upsertTranslation, {
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
  .post('/:id/translations/bulk-upsert', modelSeriesController.bulkUpsertTranslations, {
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
  .post('/:id/translations/bulk', modelSeriesController.bulkUpsertTranslations)
