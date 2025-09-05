import { Elysia, t } from "elysia";
import { faqController } from "../controllers/faqController";
import { 
  FAQCreateSchema,
  FAQUpdateSchema,
  FAQWithTranslationsCreateSchema,
  FAQWithTranslationsUpdateSchema,
  FAQTranslationCreateSchema,
  FAQTranslationUpdateSchema,
  FAQIdParamSchema,
  FAQPaginationQuerySchema
} from "../types/faqTypes";
import { authMiddleware, type JwtUser } from '@/middleware/auth';

// Create and export the FAQ routes
export const faqRoutes = new Elysia({ prefix: '/faqs' })
  .use(authMiddleware.isAuthenticated) // Add centralized authentication middleware
  // GET all FAQs with pagination, filtering and sorting
  .get('/', 
    async ({ query }) => {
      const { page, limit, orderBy, order, shop_id, client_id, is_published, search } = query;
      
      return await faqController.getAllFAQs(page, limit, orderBy, order, shop_id, client_id, is_published, search);
    }, {
      query: FAQPaginationQuerySchema,
      detail: {
        summary: 'Get all FAQs',
        description: 'Retrieve a paginated list of FAQs with optional filtering by shop, client, publication status, and search',
        tags: ['FAQs']
      }
    }
  )
  
  // GET FAQ by ID
  .get('/:faqId', 
    async ({ params }) => {
      return await faqController.getFAQById(params.faqId);
    }, {
      params: FAQIdParamSchema,
      detail: {
        summary: 'Get FAQ by ID',
        description: 'Retrieve a single FAQ by its ID including translations',
        tags: ['FAQs']
      }
    }
  )
  
  // POST create new FAQ
  .post('/', 
    async ({ body, set, user }) => {
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      return await faqController.createFAQ(body, user, { set } as any);
    }, {
      body: FAQCreateSchema,
      detail: {
        summary: 'Create a new FAQ',
        description: 'Create a new FAQ for a specific shop',
        tags: ['FAQs']
      }
    }
  )
  
  // PUT update FAQ
  .put('/:faqId', 
    async ({ params, body, set }) => {
      const faqId = Number(params.faqId);
      if (isNaN(faqId)) {
        set.status = 400;
        return { error: 'Invalid FAQ ID format. ID must be a number.' };
      }
      return await faqController.updateFAQ(faqId, body, { set } as any);
    }, {
      params: FAQIdParamSchema,
      body: FAQUpdateSchema,
      detail: {
        summary: 'Update FAQ',
        description: 'Update an existing FAQ by its ID',
        tags: ['FAQs']
      }
    }
  )
  
  // DELETE FAQ
  .delete('/:faqId', 
    async ({ params, set }) => {
      const faqId = Number(params.faqId);
      if (isNaN(faqId)) {
        set.status = 400;
        return { error: 'Invalid FAQ ID format. ID must be a number.' };
      }
      return await faqController.deleteFAQ(faqId, { set } as any);
    }, {
      params: FAQIdParamSchema,
      detail: {
        summary: 'Delete FAQ',
        description: 'Delete a FAQ by its ID along with all its translations',
        tags: ['FAQs']
      }
    }
  )
  
  // POST create FAQ with translations
  .post('/with-translations', 
    async ({ body, user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      return await faqController.createFAQWithTranslations(body, user, { set } as any);
    }, {
      body: FAQWithTranslationsCreateSchema,
      detail: {
        summary: 'Create FAQ with translations',
        description: 'Create a new FAQ with multiple translations in one request',
        tags: ['FAQs']
      }
    }
  )
  
  // PUT update FAQ with translations
  .put('/:faqId/with-translations', 
    async ({ params, body }) => {
      return await faqController.updateFAQWithTranslations(params.faqId, body);
    }, {
      params: FAQIdParamSchema,
      body: FAQWithTranslationsUpdateSchema,
      detail: {
        summary: 'Update FAQ with translations',
        description: 'Update an existing FAQ and its translations in one request',
        tags: ['FAQs']
      }
    }
  )
  
  // PATCH update FAQ order
  .patch('/:faqId/order', 
    async ({ params, body, set }) => {
      const faqId = Number(params.faqId);
      if (isNaN(faqId)) {
        set.status = 400;
        return { error: 'Invalid FAQ ID format. ID must be a number.' };
      }
      return await faqController.updateFAQOrder(faqId, body.order, { set } as any);
    }, {
      params: FAQIdParamSchema,
      body: t.Object({
        order: t.Number({ minimum: 0 })
      }),
      detail: {
        summary: 'Update FAQ order',
        description: 'Update the display order of a FAQ',
        tags: ['FAQs']
      }
    }
  )
  
  // FAQ Translation endpoints
  
  // GET translations by FAQ
  .get('/:faqId/translations', 
    async ({ params }) => {
      return await faqController.getFAQTranslations(params.faqId);
    }, {
      params: FAQIdParamSchema,
      detail: {
        summary: 'Get FAQ translations',
        description: 'Retrieve all translations for a specific FAQ',
        tags: ['FAQ Translations']
      }
    }
  )
  
  // POST create translation
  .post('/:faqId/translations/:languageId', 
    async ({ params, body }) => {
      return await faqController.createFAQTranslation(params.faqId, params.languageId, body);
    }, {
      params: t.Object({ 
        faqId: t.Numeric({ minimum: 1 }),
        languageId: t.Numeric({ minimum: 1 })
      }),
      body: FAQTranslationCreateSchema,
      detail: {
        summary: 'Create FAQ translation',
        description: 'Create a new translation for a FAQ',
        tags: ['FAQ Translations']
      }
    }
  )
  
  // PUT update translation
  .put('/:faqId/translations/:languageId', 
    async ({ params, body }) => {
      return await faqController.updateFAQTranslation(params.faqId, params.languageId, body);
    }, {
      params: t.Object({ 
        faqId: t.Numeric({ minimum: 1 }),
        languageId: t.Numeric({ minimum: 1 })
      }),
      body: FAQTranslationUpdateSchema,
      detail: {
        summary: 'Update FAQ translation',
        description: 'Update an existing translation for a FAQ',
        tags: ['FAQ Translations']
      }
    }
  )
  
  // DELETE translation
  .delete('/:faqId/translations/:languageId', 
    async ({ params }) => {
      return await faqController.deleteFAQTranslation(params.faqId, params.languageId);
    }, {
      params: t.Object({ 
        faqId: t.Numeric({ minimum: 1 }),
        languageId: t.Numeric({ minimum: 1 })
      }),
      detail: {
        summary: 'Delete FAQ translation',
        description: 'Delete a specific translation for a FAQ',
        tags: ['FAQ Translations']
      }
    }
  )

  // PUT upsert translation
  .put('/:faqId/translations/:languageId/upsert', 
    async ({ params, body }) => {
      return await faqController.upsertFAQTranslation(params.faqId, params.languageId, body);
    }, {
      params: t.Object({ 
        faqId: t.Numeric({ minimum: 1 }),
        languageId: t.Numeric({ minimum: 1 })
      }),
      body: FAQTranslationCreateSchema,
      detail: {
        summary: 'Upsert FAQ translation',
        description: 'Create a new translation or update an existing one for a FAQ',
        tags: ['FAQ Translations']
      }
    }
  );

// Shop-specific FAQ routes
export const shopFAQRoutes = new Elysia({ prefix: '/shops' })
  .use(authMiddleware.isAuthenticated) // Add centralized authentication middleware
  // GET FAQs by shop ID
  .get('/:shopId/faqs', 
    async ({ params, query }) => {
      const isPublished = query.published !== undefined ? query.published : undefined;
      return await faqController.getFAQsByShopId(params.shopId, isPublished);
    }, {
      params: t.Object({
        shopId: t.Numeric({ minimum: 1 })
      }),
      query: t.Object({
        published: t.Optional(t.Boolean())
      }),
      detail: {
        summary: 'Get FAQs by shop',
        description: 'Retrieve all FAQs for a specific shop with optional filtering by publication status',
        tags: ['Shop FAQs']
      }
    }
  ); 