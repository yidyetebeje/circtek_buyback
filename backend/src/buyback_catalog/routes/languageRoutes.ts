import { Elysia } from 'elysia';
import { languageController } from '../controllers/languageController';
import {
  LanguageCreateSchema,
  LanguageUpdateSchema,
  LanguageIdParamSchema
} from '../types/languageTypes';
import { t } from 'elysia';
import { requireRole } from '../../auth';

// Define the pagination and sorting query parameters schema
const PaginationQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  orderBy: t.Optional(t.String({ default: 'id' })),
  order: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')], { default: 'asc' }))
});

// Create and export the language routes
export const languageRoutes = new Elysia({ prefix: '/languages' })
   // Add centralized authentication middleware
  // GET all languages
  .get('/', 
    async ({ query }) => {
      const { page, limit, orderBy, order } = query;
      return await languageController.getAllLanguages(page, limit, orderBy, order);
    }, {
      query: PaginationQuerySchema,
      detail: {
        summary: 'Get all languages',
        description: 'Retrieve a paginated list of all languages',
        tags: ['Languages']
      }
    }
  )
  
  // GET language by ID
  .get('/:id', 
    async ({ params }) => {
      return await languageController.getLanguageById(params.id);
    }, {
      params: LanguageIdParamSchema,
      detail: {
        summary: 'Get language by ID',
        description: 'Retrieve a single language by its ID',
        tags: ['Languages']
      }
    }
  )
  
  // POST create new language
  .post('/', 
    async ({ body }) => {
      return await languageController.createLanguage(body);
    }, {
      body: LanguageCreateSchema,
      detail: {
        summary: 'Create a new language',
        description: 'Create a new language in the system',
        tags: ['Languages']
      }
    }
  )
  
  // PUT update language
  .put('/:id', 
    async ({ params, body }) => {
      return await languageController.updateLanguage(params.id, body);
    }, {
      params: LanguageIdParamSchema,
      body: LanguageUpdateSchema,
      detail: {
        summary: 'Update language',
        description: 'Update an existing language by its ID',
        tags: ['Languages']
      }
    }
  )
  
  // DELETE language
  .delete('/:id', 
    async ({ params }) => {
      return await languageController.deleteLanguage(params.id);
    }, {
      params: LanguageIdParamSchema,
      detail: {
        summary: 'Delete language',
        description: 'Delete a language by its ID',
        tags: ['Languages']
      }
    }
  )
  
  // PUT set default language
  .put('/:id/set-default', 
    async ({ params }) => {
      return await languageController.setDefaultLanguage(params.id);
    }, {
      params: LanguageIdParamSchema,
      detail: {
        summary: 'Set default language',
        description: 'Set a language as the default language for the system',
        tags: ['Languages']
      }
    }
  );
