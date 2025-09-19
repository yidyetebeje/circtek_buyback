import Elysia, { t } from 'elysia'
import { requireRole } from '../auth'
import { db } from '../db'
import { DevicesRepository } from './repository'
import { DevicesController } from './controller'

const devicesRepo = new DevicesRepository(db)
const devicesController = new DevicesController(devicesRepo)

// Query schema
const LpnLookupQuery = t.Object({
  identifier: t.String({ description: 'IMEI or serial number to look up' }),
  tenant_id: t.Optional(t.Number({ description: 'Tenant ID (only for super_admin)' }))
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

export default devices_routes
