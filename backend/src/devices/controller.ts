import type { response } from '../types/response'
import { DevicesRepository } from './repository'

export class DevicesController {
  constructor(private readonly devicesRepo: DevicesRepository) {}

  async getLpnByIdentifier(identifier: string, tenantId: number): Promise<response<any>> {
    try {
      if (!identifier) {
        return { data: null, message: 'Identifier (IMEI or serial number) is required', status: 400 }
      }

      if (!tenantId) {
        return { data: null, message: 'Tenant ID is required', status: 400 }
      }

      const result = await this.devicesRepo.findDeviceLpnByIdentifier(identifier, tenantId)
      
      if (!result) {
        return { 
          data: null, 
          message: 'Device not found with the provided identifier', 
          status: 404 
        }
      }

      if (!result.lpn) {
        return {
          data: {
            device_found: true,
            lpn: null,
            device_info: {
              id: result.id,
              imei: result.imei,
              serial: result.serial,
              make: result.make,
              model_name: result.model_name,
              source: result.source
            },
            message: 'Device found but no LPN assigned'
          },
          message: 'Device found but no LPN available',
          status: 200
        }
      }

      return {
        data: {
          device_found: true,
          lpn: result.lpn,
          device_info: {
            id: result.id,
            imei: result.imei,
            serial: result.serial,
            make: result.make,
            model_name: result.model_name,
            source: result.source
          }
        },
        message: 'LPN found successfully',
        status: 200
      }
    } catch (error) {
      console.error('Error fetching LPN by identifier:', error)
      return { 
        data: null, 
        message: 'Failed to fetch LPN', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getDeviceByLpn(lpn: string, tenantId: number): Promise<response<any>> {
    try {
      if (!lpn) {
        return { data: null, message: 'LPN is required', status: 400 }
      }

      if (!tenantId) {
        return { data: null, message: 'Tenant ID is required', status: 400 }
      }

      const result = await this.devicesRepo.findDeviceByLpn(lpn, tenantId)
      
      if (!result) {
        return { 
          data: null, 
          message: 'Device not found with the provided LPN', 
          status: 404 
        }
      }

      return {
        data: {
          device_info: {
            id: result.id,
            lpn: result.lpn,
            imei: result.imei,
            serial: result.serial,
            make: result.make,
            model_name: result.model_name,
            source: result.source
          }
        },
        message: 'Device found successfully',
        status: 200
      }
    } catch (error) {
      console.error('Error fetching device by LPN:', error)
      return { 
        data: null, 
        message: 'Failed to fetch device by LPN', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }
}