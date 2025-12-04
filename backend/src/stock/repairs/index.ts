import Elysia from "elysia";
import { RepairsRepository } from "./repository";
import { RepairsController } from "./controller";
import { RepairCreate, RepairQuery, RepairConsumeItems, RepairCreateWithConsume, RepairAnalyticsQuery, IMEIAnalyticsQuery } from "./types";
import { db } from "../../db";
import { requireRole } from "../../auth";

const repo = new RepairsRepository(db);
const controller = new RepairsController(repo);

export const repairs_routes = new Elysia({ prefix: '/repairs' })
  .use(requireRole([]))

  // Handle OPTIONS preflight for export endpoint
  .options('/export', () => '', { detail: { tags: ['Repairs'], summary: 'CORS preflight for export' } })

  // Export repairs as CSV
  .get('/export', async (ctx) => {
    const { query, set, currentRole, currentTenantId, warehouseId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId

    // Apply warehouse filter for non-admin roles
    const queryWithWarehouse = {
      ...query,
      ...(currentRole !== 'admin' && currentRole !== 'super_admin' && warehouseId ? { warehouse_id: warehouseId } : {})
    }

    const res = await controller.exportToCSV(queryWithWarehouse as any, tenantScoped)
    // Merge headers to preserve CORS headers set by the middleware
    set.headers = { ...((set as any).headers ?? {}), ...res.headers } as any
    set.status = res.status as any
    return res.body
  }, {
    query: RepairQuery,
    detail: {
      tags: ['Repairs'],
      summary: 'Export repairs to CSV',
      description: 'Export repairs to CSV file with filters'
    }
  })

  // Get repair analytics
  .get('/analytics', async (ctx) => {
    const { query, currentTenantId, currentRole, warehouseId } = ctx as any

    // Apply warehouse filter for non-admin roles
    const queryWithWarehouse = {
      ...query,
      ...(currentRole !== 'admin' && currentRole !== 'super_admin' && warehouseId ? { warehouse_id: warehouseId } : {})
    }

    return controller.getAnalytics(queryWithWarehouse as any, currentTenantId)
  }, {
    query: RepairAnalyticsQuery,
    detail: {
      tags: ['Repairs'],
      summary: 'Get repair analytics',
      description: 'Get aggregated analytics for repairs by warehouse and model with date filtering'
    }
  })

  // Get unique device models
  .get('/device-models', async (ctx) => {
    const { currentTenantId } = ctx as any
    return controller.getDeviceModels(currentTenantId)
  }, {
    detail: {
      tags: ['Repairs'],
      summary: 'Get device models',
      description: 'Get unique device models from devices table for filter dropdown'
    }
  })

  // Get IMEI analytics
  .get('/imei-analytics', async (ctx) => {
    const { query, currentTenantId, currentRole, warehouseId } = ctx as any

    // Apply warehouse filter for non-admin roles
    const queryWithWarehouse = {
      ...query,
      ...(currentRole !== 'admin' && currentRole !== 'super_admin' && warehouseId ? { warehouse_id: warehouseId } : {})
    }

    return controller.getIMEIAnalytics(queryWithWarehouse as any, currentTenantId)
  }, {
    query: IMEIAnalyticsQuery,
    detail: {
      tags: ['Repairs'],
      summary: 'Get IMEI analytics',
      description: 'Get paginated device-level analytics with parts breakdown and search'
    }
  })

  // List repairs
  .get('/', async (ctx) => {
    const { query, currentRole, currentTenantId, warehouseId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId

    // Apply warehouse filter for non-admin roles
    const queryWithWarehouse = {
      ...query,
      ...(currentRole !== 'admin' && currentRole !== 'super_admin' && warehouseId ? { warehouse_id: warehouseId } : {})
    }

    return controller.list(queryWithWarehouse as any, tenantScoped)
  }, {
    query: RepairQuery,
    detail: {
      tags: ['Repairs'],
      summary: 'List repairs',
      description: 'Get paginated list of repairs with filters'
    }
  })

  // Get repair with items
  .get('/:id', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getById(Number(params.id), tenantScoped)
  }, {
    detail: {
      tags: ['Repairs'],
      summary: 'Get repair by ID',
      description: 'Get a specific repair with its consumed items'
    }
  })

  // Create repair
  .post('/', async (ctx) => {
    const { body, currentTenantId, currentUserId } = ctx as any
    return controller.create(body as any, currentTenantId, currentUserId)
  }, {
    body: RepairCreate,
    detail: {
      tags: ['Repairs'],
      summary: 'Create repair',
      description: 'Create a new repair record'
    }
  })

  // Create repair with consumption
  .post('/create-with-consume', async (ctx) => {
    const { body, currentTenantId, currentUserId } = ctx as any
    return controller.createWithConsume(body as any, currentTenantId, currentUserId)
  }, {
    body: RepairCreateWithConsume,
    detail: {
      tags: ['Repairs'],
      summary: 'Create repair with consumption',
      description: 'Create a new repair record and consume items in a single operation'
    }
  })

  // Consume items for a repair
  .post('/:id/consume', async (ctx) => {
    const { params, body, currentTenantId, currentUserId } = ctx as any
    return controller.consumeItems(Number(params.id), body as any, currentTenantId, currentUserId)
  }, {
    body: RepairConsumeItems,
    detail: {
      tags: ['Repairs'],
      summary: 'Consume repair parts',
      description: 'Consume parts from stock for this repair and record items'
    }
  })

  // Delete repair with cleanup (restricted to admin, super_admin, repair_manager)
  .delete('/:id', async (ctx) => {
    const { params, currentTenantId, currentUserId, currentRole } = ctx as any

    // Role-based access control: only admin, super_admin, and repair_manager can delete repairs
    const allowedRoles = ['admin', 'super_admin', 'repair_manager']
    if (!allowedRoles.includes(currentRole)) {
      return {
        data: null,
        message: 'Forbidden: You do not have permission to delete repairs',
        status: 403
      }
    }

    return controller.deleteRepairWithCleanup(Number(params.id), currentTenantId, currentUserId)
  }, {
    detail: {
      tags: ['Repairs'],
      summary: 'Delete repair',
      description: 'Delete a repair and restore consumed stock, deallocate purchases, and remove device events. Restricted to admin, super_admin, and repair_manager roles.'
    }
  })

export { controller as repairsController };


