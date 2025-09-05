import Elysia from "elysia";
import { ConsumptionController } from "./controller";
import { ConsumptionCreate, BulkConsumption, ConsumptionQuery } from "./types";
import { requireRole } from "../../auth";

const controller = new ConsumptionController();

export const consumption_routes = new Elysia({ prefix: '/consumption' })
  .use(requireRole([]))
  
  // Get consumption history
  .get('/', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getConsumptionHistory(query as any, tenantScoped)
  }, { 
    query: ConsumptionQuery, 
    detail: { 
      tags: ['Stock Consumption'], 
      summary: 'Get consumption history',
      description: 'Get history of all parts consumed for repairs with filtering'
    } 
  })

  // Get consumption for specific repair
  .get('/repair/:repairId', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getRepairConsumption(Number(params.repairId), tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock Consumption'], 
      summary: 'Get repair consumption',
      description: 'Get all parts consumed for a specific repair'
    } 
  })

  // Record part consumption
  .post('/', async (ctx) => {
    const { body, currentTenantId } = ctx as any
    return controller.createConsumption(body as any, currentTenantId)
  }, { 
    body: ConsumptionCreate, 
    detail: { 
      tags: ['Stock Consumption'], 
      summary: 'Record part consumption',
      description: 'Record consumption of a part for a repair. This creates a stock movement and updates inventory levels.'
    } 
  })

  // Record bulk consumption for repair
  .post('/bulk', async (ctx) => {
    const { body, currentTenantId } = ctx as any
    return controller.createBulkConsumption(body as any, currentTenantId)
  }, { 
    body: BulkConsumption, 
    detail: { 
      tags: ['Stock Consumption'], 
      summary: 'Record bulk consumption',
      description: 'Record consumption of multiple parts for a repair in a single operation'
    } 
  });

// Export the controller for use by other modules
export { controller as consumptionController };
