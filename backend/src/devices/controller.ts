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

      const lpn = await this.devicesRepo.findDeviceLpnByIdentifier(identifier, tenantId)
      
      if (!lpn) {
        return { 
          data: { lpn: null }, 
          message: 'No LPN found for the provided identifier', 
          status: 404 
        }
      }

      return {
        data: { lpn },
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

}