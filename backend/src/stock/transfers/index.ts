import Elysia from "elysia";
import { TransfersRepository } from "./repository";
import { TransfersController } from "./controller";
import { TransferCreate, TransferWithItems, CompleteTransferRequest, TransferQuery } from "./types";
import { db } from "../../db";
import { requireRole } from "../../auth";

const repo = new TransfersRepository(db);
const controller = new TransfersController(repo);

export const transfers_routes = new Elysia({ prefix: '/transfers' })
  .use(requireRole([]))
  
  // List transfers with filtering and pagination
  .get('/', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.listTransfers(query as any, tenantScoped)
  }, { 
    query: TransferQuery, 
    detail: { 
      tags: ['Stock Transfers'], 
      summary: 'List transfers',
      description: 'Get paginated list of stock transfers with filtering by warehouse, status, date, etc.'
    } 
  })

  // Get transfer summary/analytics
  .get('/summary', async (ctx) => {
    const { currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getTransferSummary(tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock Transfers'], 
      summary: 'Get transfer summary',
      description: 'Get summary statistics for transfers including pending/completed counts and warehouse breakdown'
    } 
  })

  // Get pending transfers
  .get('/pending', async (ctx) => {
    const { currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getPendingTransfers(tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock Transfers'], 
      summary: 'Get pending transfers',
      description: 'Get all transfers that are pending completion'
    } 
  })

  // Device lookup by IMEI/Serial
  .get('/device-lookup/:identifier', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.findDeviceByImeiOrSerial(params.identifier, tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock Transfers'], 
      summary: 'Find device by IMEI or Serial',
      description: 'Look up a device by its IMEI or serial number for transfer operations'
    } 
  })

  // Get specific transfer with items
  .get('/:id', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getTransferById(Number(params.id), tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock Transfers'], 
      summary: 'Get transfer with items',
      description: 'Get a specific transfer with its items and details'
    } 
  })

  // Create new transfer (simple version)
  .post('/', async (ctx) => {
    const { body, currentTenantId, currentUserId } = ctx as any
    return controller.createTransfer({ ...(body as any), created_by: currentUserId } as any, currentTenantId)
  }, { 
    body: TransferCreate, 
    detail: { 
      tags: ['Stock Transfers'], 
      summary: 'Create transfer',
      description: 'Create a new stock transfer (without items). Items can be added separately.'
    } 
  })

  // Create transfer with items (complete version)
  .post('/with-items', async (ctx) => {
    const { body, currentTenantId, currentUserId } = ctx as any
    return controller.createTransferWithItems({ ...(body as any), created_by: currentUserId } as any, currentTenantId)
  }, { 
    body: TransferWithItems, 
    detail: { 
      tags: ['Stock Transfers'], 
      summary: 'Create transfer with items',
      description: 'Create a complete transfer with items in a single request'
    } 
  })

  // Complete transfer (key stock operation - creates dual movements)
  .post('/:id/complete', async (ctx) => {
    const { params, body, currentTenantId, currentUserId } = ctx as any
    const completeData = {
      ...body,
      transfer_id: Number(params.id)
    }
    return controller.completeTransfer({ ...(completeData as any), actor_id: currentUserId } as any, currentTenantId)
  }, { 
    body: CompleteTransferRequest, 
    detail: { 
      tags: ['Stock Transfers'], 
      summary: 'Complete transfer',
      description: 'Mark transfer as completed. This creates dual stock movements (out from source, in to destination) and updates inventory levels.'
    } 
  })

  // Delete transfer
  .delete('/:id', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.deleteTransfer(Number(params.id), tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock Transfers'], 
      summary: 'Delete transfer',
      description: 'Delete a transfer. Cannot delete if transfer has been completed.'
    } 
  });

// Export the controller for use by other modules
export { controller as transfersController };
export { repo as transfersRepository };
