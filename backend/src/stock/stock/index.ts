import Elysia from "elysia";
import { StockRepository } from "./repository";
import { StockController } from "./controller";
import { StockCreate, StockUpdate, StockQuery } from "./types";
import { db } from "../../db";
import { requireRole } from "../../auth";

const repo = new StockRepository(db);
const controller = new StockController(repo);

export const stock_routes = new Elysia({ prefix: '/stock' })
  .use(requireRole([]))
  
  // List stock with filtering and pagination
  .get('/', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.list(query as any, tenantScoped)
  }, { 
    query: StockQuery, 
    detail: { 
      tags: ['Stock'], 
      summary: 'List stock records with filtering',
      description: 'Get paginated list of stock records with optional filtering by warehouse, SKU, part status, and low stock threshold'
    } 
  })

  // Get stock summary/dashboard data
  .get('/summary', async (ctx) => {
    const { currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getStockSummary(tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock'], 
      summary: 'Get stock summary',
      description: 'Get summary statistics including total SKUs, quantities, low stock items, and warehouse count'
    } 
  })

  // Get low stock items
  .get('/low-stock', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const threshold = query?.threshold ? Number(query.threshold) : 5
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getLowStockItems(threshold, tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock'], 
      summary: 'Get low stock items',
      description: 'Get items with stock below the threshold (default: 5)'
    } 
  })

  // Get specific stock record by ID
  .get('/:id', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const id = Number(params.id)
    
    // Validate ID parameter
    if (isNaN(id) || id <= 0) {
      return {
        data: null,
        message: 'Invalid stock ID provided',
        status: 400,
        error: 'Stock ID must be a positive number'
      }
    }
    
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getById(id, tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock'], 
      summary: 'Get stock record by ID',
      description: 'Get a specific stock record by its ID'
    } 
  })

  // Get stock by SKU and warehouse
  .get('/sku/:sku/warehouse/:warehouseId', async (ctx) => {
    const { params, currentTenantId } = ctx as any
    const warehouseId = Number(params.warehouseId)
    
    // Validate warehouse ID parameter
    if (isNaN(warehouseId) || warehouseId <= 0) {
      return {
        data: null,
        message: 'Invalid warehouse ID provided',
        status: 400,
        error: 'Warehouse ID must be a positive number'
      }
    }
    
    return controller.getBySku(params.sku, warehouseId, currentTenantId)
  }, { 
    detail: { 
      tags: ['Stock'], 
      summary: 'Get stock by SKU and warehouse',
      description: 'Get stock level for a specific SKU at a specific warehouse'
    } 
  })

  // Create new stock record (manual stock entry)
  .post('/', async (ctx) => {
    const { body, currentTenantId } = ctx as any
    return controller.create(body as any, currentTenantId)
  }, { 
    body: StockCreate, 
    detail: { 
      tags: ['Stock'], 
      summary: 'Create stock record',
      description: 'Manually create a new stock record. Note: This should rarely be used directly - stock is usually updated via movements.'
    } 
  })

  // Update stock record
  .patch('/:id', async (ctx) => {
    const { params, body, currentRole, currentTenantId } = ctx as any
    const id = Number(params.id)
    
    // Validate ID parameter
    if (isNaN(id) || id <= 0) {
      return {
        data: null,
        message: 'Invalid stock ID provided',
        status: 400,
        error: 'Stock ID must be a positive number'
      }
    }
    
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.update(id, body as any, tenantScoped)
  }, { 
    body: StockUpdate, 
    detail: { 
      tags: ['Stock'], 
      summary: 'Update stock record',
      description: 'Update stock record details. Use with caution - quantity changes should usually go through movements.'
    } 
  })

  // Delete stock record
  .delete('/:id', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const id = Number(params.id)
    
    // Validate ID parameter
    if (isNaN(id) || id <= 0) {
      return {
        data: null,
        message: 'Invalid stock ID provided',
        status: 400,
        error: 'Stock ID must be a positive number'
      }
    }
    
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.delete(id, tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock'], 
      summary: 'Delete stock record',
      description: 'Delete a stock record. Use with extreme caution as this affects inventory tracking.'
    } 
  });

// Export the controller for use by other modules
export { controller as stockController };
export { repo as stockRepository };
