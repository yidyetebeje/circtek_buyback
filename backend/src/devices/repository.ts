import { eq, and, or, desc } from 'drizzle-orm'
import { db } from '../db'
import { devices, test_results } from '../db/circtek.schema'

export class DevicesRepository {
  constructor(private readonly database: typeof db) {}

  async findDeviceLpnByIdentifier(identifier: string, tenantId: number) {
    // First try to find in devices table by IMEI or serial
    const [deviceRow] = await this.database
      .select({
        lpn: devices.lpn
      })
      .from(devices)
      .where(
        and(
          eq(devices.tenant_id, tenantId),
          or(
            eq(devices.imei, identifier),
            eq(devices.serial, identifier)
          )
        )
      )
      .limit(1)

    if (deviceRow && deviceRow.lpn) {
      console.log('Device LPN found in devices table', deviceRow.lpn)
      return deviceRow.lpn
    }

    // If not found or no LPN in devices table, try test_results table
    const [testResultRow] = await this.database
      .select({
        lpn: test_results.lpn
      })
      .from(test_results)
      .where(
        and(
          eq(test_results.tenant_id, tenantId),
          or(
            eq(test_results.imei, identifier),
            eq(test_results.serial_number, identifier)
          ),
          eq(test_results.status, true)
        )
      )
      .orderBy(desc(test_results.created_at))
      .limit(1)

    if (testResultRow && testResultRow.lpn) {
      console.log('Device LPN found in test_results table', testResultRow.lpn)
      return testResultRow.lpn
    }

    return null
  }

  async find(imei: string, tenantId: number) {
    const [device] = await this.database
      .select()
      .from(devices)
      .where(and(
        or(eq(devices.imei, imei),
        eq(devices.serial, imei)),
        eq(devices.tenant_id, tenantId),
      ))
      .limit(1)
    if (device) {
      return device
    }
    return null
  }
}