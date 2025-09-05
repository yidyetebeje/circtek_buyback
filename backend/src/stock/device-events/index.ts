import Elysia, { t } from 'elysia'
import { requireRole } from '../../auth'
import { db } from '../../db'
import { devices } from '../../db/circtek.schema'
import { and, eq } from 'drizzle-orm'
import { deviceEventsService } from '../device-events'

// Query schema allowing either device_id or one of the identifiers
const DeviceEventsQuery = t.Object({
  device_id: t.Optional(t.Number()),
  imei: t.Optional(t.String()),
  serial: t.Optional(t.String()),
  lpn: t.Optional(t.String()),
  tenant_id: t.Optional(t.Number()),
})

async function resolveDeviceId(
  q: { device_id?: number; imei?: string; serial?: string; lpn?: string },
  tenantId: number
): Promise<number | undefined> {
  if (q.device_id) return q.device_id

  if (q.imei) {
    const [row] = await db
      .select({ id: devices.id })
      .from(devices)
      .where(and(eq(devices.tenant_id, tenantId), eq(devices.imei, q.imei)))
    if (row) return row.id
  }

  if (q.serial) {
    const [row] = await db
      .select({ id: devices.id })
      .from(devices)
      .where(and(eq(devices.tenant_id, tenantId), eq(devices.serial, q.serial)))
    if (row) return row.id
  }

  if (q.lpn) {
    const [row] = await db
      .select({ id: devices.id })
      .from(devices)
      .where(and(eq(devices.tenant_id, tenantId), eq(devices.lpn, q.lpn)))
    if (row) return row.id
  }

  return undefined
}

export const device_events_routes = new Elysia({ prefix: '/device-events' })
  .use(requireRole([]))
  .get('/', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const q = query as any as { device_id?: number; imei?: string; serial?: string; lpn?: string; tenant_id?: number }

    const tenantScoped: number = currentRole === 'super_admin' ? (q.tenant_id as number) : (currentTenantId as number)

    if (!tenantScoped) {
      return { data: null, message: 'Missing tenant context', status: 400 }
    }

    // Require at least one identifier
    if (!q.device_id && !q.imei && !q.serial && !q.lpn) {
      return { data: null, message: 'Provide device_id or one of imei, serial, or lpn', status: 400 }
    }

    try {
      const resolvedId = await resolveDeviceId(q, tenantScoped)
      if (!resolvedId) {
        return { data: [], message: 'Device not found for given identifiers', status: 200 }
      }

      const events = await deviceEventsService.getDeviceEvents(resolvedId, tenantScoped)
      return { data: events, message: 'OK', status: 200 }
    } catch (error) {
      return { data: null, message: 'Failed to fetch device events', status: 500, error: (error as Error).message }
    }
  }, {
    query: DeviceEventsQuery,
    detail: {
      tags: ['Stock Device Events'],
      summary: 'Get device event history',
      description: 'Retrieve device event history by device_id or by identifiers (IMEI, serial, LPN) within tenant scope.'
    }
  })

export default device_events_routes
