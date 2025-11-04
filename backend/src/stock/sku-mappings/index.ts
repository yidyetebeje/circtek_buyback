import Elysia, { t } from "elysia"
import { SkuMappingsController } from "./controller"
import { 
  SkuMappingCreate, 
  SkuMappingUpdate, 
  SkuMappingQuery, 
  SkuMappingParams 
} from "./types"
import { requireRole } from "../../auth"

const controller = new SkuMappingsController()

export const sku_mappings_routes = new Elysia({ prefix: '/sku-mappings' })
  .use(requireRole([])) // Require authentication
  
  // List SKU mappings with optional filtering
  .get('/', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? currentTenantId : currentTenantId
    
    const result = await controller.list(query as any, tenantScoped)
    
    // Return the inner data structure for the list endpoint
    if (result.data) {
      return result.data
    }
    
    return {
      data: [],
      message: result.message || 'Failed to retrieve SKU mappings',
      status: result.status || 500,
      error: result.error
    }
  }, { 
    query: SkuMappingQuery,
    detail: { 
      tags: ['SKU Mappings'], 
      summary: 'List SKU mappings',
      description: 'Get a paginated list of SKU mappings with optional search and filtering'
    } 
  })

  // Get single SKU mapping by ID
  .get('/:id', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? currentTenantId : currentTenantId
    
    return controller.getById(params.id, tenantScoped)
  }, { 
    params: SkuMappingParams,
    detail: { 
      tags: ['SKU Mappings'], 
      summary: 'Get SKU mapping by ID',
      description: 'Retrieve a single SKU mapping by its unique identifier'
    } 
  })

  // Create new SKU mapping
  .post('/', async (ctx) => {
    const { body, currentTenantId } = ctx as any
    
    return controller.create(body as any, currentTenantId)
  }, { 
    body: SkuMappingCreate,
    detail: { 
      tags: ['SKU Mappings'], 
      summary: 'Create SKU mapping',
      description: 'Create a new SKU mapping rule with dynamic conditions'
    } 
  })

  // Update existing SKU mapping
  .put('/:id', async (ctx) => {
    const { params, body, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? currentTenantId : currentTenantId
    
    return controller.update(params.id, body as any, tenantScoped)
  }, { 
    params: SkuMappingParams,
    body: SkuMappingUpdate,
    detail: { 
      tags: ['SKU Mappings'], 
      summary: 'Update SKU mapping',
      description: 'Update an existing SKU mapping rule'
    } 
  })

  // Delete SKU mapping
  .delete('/:id', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? currentTenantId : currentTenantId
    
    return controller.delete(params.id, tenantScoped)
  }, { 
    params: SkuMappingParams,
    detail: { 
      tags: ['SKU Mappings'], 
      summary: 'Delete SKU mapping',
      description: 'Delete an existing SKU mapping rule'
    } 
  })

  // Resolve SKU from conditions (utility endpoint for other services)
  .post('/resolve', async (ctx) => {
    const { body, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? currentTenantId : currentTenantId
    
    return controller.findByConditions(body.conditions, tenantScoped)
  }, {
    body: t.Object({
      conditions: t.Record(
        t.String(), // property key 
        t.String({ minLength: 1 }) // property value
      ),
    }),
    detail: { 
      tags: ['SKU Mappings'], 
      summary: 'Resolve SKU from conditions',
      description: 'Find the matching SKU mapping for given device properties'
    } 
  })

// Export the controller for use by other modules  
export { controller as skuMappingsController }