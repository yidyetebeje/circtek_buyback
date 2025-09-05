import Elysia from "elysia";
import { MovementsRepository } from "./repository";
import { MovementsController } from "./controller";
import { MovementCreate, MovementQuery } from "./types";
import { db } from "../../db";
import { requireRole } from "../../auth";

const repo = new MovementsRepository(db);
const controller = new MovementsController(repo);

export const movements_routes = new Elysia({ prefix: '/movements' })
  .use(requireRole([]))
  
  // List movements with filtering and pagination
  .get('/', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.list(query as any, tenantScoped)
  }, { 
    query: MovementQuery, 
    detail: { 
      tags: ['Stock Movements'], 
      summary: 'List stock movements',
      description: 'Get paginated list of stock movements with filtering by warehouse, SKU, reason, date range, etc.'
    } 
  })

  // Get movement summary/analytics
  .get('/summary', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getMovementSummary(query as any, tenantScoped)
  }, { 
    query: MovementQuery,
    detail: { 
      tags: ['Stock Movements'], 
      summary: 'Get movement summary',
      description: 'Get summary statistics for stock movements including totals by reason and warehouse'
    } 
  })

  // Get audit trail for specific SKU and warehouse
  .get('/audit/:sku/warehouse/:warehouseId', async (ctx) => {
    const { params, currentTenantId } = ctx as any
    return controller.getStockAuditTrail(params.sku, Number(params.warehouseId), currentTenantId)
  }, { 
    detail: { 
      tags: ['Stock Movements'], 
      summary: 'Get stock audit trail',
      description: 'Get complete movement history for a specific SKU at a specific warehouse'
    } 
  })

  // Get movements by reference (e.g., all movements for a purchase or transfer)
  .get('/reference/:refType/:refId', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getMovementsByReference(params.refType, Number(params.refId), tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock Movements'], 
      summary: 'Get movements by reference',
      description: 'Get all movements related to a specific reference (purchase, transfer, repair, etc.)'
    } 
  })

  // Get specific movement by ID
  .get('/:id', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getById(Number(params.id), tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock Movements'], 
      summary: 'Get movement by ID',
      description: 'Get a specific stock movement by its ID'
    } 
  })

  // Create new movement (manual adjustment - use with caution)
  .post('/', async (ctx) => {
    const { body, currentTenantId } = ctx as any
    return controller.create(body as any, currentTenantId)
  }, { 
    body: MovementCreate, 
    detail: { 
      tags: ['Stock Movements'], 
      summary: 'Create stock movement',
      description: 'Manually create a stock movement. This will also update the stock quantities. Use with caution - movements are usually created through other operations.'
    } 
  });

// Export the controller for use by other modules
export { controller as movementsController };
export { repo as movementsRepository };
