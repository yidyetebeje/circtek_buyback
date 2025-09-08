import { PowerBIRepository } from "./repository";
import { RepairListResponse, DeviceRepairHistoryResponse } from "./types";

export class PowerBIController {
  constructor(private repository: PowerBIRepository) {}

  async getRepairsList(filters: {
    page?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
    warehouse_id?: number;
    actor_id?: number;
    tenant_id?: number;
    status?: boolean;
  }) {
    try {
      const result = await this.repository.getRepairsList(filters);
      
      return {
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: Math.ceil(result.total / result.limit)
        },
        message: 'Repairs list retrieved successfully',
        status: 200
      };
    } catch (error) {
      return {
        data: null,
        message: 'Failed to retrieve repairs list',
        status: 500,
        error: (error as Error).message
      };
    }
  }

  async getDeviceRepairHistory(filters: {
    imei?: string;
    serial?: string;
    tenant_id?: number;
  }) {
    try {
      if (!filters.imei && !filters.serial) {
        return {
          data: null,
          message: 'Either IMEI or serial number must be provided',
          status: 400
        };
      }

      const result = await this.repository.getDeviceRepairHistory(filters);
      
      if (!result) {
        return {
          data: null,
          message: 'Device not found',
          status: 404
        };
      }

      return {
        data: result,
        message: 'Device repair history retrieved successfully',
        status: 200
      };
    } catch (error) {
      return {
        data: null,
        message: 'Failed to retrieve device repair history',
        status: 500,
        error: (error as Error).message
      };
    }
  }
}
