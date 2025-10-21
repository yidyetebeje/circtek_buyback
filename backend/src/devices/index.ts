import Elysia, { t } from 'elysia'
import { requireRole } from '../auth'
import { db } from '../db'
import { devices } from '../db/circtek.schema'
import { and, eq, or } from 'drizzle-orm'
import { DevicesRepository } from './repository'
import { DevicesController } from './controller'

const devicesRepo = new DevicesRepository(db)
const devicesController = new DevicesController(devicesRepo)

// Query schema
const LpnLookupQuery = t.Object({
  identifier: t.String({ description: 'IMEI or serial number to look up' }),
  tenant_id: t.Optional(t.Number({ description: 'Tenant ID (only for super_admin)' }))
})

const DeviceSearchQuery = t.Object({
  imei: t.Optional(t.String()),
  serial: t.Optional(t.String()),
  limit: t.Optional(t.Number({ default: 10 }))
})

export const devices_routes = new Elysia({ prefix: '/devices' })
  .use(requireRole([]))
  
  // Get LPN by IMEI or Serial Number
  .get('/lpn', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const q = query as any as { identifier: string; tenant_id?: number }

    // Determine tenant scope
    const tenantScoped: number = currentRole === 'super_admin' 
      ? (q.tenant_id || currentTenantId) 
      : currentTenantId

    if (!tenantScoped) {
      return { data: null, message: 'Missing tenant context', status: 400 }
    }

    if (!q.identifier) {
      return { data: null, message: 'Identifier parameter is required (IMEI or serial number)', status: 400 }
    }

    return await devicesController.getLpnByIdentifier(q.identifier, tenantScoped)
  }, {
    query: LpnLookupQuery,
    detail: {
      tags: ['Devices'],
      summary: 'Get LPN by IMEI or Serial Number',
      description: 'Retrieve the License Plate Number (LPN) of a device by providing its IMEI or serial number. Returns a simple object with just the LPN value.'
    }
  })

  // Search devices by IMEI or Serial
  .get('/', async (ctx) => {
    const { query, currentTenantId } = ctx as any
    const q = query as any as { imei?: string; serial?: string; limit?: number }

    if (!currentTenantId) {
      return { data: null, message: 'Missing tenant context', status: 400 }
    }

    // Require at least one search parameter
    if (!q.imei && !q.serial) {
      return { data: [], message: 'Provide imei or serial parameter', status: 200 }
    }

    try {
      const conditions = [eq(devices.tenant_id, currentTenantId), eq(devices.status, true)]
      
      if (q.imei && q.serial) {
        // Search by both IMEI and serial
        conditions.push(or(
          eq(devices.imei, q.imei),
          eq(devices.serial, q.serial)
        )!)
      } else if (q.imei) {
        conditions.push(eq(devices.imei, q.imei))
      } else if (q.serial) {
        conditions.push(eq(devices.serial, q.serial))
      }

      const results = await db
        .select({
          id: devices.id,
          imei: devices.imei,
          serial: devices.serial,
          make: devices.make,
          model_name: devices.model_name,
          device_type: devices.device_type,
          warehouse_id: devices.warehouse_id,
          color: devices.color,
          storage: devices.storage
        })
        .from(devices)
        .where(and(...conditions))
        .limit(q.limit || 10)

      return { data: results, message: 'OK', status: 200 }
    } catch (error) {
      return { data: null, message: 'Failed to search devices', status: 500, error: (error as Error).message }
    }
  }, {
    query: DeviceSearchQuery,
    detail: {
      tags: ['Devices'],
      summary: 'Search devices by IMEI or Serial',
      description: 'Search for devices by IMEI or serial number within tenant scope.'
    }
  })

export default devices_routes
