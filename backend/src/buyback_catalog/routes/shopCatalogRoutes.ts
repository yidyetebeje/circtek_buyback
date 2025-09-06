import Elysia, { t } from 'elysia';
import { shopCatalogController } from '../controllers/shopCatalogController';
import { 
  SingleEntityPublishSchema, 
  BulkPublishSchema, 
  ShopCatalogStatusQuerySchema,
  ShopModelPriceUpdateSchema,
  BulkPriceUpdateSchema,
  MultipleShopsEntityPublishSchema,
  BulkPublishToMultipleShopsSchema
} from '../types/shopCatalogTypes';
import { requireRole } from '../../auth';

export const shopCatalogRoutes = new Elysia({ prefix: '/shop-catalog' })
  .use(requireRole([])) // Add centralized authentication middleware
  // BRANDS
  .get('/brands/status', shopCatalogController.getBrandStatus, {
    query: ShopCatalogStatusQuerySchema,
    detail: {
      summary: 'Get Brand Publishing Status',
      description: 'Get the publishing status of a brand for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  .get('/brands/statuses', shopCatalogController.getBrandStatuses, {
    query: ShopCatalogStatusQuerySchema,
    detail: {
      summary: 'Get Multiple Brand Publishing Statuses',
      description: 'Get the publishing statuses of multiple brands for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  .post('/brands/publish', (ctx) => shopCatalogController.publishBrand(ctx.body, ctx), {
    body: SingleEntityPublishSchema,
    detail: {
      summary: 'Publish/Unpublish Brand',
      description: 'Set the publishing status of a brand for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  .post('/brands/bulk-publish', (ctx) => shopCatalogController.bulkPublishBrands(ctx.body, ctx), {
    body: BulkPublishSchema,
    detail: {
      summary: 'Bulk Publish/Unpublish Brands',
      description: 'Set the publishing status of multiple brands for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  // Add new endpoints for multiple shops operations
  .post('/brands/publish-multiple-shops', (ctx) => shopCatalogController.publishBrandToMultipleShops(ctx.body, ctx), {
    body: MultipleShopsEntityPublishSchema,
    detail: {
      summary: 'Publish/Unpublish Brand to Multiple Shops',
      description: 'Set the publishing status of a brand for multiple shops at once',
      tags: ['Shop Catalog']
    }
  })
  
  .post('/brands/bulk-publish-multiple-shops', (ctx) => shopCatalogController.bulkPublishBrandsToMultipleShops(ctx.body, ctx), {
    body: BulkPublishToMultipleShopsSchema,
    detail: {
      summary: 'Bulk Publish/Unpublish Brands to Multiple Shops',
      description: 'Set the publishing status of multiple brands for multiple shops at once',
      tags: ['Shop Catalog']
    }
  })
  
  // CATEGORIES
  .get('/categories/status', shopCatalogController.getCategoryStatus, {
    query: ShopCatalogStatusQuerySchema,
    detail: {
      summary: 'Get Category Publishing Status',
      description: 'Get the publishing status of a category for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  .get('/categories/statuses', shopCatalogController.getCategoryStatuses, {
    query: ShopCatalogStatusQuerySchema,
    detail: {
      summary: 'Get Multiple Category Publishing Statuses',
      description: 'Get the publishing statuses of multiple categories for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  .post('/categories/publish', (ctx) => shopCatalogController.publishCategory(ctx.body, ctx), {
    body: SingleEntityPublishSchema,
    detail: {
      summary: 'Publish/Unpublish Category',
      description: 'Set the publishing status of a category for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  .post('/categories/bulk-publish', (ctx) => shopCatalogController.bulkPublishCategories(ctx.body, ctx), {
    body: BulkPublishSchema,
    detail: {
      summary: 'Bulk Publish/Unpublish Categories',
      description: 'Set the publishing status of multiple categories for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  // Add new endpoints for multiple shops operations
  .post('/categories/publish-multiple-shops', (ctx) => shopCatalogController.publishCategoryToMultipleShops(ctx.body, ctx), {
    body: MultipleShopsEntityPublishSchema,
    detail: {
      summary: 'Publish/Unpublish Category to Multiple Shops',
      description: 'Set the publishing status of a category for multiple shops at once',
      tags: ['Shop Catalog']
    }
  })
  
  .post('/categories/bulk-publish-multiple-shops', (ctx) => shopCatalogController.bulkPublishCategoriesToMultipleShops(ctx.body, ctx), {
    body: BulkPublishToMultipleShopsSchema,
    detail: {
      summary: 'Bulk Publish/Unpublish Categories to Multiple Shops',
      description: 'Set the publishing status of multiple categories for multiple shops at once',
      tags: ['Shop Catalog']
    }
  })
  
  // MODEL SERIES
  .get('/model-series/status', shopCatalogController.getModelSeriesStatus, {
    query: ShopCatalogStatusQuerySchema,
    detail: {
      summary: 'Get Model Series Publishing Status',
      description: 'Get the publishing status of a model series for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  .get('/model-series/statuses', shopCatalogController.getModelSeriesStatuses, {
    query: ShopCatalogStatusQuerySchema,
    detail: {
      summary: 'Get Multiple Model Series Publishing Statuses',
      description: 'Get the publishing statuses of multiple model series for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  .post('/model-series/publish', (ctx) => shopCatalogController.publishModelSeries(ctx.body, ctx), {
    body: SingleEntityPublishSchema,
    detail: {
      summary: 'Publish/Unpublish Model Series',
      description: 'Set the publishing status of a model series for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  // Add new endpoints for multiple shops operations
  .post('/model-series/publish-multiple-shops', (ctx) => shopCatalogController.publishModelSeriesToMultipleShops(ctx.body, ctx), {
    body: MultipleShopsEntityPublishSchema,
    detail: {
      summary: 'Publish/Unpublish Model Series to Multiple Shops',
      description: 'Set the publishing status of a model series for multiple shops at once',
      tags: ['Shop Catalog']
    }
  })
  
  .post('/model-series/bulk-publish', (ctx) => shopCatalogController.bulkPublishModelSeries(ctx.body, ctx), {
    body: BulkPublishSchema,
    detail: {
      summary: 'Bulk Publish/Unpublish Model Series',
      description: 'Set the publishing status of multiple model series for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  .post('/model-series/bulk-publish-multiple-shops', (ctx) => shopCatalogController.bulkPublishModelSeriesToMultipleShops(ctx.body, ctx), {
    body: BulkPublishToMultipleShopsSchema,
    detail: {
      summary: 'Bulk Publish/Unpublish Model Series to Multiple Shops',
      description: 'Set the publishing status of multiple model series for multiple shops at once',
      tags: ['Shop Catalog']
    }
  })
  
  // MODELS
  .get('/models/status', shopCatalogController.getModelStatus, {
    query: ShopCatalogStatusQuerySchema,
    detail: {
      summary: 'Get Model Publishing Status',
      description: 'Get the publishing status of a model for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  .get('/models/statuses', shopCatalogController.getModelStatuses, {
    query: ShopCatalogStatusQuerySchema,
    detail: {
      summary: 'Get Multiple Model Publishing Statuses',
      description: 'Get the publishing statuses of multiple models for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  .post('/models/publish', (ctx) => shopCatalogController.publishModel(ctx.body, ctx), {
    body: SingleEntityPublishSchema,
    detail: {
      summary: 'Publish/Unpublish Model',
      description: 'Set the publishing status of a model for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  // Add new endpoints for multiple shops operations
  .post('/models/publish-multiple-shops', (ctx) => shopCatalogController.publishModelToMultipleShops(ctx.body, ctx), {
    body: MultipleShopsEntityPublishSchema,
    detail: {
      summary: 'Publish/Unpublish Model to Multiple Shops',
      description: 'Set the publishing status of a model for multiple shops at once',
      tags: ['Shop Catalog']
    }
  })
  
  .post('/models/bulk-publish', (ctx) => shopCatalogController.bulkPublishModels(ctx.body, ctx), {
    body: BulkPublishSchema,
    detail: {
      summary: 'Bulk Publish/Unpublish Models',
      description: 'Set the publishing status of multiple models for a specific shop',
      tags: ['Shop Catalog']
    }
  })
  
  .post('/models/bulk-publish-multiple-shops', (ctx) => shopCatalogController.bulkPublishModelsToMultipleShops(ctx.body, ctx), {
    body: BulkPublishToMultipleShopsSchema,
    detail: {
      summary: 'Bulk Publish/Unpublish Models to Multiple Shops',
      description: 'Set the publishing status of multiple models for multiple shops at once',
      tags: ['Shop Catalog']
    }
  })

  // PRICE MANAGEMENT ROUTES
  .put('/models/price', (ctx) => shopCatalogController.updateModelPrice(ctx.body, ctx), {
    body: ShopModelPriceUpdateSchema,
    detail: {
      summary: 'Update Model Price',
      description: 'Update the base price of a specific model for a shop',
      tags: ['Shop Catalog', 'Price Management']
    }
  })

  .put('/models/bulk-price', (ctx) => shopCatalogController.updateBulkModelPrices(ctx.body, ctx), {
    body: BulkPriceUpdateSchema,
    detail: {
      summary: 'Update Multiple Model Prices',
      description: 'Update the base price of multiple models for a shop',
      tags: ['Shop Catalog', 'Price Management']
    }
  }); 