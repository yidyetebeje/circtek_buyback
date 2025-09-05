import Elysia, { t, type Context } from 'elysia'; 
import { modelController } from '../controllers/modelController';
import { ModelCreateSchema, ModelUpdateSchema, FileUploadSchema, ModelTranslationCreateSingleSchema, ModelTranslationUpdateSingleSchema } from '../types/modelTypes';
import { authMiddleware } from '@/middleware/auth'; 
import { getClientId } from '../utils/getId';

export const modelRoutes = new Elysia({ prefix: '/models' })
  // Protect the GET /models route with authentication
  .use(authMiddleware.isAuthenticated) // Added authentication middleware
  .get('/', (ctx) => modelController.getAll(ctx as any), { // Pass context, user will be injected
    query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, default: 20 })),
        orderBy: t.Optional(t.String({ default: 'title' })),
        order: t.Optional(t.Enum({ asc: 'asc', desc: 'desc' }, { default: 'asc' })),
        category_id: t.Optional(t.String()),
        brand_id: t.Optional(t.String()),
        series_id: t.Optional(t.String()),
        title: t.Optional(t.String()),
        client_id: t.Optional(t.Numeric())
    }),
    detail: {
        summary: "Get List of Models",
        description: "Retrieve models with options for pagination, sorting, and filtering by single or multiple category/brand/series IDs (comma-separated).",
        tags: ['Models']
    }
  })
  
  // GET /models/{id} - Retrieve a specific model by ID - public read access
  .get('/:id',
    (ctx) => { 
        const numericId = parseInt(ctx.params.id, 10);
        if (isNaN(numericId)) {
            ctx.set.status = 400; // Bad Request
            return { error: 'Invalid model ID format. ID must be a number.' };
        }
        return modelController.getById(numericId, ctx);
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
    .use(authMiddleware.isAuthenticated)
    
    // POST /models - Create a new model
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
        return { error: 'User must be authenticated to create a model' };
      }
      return modelController.create(data, ctx);
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
      (ctx) => { 
          const numericId = parseInt(ctx.params.id, 10);
          if (isNaN(numericId)) {
              ctx.set.status = 400;
              return { error: 'Invalid model ID format. ID must be a number.' };
          }
          return modelController.update(numericId, ctx.body, ctx);
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
      (ctx) => { 
          const numericId = parseInt(ctx.params.id, 10);
          if (isNaN(numericId)) {
              ctx.set.status = 400;
              return { error: 'Invalid model ID format. ID must be a number.' };
          }
          return modelController.delete(numericId, ctx);
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
      (ctx) => { 
          const numericId = parseInt(ctx.params.id, 10);
          if (isNaN(numericId)) {
              ctx.set.status = 400;
              return { error: 'Invalid model ID format. ID must be a number.' };
          }
          return modelController.uploadImage(numericId, ctx.body.file, ctx);
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
    .get('/:id/translations', modelController.getAllTranslations, {
      detail: {
          summary: 'Get All Translations for a Model',
          tags: ['Models', 'Translations']
      },
      params: t.Object({ id: t.Numeric() })
    })

    // GET /models/{id}/translations/{languageId} - Retrieve a specific translation
    .get('/:id/translations/:languageId', modelController.getTranslation, {
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
    .post('/:id/translations', modelController.createTranslation, {
      body: ModelTranslationCreateSingleSchema,
      detail: {
          summary: 'Create a Translation for a Model',
          tags: ['Models', 'Translations']
      },
      params: t.Object({ id: t.Numeric() })
    })

    // PUT /models/{id}/translations/{languageId} - Update a specific translation
    .put('/:id/translations/:languageId', modelController.updateTranslation, {
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
    .delete('/:id/translations/:languageId', modelController.deleteTranslation, {
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
    .put('/:id/translations/:languageId/upsert', modelController.upsertTranslation, {
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
    .post('/:id/translations/bulk-upsert', modelController.bulkUpsertTranslations, {
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
    .post('/:id/translations/bulk', modelController.bulkUpsertTranslations)
  )

  // GET /models/{id} - Retrieve a specific model by ID
  .get('/:id',
    (ctx) => { 
        const numericId = parseInt(ctx.params.id, 10);
        if (isNaN(numericId)) {
            ctx.set.status = 400; // Bad Request
            return { error: 'Invalid model ID format. ID must be a number.' };
        }
        return modelController.getById(numericId, ctx);
    },
    {
        detail: {
            summary: 'Get Model by ID',
            tags: ['Models']
        }
    }
  )

  // PUT /models/{id} - Update a specific model by ID
  .put('/:id',
    (ctx) => { 
        const numericId = parseInt(ctx.params.id, 10);
        if (isNaN(numericId)) {
            ctx.set.status = 400;
            return { error: 'Invalid model ID format. ID must be a number.' };
        }
        return modelController.update(numericId, ctx.body, ctx);
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
    (ctx) => { 
        const numericId = parseInt(ctx.params.id, 10);
        if (isNaN(numericId)) {
            ctx.set.status = 400;
            return { error: 'Invalid model ID format. ID must be a number.' };
        }
        return modelController.delete(numericId, ctx);
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
    (ctx) => { 
        const numericId = parseInt(ctx.params.id, 10);
        if (isNaN(numericId)) {
            ctx.set.status = 400;
            return { error: 'Invalid model ID format. ID must be a number.' };
        }
        return modelController.uploadImage(numericId, ctx.body.file, ctx);
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
  .get('/:id/translations', modelController.getAllTranslations, {
    detail: {
        summary: 'Get All Translations for a Model',
        tags: ['Models', 'Translations']
    },
    params: t.Object({ id: t.Numeric() })
  })

  // GET /models/{id}/translations/{languageId} - Retrieve a specific translation
  .get('/:id/translations/:languageId', modelController.getTranslation, {
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
  .post('/:id/translations', modelController.createTranslation, {
    body: ModelTranslationCreateSingleSchema,
    detail: {
        summary: 'Create a Translation for a Model',
        tags: ['Models', 'Translations']
    },
    params: t.Object({ id: t.Numeric() })
  })

  // PUT /models/{id}/translations/{languageId} - Update a specific translation
  .put('/:id/translations/:languageId', modelController.updateTranslation, {
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
  .delete('/:id/translations/:languageId', modelController.deleteTranslation, {
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
  .put('/:id/translations/:languageId/upsert', modelController.upsertTranslation, {
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
  });
