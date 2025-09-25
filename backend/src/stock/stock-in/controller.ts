import { eq, and, desc } from 'drizzle-orm'
import type { response } from '../../types/response'
import { StockInRepository, stockInRepository } from './repository'
import type { StockInRequestInput, StockInResponse } from './types'
import { device_grades, grades } from '../../db/circtek.schema'

export class StockInController {
  constructor(private readonly repo: StockInRepository) {}

  async stockIn(
    request: StockInRequestInput,
    actorId: number,
    tenantId: number
  ): Promise<response<StockInResponse | null>> {
    try {
      const result = await this.repo.processStockIn(request, actorId, tenantId)
      
      if (!result) {
        return {
          data: null,
          message: 'Failed to process stock in',
          status: 500
        }
      }

      return {
        data: result,
        message: result.message,
        status: 200
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      // Handle specific error cases
      if (errorMessage.includes('not found')) {
        return {
          data: null,
          message: errorMessage,
          status: 404
        }
      }
      
      if (errorMessage.includes('already has grade')) {
        return {
          data: null,
          message: errorMessage,
          status: 409 // Conflict
        }
      }

      return {
        data: null,
        message: errorMessage,
        status: 500
      }
    }
  }

  async getDeviceGradeHistory(
    imei: string,
    tenantId: number
  ): Promise<response<any[]>> {
    try {
      const device = await this.repo.findDeviceByIMEI(imei, tenantId)
      if (!device) {
        return {
          data: [],
          message: `Device with IMEI ${imei} not found`,
          status: 404
        }
      }

      // Use repository method to get grade history
      const history = await this.repo.getDeviceGradeHistory(device.id, tenantId)

      return {
        data: history,
        message: 'Grade history retrieved successfully',
        status: 200
      }
    } catch (error) {
      return {
        data: [],
        message: 'Failed to retrieve grade history',
        status: 500
      }
    }
  }
}

export const stockInController = new StockInController(stockInRepository)
