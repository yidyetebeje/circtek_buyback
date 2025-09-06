import Elysia, { t, type Context } from 'elysia';
import { shopController } from '../controllers/shopController';
import { shopLocationController } from '../controllers/shopLocationController';
import {
  ShopCreateSchema,
  ShopUpdateSchema,
  FileUploadSchema,
  ShopConfigSchema,
  ShopLocationCreateSchema,
  ShopLocationUpdateSchema
} from '../types/shopTypes';
import { shopCatalogRoutes } from './shopCatalogRoutes';
import { brandController } from '../controllers/brandController';
import { categoryController } from '../controllers/categoryController';
import { modelSeriesController } from '../controllers/modelSeriesController';
import { modelController } from '../controllers/modelController';
import { requireRole } from '../../auth';
export const shopRoutes = new Elysia({ prefix: '/shops' });
const publicShopApi = new Elysia()
  .get('/:shopId/published-brands',
    (ctx) => {
      const shopId = parseInt(ctx.params.shopId, 10);
      if (isNaN(shopId)) {
        ctx.set.status = 400;
        return { error: 'Invalid shop ID format. ID must be a number.' };
      }
      
      const page = ctx.query.page ? parseInt(String(ctx.query.page), 10) : 1;
      const limit = ctx.query.limit ? parseInt(String(ctx.query.limit), 10) : 20;
      const orderBy = String(ctx.query.orderBy || 'title');
      const order = String(ctx.query.order || 'asc') as 'asc' | 'desc';
      const search = ctx.query.search ? String(ctx.query.search) : undefined;
      const tenantId = ctx.query.tenantId ? parseInt(String(ctx.query.tenantId), 10) : undefined;
      
      const simplifiedCtx = { set: ctx.set };
      
      return brandController.getPublishedInShop(shopId, {
        page,
        limit,
        orderBy,
        order,
        search,
        tenantId
      }, simplifiedCtx as Context);
    },
    {
      params: t.Object({ shopId: t.String() }),
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, default: 20 })),
        orderBy: t.Optional(t.String({ default: 'title' })),
        order: t.Optional(t.Enum({ asc: 'asc', desc: 'desc' }, { default: 'asc' })),
        search: t.Optional(t.String()),
        tenantId: t.Optional(t.Numeric())
      }),
      detail: {
        summary: 'Get Published Brands in Shop',
        description: 'Retrieve all brands that are published in a specific shop with pagination and search',
        tags: ['Shop Catalog']
      }
    }
  )
  .get('/:shopId/published-categories',
    (ctx) => {
      const shopId = parseInt(ctx.params.shopId, 10);
      if (isNaN(shopId)) {
        ctx.set.status = 400;
        return { error: 'Invalid shop ID format. ID must be a number.' };
      }
      
      const page = ctx.query.page ? parseInt(String(ctx.query.page), 10) : 1;
      const limit = ctx.query.limit ? parseInt(String(ctx.query.limit), 10) : 20;
      const orderBy = String(ctx.query.orderBy || 'title');
      const order = String(ctx.query.order || 'asc') as 'asc' | 'desc';
      const search = ctx.query.search ? String(ctx.query.search) : undefined;
      const tenantId = ctx.query.tenantId ? parseInt(String(ctx.query.tenantId), 10) : undefined;
      
      const simplifiedCtx = { set: ctx.set };
      
      return categoryController.getPublishedInShop(shopId, {
        page,
        limit,
        orderBy,
        order,
        search,
        tenantId
      }, simplifiedCtx as Context);
    },
    {
      params: t.Object({ shopId: t.String() }),
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, default: 20 })),
        orderBy: t.Optional(t.String({ default: 'title' })),
        order: t.Optional(t.Enum({ asc: 'asc', desc: 'desc' }, { default: 'asc' })),
        search: t.Optional(t.String()),
        tenantId: t.Optional(t.Numeric())
      }),
      detail: {
        summary: 'Get Published Categories in Shop',
        description: 'Retrieve all categories that are published in a specific shop with pagination and search',
        tags: ['Shop Catalog']
      }
    }
  )
  .get('/:shopId/published-model-series',
    (ctx) => {
      const shopId = parseInt(ctx.params.shopId, 10);
      if (isNaN(shopId)) {
        ctx.set.status = 400;
        return { error: 'Invalid shop ID format. ID must be a number.' };
      }
      
      const page = ctx.query.page ? parseInt(String(ctx.query.page), 10) : 1;
      const limit = ctx.query.limit ? parseInt(String(ctx.query.limit), 10) : 20;
      const orderBy = String(ctx.query.orderBy || 'title');
      const order = String(ctx.query.order || 'asc') as 'asc' | 'desc';
      const search = ctx.query.search ? String(ctx.query.search) : undefined;
      const clientId = ctx.query.clientId ? parseInt(String(ctx.query.clientId), 10) : undefined;
      
      const simplifiedCtx = { set: ctx.set };
      
      return modelSeriesController.getPublishedInShop(shopId, {
        page,
        limit,
        orderBy,
        order,
        search,
        clientId
      }, simplifiedCtx as Context);
    },
    {
      params: t.Object({ shopId: t.String() }),
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, default: 20 })),
        orderBy: t.Optional(t.String({ default: 'title' })),
        order: t.Optional(t.Enum({ asc: 'asc', desc: 'desc' }, { default: 'asc' })),
        search: t.Optional(t.String()),
        clientId: t.Optional(t.Numeric())
      }),
      detail: {
        summary: 'Get Published Model Series in Shop',
        description: 'Retrieve all model series that are published in a specific shop with pagination and search',
        tags: ['Shop Catalog']
      }
    }
  )
  // GET /shops/{shopId}/published-models
  .get('/:shopId/published-models',
    (ctx) => {
      const shopId = parseInt(ctx.params.shopId, 10);
      if (isNaN(shopId)) {
        ctx.set.status = 400;
        return { error: 'Invalid shop ID format. ID must be a number.' };
      }
      
      const page = ctx.query.page ? parseInt(String(ctx.query.page), 10) : 1;
      const limit = ctx.query.limit ? parseInt(String(ctx.query.limit), 10) : 20;
      const orderBy = String(ctx.query.orderBy || 'title');
      const order = String(ctx.query.order || 'asc') as 'asc' | 'desc';
      const search = ctx.query.search ? String(ctx.query.search) : undefined;
      const categoryId = ctx.query.categoryId ? parseInt(String(ctx.query.categoryId), 10) : undefined;
      const brandId = ctx.query.brandId ? parseInt(String(ctx.query.brandId), 10) : undefined;
      const modelSeriesId = ctx.query.modelSeriesId ? parseInt(String(ctx.query.modelSeriesId), 10) : undefined;
      const clientId = ctx.query.clientId ? parseInt(String(ctx.query.clientId), 10) : undefined;
      
      const simplifiedCtx = { set: ctx.set };
      
      return modelController.getPublishedInShop(shopId, {
        page,
        limit,
        orderBy,
        order,
        search,
        categoryId,
        brandId,
        modelSeriesId,
        clientId
      }, simplifiedCtx as Context);
    },
    {
      params: t.Object({ shopId: t.String() }),
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, default: 20 })),
        orderBy: t.Optional(t.String({ default: 'title' })),
        order: t.Optional(t.Enum({ asc: 'asc', desc: 'desc' }, { default: 'asc' })),
        search: t.Optional(t.String()),
        categoryId: t.Optional(t.Numeric()),
        brandId: t.Optional(t.Numeric()),
        modelSeriesId: t.Optional(t.Numeric()),
        clientId: t.Optional(t.Numeric())
      }),
      detail: {
        summary: 'Get Published Models in Shop',
        description: 'Retrieve all models that are published in a specific shop with pagination and search',
        tags: ['Shop Catalog']
      }
    }
  )
  // GET /shops/{shopId}/category/:categorySlug/models
  .get('/:shopId/category/:categorySlug/models',
    async (ctx) => {
      const shopId = parseInt(ctx.params.shopId, 10);
      if (isNaN(shopId)) {
        ctx.set.status = 400;
        return { error: 'Invalid shop ID format. ID must be a number.' };
      }
      
      const categorySlug = ctx.params.categorySlug;
      if (!categorySlug) {
        ctx.set.status = 400;
        return { error: 'Category slug is required.' };
      }
      
      const page = ctx.query.page ? parseInt(String(ctx.query.page), 10) : 1;
      const limit = ctx.query.limit ? parseInt(String(ctx.query.limit), 10) : 20;
      const orderBy = String(ctx.query.orderBy || 'title');
      const order = String(ctx.query.order || 'asc') as 'asc' | 'desc';
      const search = ctx.query.search ? String(ctx.query.search) : undefined;
      const brandId = ctx.query.brandId ? parseInt(String(ctx.query.brandId), 10) : undefined;
      const modelSeriesId = ctx.query.modelSeriesId ? parseInt(String(ctx.query.modelSeriesId), 10) : undefined;
      const clientId = ctx.query.clientId ? parseInt(String(ctx.query.clientId), 10) : undefined;
      
      const simplifiedCtx = { set: ctx.set };
      
      return modelController.getPublishedInShopByCategory(shopId, categorySlug, {
        page,
        limit,
        orderBy,
        order,
        search,
        brandId,
        modelSeriesId,
        clientId
      }, simplifiedCtx as Context);
    },
    {
      params: t.Object({ 
        shopId: t.String(),
        categorySlug: t.String()
      }),
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, default: 20 })),
        orderBy: t.Optional(t.String({ default: 'title' })),
        order: t.Optional(t.Enum({ asc: 'asc', desc: 'desc' }, { default: 'asc' })),
        search: t.Optional(t.String()),
        brandId: t.Optional(t.Numeric()),
        modelSeriesId: t.Optional(t.Numeric()),
        clientId: t.Optional(t.Numeric())
      }),
      detail: {
        summary: 'Get Published Models by Category Slug in Shop',
        description: 'Retrieve all models that are published in a specific shop and belong to a category specified by its slug',
        tags: ['Shop Catalog']
      }
    }
  )
  // GET /shops/{shopId}/model/:sef_url
  .get('/:shopId/model/:sef_url',
    async (ctx) => {
      const shopId = parseInt(ctx.params.shopId, 10);
      if (isNaN(shopId)) {
        ctx.set.status = 400;
        return { error: 'Invalid shop ID format. ID must be a number.' };
      }
      
      const modelSefUrl = ctx.params.sef_url;
      if (!modelSefUrl) {
        ctx.set.status = 400;
        return { error: 'Model SEF URL is required.' };
      }
      
      const simplifiedCtx = { set: ctx.set };
      
      return modelController.getPublishedModelInShopBySlug(shopId, modelSefUrl, simplifiedCtx as Context);
    },
    {
      params: t.Object({ 
        shopId: t.String(),
        sef_url: t.String()
      }),
      detail: {
        summary: 'Get Published Model by SEF URL in Shop',
        description: 'Retrieve a specific model by its SEF URL that is published in a shop, including assigned question sets',
        tags: ['Shop Catalog']
      }
    }
  )
  .get('/:shopId', 
    async ({ params, query, ...ctx }) => { 
      console.log("here I am comming")
        const numericId = parseInt(params.shopId, 10);
        if (isNaN(numericId)) {
            ctx.set.status = 400; 
            return { error: 'Invalid shop ID format. ID must be a number.' };
        }
        return shopController.getById(numericId, { ...ctx, params, query });
    },
    {
        params: t.Object({ shopId: t.String() }),
        detail: {
            summary: 'Get Shop by ID',
            tags: ['Shops']
        }
    }
  )
  .get('/locations/nearby',
    async ({ query, ...ctx }) => { // Removed 'user' from destructuring for clarity
      const params = {
        latitude: parseFloat(String(query.latitude)),
        longitude: parseFloat(String(query.longitude)),
        radius: query.radius ? parseFloat(String(query.radius)) : 10, // Default 10km
        limit: query.limit ? parseInt(String(query.limit), 10) : 10, // Default 10 results
        shopId: query.shopId ? parseInt(String(query.shopId), 10) : undefined
      };
      
      if (isNaN(params.latitude) || isNaN(params.longitude)) {
        ctx.set.status = 400;
        return { error: 'Invalid coordinates. Latitude and longitude must be valid numbers.' };
      }
      
      // Pass context to controller; 'user' property will be undefined if accessed within controller from this context
      return shopLocationController.findNearby(params, { 
        ...ctx, 
        query: query as unknown as Record<string, string>, 
        user: null // Explicitly pass undefined or ensure controller handles its absence
      });
    },
    {
      query: t.Object({
        latitude: t.Numeric({ error: 'Latitude must be a number between -90 and 90' }),
        longitude: t.Numeric({ error: 'Longitude must be a number between -180 and 180' }),
        radius: t.Optional(t.Numeric({ default: 10 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50, default: 10 })),
        shopId: t.Optional(t.Numeric())
      }),
      detail: {
        summary: 'Find Nearby Shop Locations',
        description: 'Find shop locations within a specified radius of coordinates',
        tags: ['Shop Locations']
      }
    }
  )
  .get('/:shopId/config',
    async ({ params, ...ctx }) => {
        const numericId = parseInt(params.shopId, 10);
        if (isNaN(numericId)) {
            ctx.set.status = 400;
            return { error: 'Invalid shop ID format. ID must be a number.' };
        }
        return shopController.getShopConfig(numericId, { ...ctx, params, user: null });
    },
    {
        params: t.Object({ shopId: t.String() }),
        detail: {
            summary: 'Get Shop Configuration by ID',
            description: 'Retrieve the configuration for a specific shop by its ID.',
            tags: ['Shops']
        }
    }
  )
  .group('/catalog', app => app.use(shopCatalogRoutes));

const authenticatedShopApi = new Elysia()
  .use(requireRole([]))
  .onError(({ error, code, set }) => {
    // Handle validation errors specifically
    if (code === 'VALIDATION') {
      set.status = 400;
      
      // Parse validation error to provide specific field information
      const errorMessage = (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') 
        ? error.message 
        : 'Validation failed';
      
      // Try to extract field information from error message
      if (errorMessage.includes('Expected string')) {
        // Find which field caused the issue by parsing the error path
        const pathMatch = errorMessage.match(/\/(\w+)/);
        const fieldName = pathMatch ? pathMatch[1] : 'unknown field';
        
        return {
          error: `Invalid input for ${fieldName}: Expected a valid string value`,
          field: fieldName,
          type: 'ValidationError',
          timestamp: new Date().toISOString(),
          details: errorMessage
        };
      }
      
      if (errorMessage.includes('Expected number')) {
        const pathMatch = errorMessage.match(/\/(\w+)/);
        const fieldName = pathMatch ? pathMatch[1] : 'unknown field';
        
        return {
          error: `Invalid input for ${fieldName}: Expected a valid number`,
          field: fieldName,
          type: 'ValidationError',
          timestamp: new Date().toISOString(),
          details: errorMessage
        };
      }
      
      if (errorMessage.includes('Expected boolean')) {
        const pathMatch = errorMessage.match(/\/(\w+)/);
        const fieldName = pathMatch ? pathMatch[1] : 'unknown field';
        
        return {
          error: `Invalid input for ${fieldName}: Expected true or false`,
          field: fieldName,
          type: 'ValidationError',
          timestamp: new Date().toISOString(),
          details: errorMessage
        };
      }
      
      // Generic validation error with more details
      return {
        error: 'Invalid input data. Please check your form and try again.',
        type: 'ValidationError',
        timestamp: new Date().toISOString(),
        details: errorMessage
      };
    }
    
    // Handle other types of errors
    const errorMessage = (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') 
      ? error.message 
      : 'Unknown error';
    console.error('Shop API Error:', { error: errorMessage, code, timestamp: new Date().toISOString() });
    set.status = 500;
    return {
      error: 'An unexpected error occurred. Please try again.',
      type: 'InternalServerError',
      timestamp: new Date().toISOString()
    };
  })

  .get('/', async ({ query, currentTenantId, ...ctx }) => {
    const queryParams = { ...query } as Record<string, any>;
    if (currentTenantId) {
      (queryParams as any).tenant_id = currentTenantId;
    } else {
      ctx.set.status = 400;
      return { error: 'Tenant ID could not be determined from user information' };
    }
    // For admin users, clientId filtering is optional via query params
    return shopController.getAll({ 
      ...ctx, 
      query: queryParams as Record<string, string>
    } as any);
  }, {
    query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, default: 20 })),
        orderBy: t.Optional(t.String({ default: 'name' })),
        order: t.Optional(t.Enum({ asc: 'asc', desc: 'desc' }, { default: 'asc' })),
        clientId: t.Optional(t.Numeric()),
        ownerId: t.Optional(t.Numeric()),
        active: t.Optional(t.Boolean()),
        search: t.Optional(t.String())
    }),
    detail: {
        summary: "Get List of Shops",
        tags: ['Shops']
    }
  })

  .post('/', (ctx) => {
    try {
      const { body } = ctx as any;
      const { currentUserId, currentTenantId, currentRole, managedShopId } = ctx as any;
      if (!currentUserId || !currentTenantId) {
        (ctx as any).set.status = 401;
        return { error: 'User must be authenticated to create a shop', field: 'authentication' };
      }
      // Trim and clean string fields
      const data = { ...body } as any; // Type assertion to handle validation before type checking
      
      // Trim string fields and reject whitespace-only strings
      if (typeof data.name === 'string') {
        data.name = data.name.trim();
        if (data.name === '') {
          ctx.set.status = 400;
          return { 
            error: 'Shop name cannot be empty or contain only whitespace',
            field: 'name'
          };
        }
      }
      
      if (typeof data.organization === 'string') {
        data.organization = data.organization.trim();
        if (data.organization === '') {
          ctx.set.status = 400;
          return { 
            error: 'Organization name cannot be empty or contain only whitespace',
            field: 'organization'
          };
        }
      } else {
        ctx.set.status = 400;
        return { 
          error: 'Organization name is required',
          field: 'organization'
        };
      }
      
      if (typeof data.phone === 'string') {
        data.phone = data.phone.trim();
        if (data.phone === '') {
          ctx.set.status = 400;
          return { 
            error: 'Phone number cannot be empty or contain only whitespace',
            field: 'phone'
          };
        }
      } else {
        ctx.set.status = 400;
        return { 
          error: 'Phone number is required',
          field: 'phone'
        };
      }
      
      if (typeof data.logo === 'string') {
        data.logo = data.logo.trim();
        if (data.logo === '') {
          data.logo = null; // Convert empty string to null for database storage
        }
      } else if (data.logo === undefined || data.logo === null) {
        data.logo = null; // Ensure consistent null value for database
      }
      
      // Use derived fields from auth middleware
      data.tenant_id = currentTenantId;
      data.owner_id = currentUserId;
      const userForCtx = { id: currentUserId, roleSlug: currentRole, managed_shop_id: managedShopId } as any;
      return shopController.create(data, { ...(ctx as any), body: data, user: userForCtx } as any);
    } catch (error) {
      console.error('Error in shop creation route:', error);
      (ctx as any).set.status = 500;
      return { 
        error: 'An unexpected error occurred while processing the shop creation request',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: ShopCreateSchema, 
    detail: { 
        summary: 'Create a new Shop', 
        tags: ['Shops'] 
    }
  })

  .put('/:shopId',
    async (ctx) => { 
        const { params, body, query } = ctx as any;
        const numericId = parseInt(params.shopId, 10);
        if (isNaN(numericId)) {
            (ctx as any).set.status = 400;
            return { error: 'Invalid shop ID format. ID must be a number.' };
        }
        const userForCtx = { id: (ctx as any).currentUserId, roleSlug: (ctx as any).currentRole, managed_shop_id: (ctx as any).managedShopId } as any;
        return shopController.update(numericId, body, { ...(ctx as any), params, body, query, user: userForCtx } as any);
    },
    {
        params: t.Object({ shopId: t.String() }),
        body: ShopUpdateSchema, 
        detail: {
            summary: 'Update Shop by ID',
            tags: ['Shops']
        }
    }
  )

  .delete('/:shopId',
    async (ctx) => { 
        const { params, query } = ctx as any;
        const numericId = parseInt(params.shopId, 10);
        if (isNaN(numericId)) {
            (ctx as any).set.status = 400;
            return { error: 'Invalid shop ID format. ID must be a number.' };
        }
        const userForCtx = { id: (ctx as any).currentUserId, roleSlug: (ctx as any).currentRole, managed_shop_id: (ctx as any).managedShopId } as any;
        return shopController.delete(numericId, { ...(ctx as any), params, query, user: userForCtx } as any);
    },
    {
        params: t.Object({ shopId: t.String() }),
        detail: {
            summary: 'Delete Shop by ID',
            tags: ['Shops']
        }
    }
  )

  // POST /shops/{shopId}/logo - Logo upload route
  .post('/:shopId/logo',
    async (ctx) => { 
        const { params, body, query } = ctx as any;
        const numericId = parseInt(params.shopId, 10);
        if (isNaN(numericId)) {
            (ctx as any).set.status = 400;
            return { error: 'Invalid shop ID format. ID must be a number.' };
        }
        const userForCtx = { id: (ctx as any).currentUserId, roleSlug: (ctx as any).currentRole, managed_shop_id: (ctx as any).managedShopId } as any;
        return shopController.uploadLogo(numericId, body.file, { ...(ctx as any), params, body, query, user: userForCtx } as any);
    },
    {
        params: t.Object({ shopId: t.String() }),
        body: FileUploadSchema,
        detail: {
            summary: 'Upload Shop Logo',
            description: 'Upload a logo for a specific shop',
            tags: ['Shops']
        }
    }
  )


  

  // PUT /shops/{shopId}/config - Update config for a specific shop
  .put('/:shopId/config',
    async (ctx) => { 
        const { params, body } = ctx as any;
        const numericId = parseInt(params.shopId, 10);
        if (isNaN(numericId)) {
            (ctx as any).set.status = 400;
            return { error: 'Invalid shop ID format. ID must be a number.' };
        }
        const userForCtx = { id: (ctx as any).currentUserId, roleSlug: (ctx as any).currentRole, managed_shop_id: (ctx as any).managedShopId } as any;
        return shopController.updateShopConfig(numericId, body, { ...(ctx as any), params, body, user: userForCtx } as any);
    },
    {
        params: t.Object({ shopId: t.String() }),
        body: ShopConfigSchema,
        detail: {
            summary: 'Update Shop Configuration by ID',
            tags: ['Shops']
        }
    }
  )
  
  // ===== SHOP LOCATIONS ADMIN ROUTES =====
  
  // GET /shops/{shopId}/locations - Get all locations for a shop
  .get('/:shopId/locations',
    async (ctx) => {
      const { params, query } = ctx as any;
      const shopId = parseInt(params.shopId, 10);
      if (isNaN(shopId)) {
        (ctx as any).set.status = 400;
        return { error: 'Invalid shop ID format. ID must be a number.' };
      }
      
      const queryParams = {
        page: query.page ? parseInt(String(query.page), 10) : 1,
        limit: query.limit ? parseInt(String(query.limit), 10) : 20,
        orderBy: String(query.orderBy || 'displayOrder'),
        order: String(query.order || 'asc') as 'asc' | 'desc',
        activeOnly: query.activeOnly === true || String(query.activeOnly) === 'true',
      };
      
      return shopLocationController.getByShopId(shopId, queryParams, { 
        ...(ctx as any), 
        params, 
        query: query as unknown as Record<string, string>, 
        user: { id: (ctx as any).currentUserId, roleSlug: (ctx as any).currentRole, managed_shop_id: (ctx as any).managedShopId } as any
      });
    },
    {
      params: t.Object({ shopId: t.String() }),
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, default: 20 })),
        orderBy: t.Optional(t.String({ default: 'displayOrder' })),
        order: t.Optional(t.Enum({ asc: 'asc', desc: 'desc' }, { default: 'asc' })),
        activeOnly: t.Optional(t.Boolean({ default: false }))
      }),
      detail: {
        summary: 'Get Shop Locations',
        description: 'Retrieve all locations for a specific shop with pagination',
        tags: ['Shop Locations']
      }
    }
  )
  
  // GET /shops/{shopId}/locations/{locationId} - Get a specific location
  .get('/:shopId/locations/:locationId',
    async (ctx) => {
      const { params } = ctx as any;
      const shopId = parseInt(params.shopId, 10);
      const locationId = parseInt(params.locationId, 10);
      
      if (isNaN(shopId) || isNaN(locationId)) {
        (ctx as any).set.status = 400;
        return { error: 'Invalid ID format. IDs must be numbers.' };
      }
      
      return shopLocationController.getById(locationId, { 
        ...(ctx as any), 
        params, 
        query: {} as Record<string, string>,
        user: { id: (ctx as any).currentUserId, roleSlug: (ctx as any).currentRole, managed_shop_id: (ctx as any).managedShopId } as any
      });
    },
    {
      params: t.Object({ 
        shopId: t.String(),
        locationId: t.String() 
      }),
      detail: {
        summary: 'Get Shop Location by ID',
        description: 'Retrieve a specific location for a shop by its ID',
        tags: ['Shop Locations']
      }
    }
  )
  
  // POST /shops/{shopId}/locations - Create a new location
  .post('/:shopId/locations',
    async (ctx) => {
      const { params, body } = ctx as any;
      const shopId = parseInt(params.shopId, 10);
      
      if (isNaN(shopId)) {
        (ctx as any).set.status = 400;
        return { error: 'Invalid shop ID format. ID must be a number.' };
      }
      
      const locationData = { ...body, shopId };
      
      return shopLocationController.create(locationData, { ...(ctx as any), params, body, user: { id: (ctx as any).currentUserId, roleSlug: (ctx as any).currentRole, managed_shop_id: (ctx as any).managedShopId } as any });
    },
    {
      params: t.Object({ shopId: t.String() }),
      body: ShopLocationCreateSchema,
      detail: {
        summary: 'Create Shop Location',
        description: 'Create a new location for a specific shop',
        tags: ['Shop Locations']
      }
    }
  )
  
  // PUT /shops/{shopId}/locations/{locationId} - Update a location
  .put('/:shopId/locations/:locationId',
    async (ctx) => {
      const { params, body } = ctx as any;
      const shopId = parseInt(params.shopId, 10);
      const locationId = parseInt(params.locationId, 10);
      
      if (isNaN(shopId) || isNaN(locationId)) {
        (ctx as any).set.status = 400;
        return { error: 'Invalid ID format. IDs must be numbers.' };
      }
      
      return shopLocationController.update(locationId, body, { ...(ctx as any), params, body, user: { id: (ctx as any).currentUserId, roleSlug: (ctx as any).currentRole, managed_shop_id: (ctx as any).managedShopId } as any });
    },
    {
      params: t.Object({ 
        shopId: t.String(),
        locationId: t.String() 
      }),
      body: ShopLocationUpdateSchema,
      detail: {
        summary: 'Update Shop Location',
        description: 'Update an existing location for a specific shop',
        tags: ['Shop Locations']
      }
    }
  )
  
  // DELETE /shops/{shopId}/locations/{locationId} - Delete a location
  .delete('/:shopId/locations/:locationId',
    async (ctx) => {
      const { params } = ctx as any;
      const shopId = parseInt(params.shopId, 10);
      const locationId = parseInt(params.locationId, 10);
      
      if (isNaN(shopId) || isNaN(locationId)) {
        (ctx as any).set.status = 400;
        return { error: 'Invalid ID format. IDs must be numbers.' };
      }
      
      return shopLocationController.delete(locationId, { ...(ctx as any), params, user: { id: (ctx as any).currentUserId, roleSlug: (ctx as any).currentRole, managed_shop_id: (ctx as any).managedShopId } as any });
    },
    {
      params: t.Object({ 
        shopId: t.String(),
        locationId: t.String() 
      }),
      detail: {
        summary: 'Delete Shop Location',
        description: 'Delete a location for a specific shop',
        tags: ['Shop Locations']
      }
    }
  )
  
  // POST /shops/{shopId}/locations/{locationId}/toggle-active - Toggle active status
  .post('/:shopId/locations/:locationId/toggle-active',
    async (ctx) => {
      const { params } = ctx as any;
      const shopId = parseInt(params.shopId, 10);
      const locationId = parseInt(params.locationId, 10);
      
      if (isNaN(shopId) || isNaN(locationId)) {
        (ctx as any).set.status = 400;
        return { error: 'Invalid ID format. IDs must be numbers.' };
      }
      
      return shopLocationController.toggleActive(locationId, { ...(ctx as any), params, user: { id: (ctx as any).currentUserId, roleSlug: (ctx as any).currentRole, managed_shop_id: (ctx as any).managedShopId } as any });
    },
    {
      params: t.Object({ 
        shopId: t.String(),
        locationId: t.String() 
      }),
      detail: {
        summary: 'Toggle Shop Location Active Status',
        description: 'Toggle the active status of a location for a specific shop',
        tags: ['Shop Locations']
      }
    }
  );

shopRoutes
  .use(publicShopApi)
  .use(authenticatedShopApi);