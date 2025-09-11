import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { categoryRoutes } from './categoryRoutes';
import { languageRoutes } from './languageRoutes';
import { brandRoutes } from './brandRoutes';
import { modelSeriesRoutes } from './modelSeriesRoutes';
import { modelRoutes } from './modelRoutes';
import { aiTranslationRoutes } from './aiTranslationRoutes';

// Create and export the catalog API with Swagger documentation
export const catalogApi = new Elysia({ prefix: '/catalog' })
  // Add Swagger documentation
  .use(swagger({
    path: '/docs',
    documentation: {
      info: {
        title: 'Catalog API',
        version: '1.0.0',
        description: 'API for managing the catalog module including categories, languages, translations, and AI-powered translation generation'
      },
      tags: [
        { name: 'Categories', description: 'Device category management endpoints' },
        { name: 'Category Translations', description: 'Endpoints for managing category translations' },
        { name: 'Languages', description: 'Language management endpoints' },
        { name: 'Brands', description: 'Brand management endpoints' },
        { name: 'Models', description: 'Device model management endpoints' },
        { name: 'AI Translation', description: 'AI-powered translation generation using Google Gemini' },
        { name: 'Health Check', description: 'Service health and status endpoints' }
      ]
    }
  }))
  // Register the routes
  .use(categoryRoutes)
  .use(languageRoutes)
  .use(brandRoutes)
  .use(modelSeriesRoutes)
  .use(modelRoutes)
  .use(aiTranslationRoutes);
