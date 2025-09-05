import Elysia from "elysia";
import { AdjustmentsController } from "./controller";
import { AdjustmentCreate, DeadIMEIWriteOff, BulkAdjustment, AdjustmentQuery, ChangeSkuRequest } from "./types";
import { requireRole } from "../../auth";

const controller = new AdjustmentsController();

export const adjustments_routes = new Elysia({ prefix: '/adjustments' })
  .use(requireRole([]))
  
  // Get adjustment history
  .get('/', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getAdjustmentHistory(query as any, tenantScoped)
  }, { 
    query: AdjustmentQuery, 
    detail: { 
      tags: ['Stock Adjustments'], 
      summary: 'Get adjustment history',
      description: 'Get history of all stock adjustments with filtering'
    } 
  })

  // Get dead IMEI history
  .get('/dead-imei', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getDeadIMEIHistory(query as any, tenantScoped)
  }, { 
    query: AdjustmentQuery, 
    detail: { 
      tags: ['Stock Adjustments'], 
      summary: 'Get dead IMEI history',
      description: 'Get history of all dead IMEI write-offs'
    } 
  })

  // Create stock adjustment
  .post('/', async (ctx) => {
    const { body, currentTenantId } = ctx as any
    return controller.createAdjustment(body as any, currentTenantId)
  }, { 
    body: AdjustmentCreate, 
    detail: { 
      tags: ['Stock Adjustments'], 
      summary: 'Create stock adjustment',
      description: 'Create a manual stock adjustment. This creates a stock movement and updates inventory levels.'
    } 
  })

  // Create dead IMEI write-off
  .post('/dead-imei', async (ctx) => {
    const { body, currentTenantId } = ctx as any
    return controller.createDeadIMEIWriteOff(body as any, currentTenantId)
  }, { 
    body: DeadIMEIWriteOff, 
    detail: { 
      tags: ['Stock Adjustments'], 
      summary: 'Write off dead IMEI',
      description: 'Write off a device with dead IMEI. This removes one unit from stock and creates a device event.'
    } 
  })

  // Create bulk adjustments
  .post('/bulk', async (ctx) => {
    const { body, currentTenantId } = ctx as any
    return controller.createBulkAdjustments(body as any, currentTenantId)
  }, { 
    body: BulkAdjustment, 
    detail: { 
      tags: ['Stock Adjustments'], 
      summary: 'Create bulk adjustments',
      description: 'Create multiple stock adjustments in a single operation'
    } 
  })

  // Change device SKU (moves stock between SKUs and updates device)
  .post('/change-sku', async (ctx) => {
    const { body, currentTenantId } = ctx as any
    return controller.changeDeviceSku(body as any, currentTenantId)
  }, {
    body: ChangeSkuRequest,
    detail: {
      tags: ['Stock Adjustments'],
      summary: 'Change device SKU',
      description: 'Change a device from one SKU to another: -1 from old SKU, +1 to new SKU, update device sku, and record movements'
    }
  });

// Export the controller for use by other modules
export { controller as adjustmentsController };
