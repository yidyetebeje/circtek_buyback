import { eq, and, or } from 'drizzle-orm'
import { db } from '../db'
import { devices, test_results } from '../db/circtek.schema'

export class DevicesRepository {
  constructor(private readonly database: typeof db) {}

  async findDeviceLpnByIdentifier(identifier: string, tenantId: number) {
    // First try to find in devices table by IMEI or serial
    const [deviceRow] = await this.database
      .select({
        id: devices.id,
        lpn: devices.lpn,
        imei: devices.imei,
        serial: devices.serial,
        make: devices.make,
        model_name: devices.model_name,
        source: 'device'
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
      return deviceRow
    }

    // If not found or no LPN in devices table, try test_results table
    const [testResultRow] = await this.database
      .select({
        id: test_results.id,
        lpn: test_results.lpn,
        imei: test_results.imei,
        serial: test_results.serial_number,
        device_id: test_results.device_id,
        source: 'test_result'
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
      .orderBy(test_results.created_at)
      .limit(1)

    if (testResultRow && testResultRow.lpn) {
      // Get additional device info if we found it in test_results
      if (testResultRow.device_id) {
        const [deviceInfo] = await this.database
          .select({
            make: devices.make,
            model_name: devices.model_name
          })
          .from(devices)
          .where(eq(devices.id, testResultRow.device_id))
          .limit(1)

        return {
          id: testResultRow.device_id,
          lpn: testResultRow.lpn,
          imei: testResultRow.imei,
          serial: testResultRow.serial,
          make: deviceInfo?.make || null,
          model_name: deviceInfo?.model_name || null,
          source: testResultRow.source
        }
      }
      
      return {
        id: testResultRow.id,
        lpn: testResultRow.lpn,
        imei: testResultRow.imei,
        serial: testResultRow.serial,
        make: null,
        model_name: null,
        source: testResultRow.source
      }
    }

    // If still not found, return the device info without LPN (if it exists)
    if (deviceRow) {
      return {
        ...deviceRow,
        lpn: null
      }
    }

    return null
  }

  async findDeviceByLpn(lpn: string, tenantId: number) {
    // Try devices table first
    const [deviceRow] = await this.database
      .select({
        id: devices.id,
        lpn: devices.lpn,
        imei: devices.imei,
        serial: devices.serial,
        make: devices.make,
        model_name: devices.model_name,
        source: 'device'
      })
      .from(devices)
      .where(
        and(
          eq(devices.tenant_id, tenantId),
          eq(devices.lpn, lpn)
        )
      )
      .limit(1)

    if (deviceRow) {
      return deviceRow
    }

    // Try test_results table
    const [testResultRow] = await this.database
      .select({
        id: test_results.id,
        lpn: test_results.lpn,
        imei: test_results.imei,
        serial: test_results.serial_number,
        device_id: test_results.device_id,
        source: 'test_result'
      })
      .from(test_results)
      .where(
        and(
          eq(test_results.tenant_id, tenantId),
          eq(test_results.lpn, lpn),
          eq(test_results.status, true)
        )
      )
      .orderBy(test_results.created_at)
      .limit(1)

    if (testResultRow) {
      // Get additional device info if available
      if (testResultRow.device_id) {
        const [deviceInfo] = await this.database
          .select({
            make: devices.make,
            model_name: devices.model_name
          })
          .from(devices)
          .where(eq(devices.id, testResultRow.device_id))
          .limit(1)

        return {
          id: testResultRow.device_id,
          lpn: testResultRow.lpn,
          imei: testResultRow.imei,
          serial: testResultRow.serial,
          make: deviceInfo?.make || null,
          model_name: deviceInfo?.model_name || null,
          source: testResultRow.source
        }
      }

      return {
        id: testResultRow.id,
        lpn: testResultRow.lpn,
        imei: testResultRow.imei,
        serial: testResultRow.serial,
        make: null,
        model_name: null,
        source: testResultRow.source
      }
    }

    return null
  }
}