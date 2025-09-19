import Elysia, { t } from 'elysia'
import { requireRole } from '../auth'
import { db } from '../db'
import { DevicesRepository } from './repository'
import { DevicesController } from './controller'

const devicesRepo = new DevicesRepository(db)
const devicesController = new DevicesController(devicesRepo)

// Query schemas
const LpnLookupQuery = t.Object({
  identifier: t.String({ description: 'IMEI or serial number to look up' }),
  tenant_id: t.Optional(t.Number({ description: 'Tenant ID (only for super_admin)' }))
})

const DeviceLookupQuery = t.Object({
  lpn: t.String({ description: 'LPN to look up device by' }),
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
      description: 'Retrieve the License Plate Number (LPN) of a device by providing its IMEI or serial number. Searches both devices and test_results tables.'
    }
  })

  // Get device info by LPN
  .get('/by-lpn', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const q = query as any as { lpn: string; tenant_id?: number }

    // Determine tenant scope
    const tenantScoped: number = currentRole === 'super_admin' 
      ? (q.tenant_id || currentTenantId) 
      : currentTenantId

    if (!tenantScoped) {
      return { data: null, message: 'Missing tenant context', status: 400 }
    }

    if (!q.lpn) {
      return { data: null, message: 'LPN parameter is required', status: 400 }
    }

    return await devicesController.getDeviceByLpn(q.lpn, tenantScoped)
  }, {
    query: DeviceLookupQuery,
    detail: {
      tags: ['Devices'],
      summary: 'Get device info by LPN',
      description: 'Retrieve device information by providing its License Plate Number (LPN). Searches both devices and test_results tables.'
    }
  })

export default devices_routes