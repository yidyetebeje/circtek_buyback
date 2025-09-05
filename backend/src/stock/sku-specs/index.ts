import Elysia from "elysia";
import { SkuSpecsRepository } from "./repository";
import { SkuSpecsController } from "./controller";
import { SkuSpecsCreate, SkuSpecsUpdate, SkuSpecsQuery } from "./types";
import { db } from "../../db";
import { requireRole } from "../../auth";

const repo = new SkuSpecsRepository(db);
const controller = new SkuSpecsController(repo);

export const sku_specs_routes = new Elysia({ prefix: '/sku-specs' })
  .use(requireRole([]))
  
  // List SKU specs with filtering and pagination
  .get('/', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.list(query as any, tenantScoped)
  }, { 
    query: SkuSpecsQuery, 
    detail: { 
      tags: ['SKU Specs'], 
      summary: 'List SKU specs with filtering',
      description: 'Get paginated list of SKU specifications with optional filtering by SKU, make, model, device type, and search'
    } 
  })

  // Get specific SKU specs by ID
  .get('/:id', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const id = Number(params.id)
    
    // Validate ID parameter
    if (isNaN(id) || id <= 0) {
      return {
        data: null,
        message: 'Invalid SKU specs ID provided',
        status: 400,
        error: 'SKU specs ID must be a positive number'
      }
    }
    
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getById(id, tenantScoped)
  }, { 
    detail: { 
      tags: ['SKU Specs'], 
      summary: 'Get SKU specs by ID',
      description: 'Get specific SKU specifications by ID'
    } 
  })

  // Get SKU specs by SKU
  .get('/sku/:sku', async (ctx) => {
    const { params, currentTenantId } = ctx as any
    return controller.getBySku(params.sku, currentTenantId)
  }, { 
    detail: { 
      tags: ['SKU Specs'], 
      summary: 'Get SKU specs by SKU',
      description: 'Get SKU specifications for a specific SKU'
    } 
  })

  // Create new SKU specs
  .post('/', async (ctx) => {
    const { body, currentTenantId } = ctx as any
    return controller.create(body as any, currentTenantId)
  }, { 
    body: SkuSpecsCreate, 
    detail: { 
      tags: ['SKU Specs'], 
      summary: 'Create SKU specs',
      description: 'Create new SKU specifications for a product'
    } 
  })

  // Update SKU specs
  .patch('/:id', async (ctx) => {
    const { params, body, currentRole, currentTenantId } = ctx as any
    const id = Number(params.id)
    
    // Validate ID parameter
    if (isNaN(id) || id <= 0) {
      return {
        data: null,
        message: 'Invalid SKU specs ID provided',
        status: 400,
        error: 'SKU specs ID must be a positive number'
      }
    }
    
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.update(id, body as any, tenantScoped)
  }, { 
    body: SkuSpecsUpdate, 
    detail: { 
      tags: ['SKU Specs'], 
      summary: 'Update SKU specs',
      description: 'Update existing SKU specifications'
    } 
  })

  // Delete SKU specs
  .delete('/:id', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const id = Number(params.id)
    
    // Validate ID parameter
    if (isNaN(id) || id <= 0) {
      return {
        data: null,
        message: 'Invalid SKU specs ID provided',
        status: 400,
        error: 'SKU specs ID must be a positive number'
      }
    }
    
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.delete(id, tenantScoped)
  }, { 
    detail: { 
      tags: ['SKU Specs'], 
      summary: 'Delete SKU specs',
      description: 'Delete SKU specifications record'
    } 
  })

  // Search SKU specs for autocomplete
  .get('/search/autocomplete', async (ctx) => {
    const { query, currentTenantId } = ctx as any
    const searchQuery = query.q || ''
    const limit = Math.min(20, Math.max(1, Number(query.limit) || 10))
    
    return controller.searchAutocomplete(searchQuery, currentTenantId, limit)
  }, { 
    detail: { 
      tags: ['SKU Specs'], 
      summary: 'Search SKU specs for autocomplete',
      description: 'Search SKU specifications by name or SKU for autocomplete functionality'
    } 
  });

// Export the controller for use by other modules
export { controller as skuSpecsController };
export { repo as skuSpecsRepository };
