import { RepairReasonsRepository } from './repository'
import { RepairReasonCreateInput, RepairReasonUpdateInput, RepairReasonQueryInput, RepairReasonRecord } from './types'
import type { response } from '../../types/response'

export class RepairReasonsController {
  constructor(private readonly repo: RepairReasonsRepository) {}

  async create(payload: RepairReasonCreateInput, tenant_id: number): Promise<response<RepairReasonRecord | null>> {
    try {
      const created = await this.repo.create({ ...payload, tenant_id })
      if (!created) return { data: null, message: 'Failed to create repair reason', status: 500 }
      return { data: created, message: 'Repair reason created successfully', status: 201 }
    } catch (error) {
      return { data: null, message: 'Failed to create repair reason', status: 500, error: (error as Error).message }
    }
  }

  async getById(id: number, tenant_id?: number): Promise<response<RepairReasonRecord | null>> {
    try {
      const found = await this.repo.findById(id, tenant_id)
      if (!found) return { data: null, message: 'Repair reason not found', status: 404 }
      if (typeof tenant_id === 'number' && found.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }
      return { data: found, message: 'OK', status: 200 }
    } catch (error) {
      return { data: null, message: 'Failed to fetch repair reason', status: 500, error: (error as Error).message }
    }
  }

  async list(query: RepairReasonQueryInput, tenant_id?: number): Promise<response<RepairReasonRecord[]>> {
    try {
      const result = await this.repo.findAll({ ...query, tenant_id })
      return { data: result.rows, message: 'OK', status: 200, meta: { total: result.total, page: result.page, limit: result.limit } }
    } catch (error) {
      return { data: [], message: 'Failed to fetch repair reasons', status: 500, error: (error as Error).message }
    }
  }

  async update(id: number, payload: RepairReasonUpdateInput, tenant_id?: number): Promise<response<RepairReasonRecord | null>> {
    try {
      const updated = await this.repo.update(id, payload, tenant_id)
      if (!updated) return { data: null, message: 'Repair reason not found or failed to update', status: 404 }
      return { data: updated, message: 'Repair reason updated successfully', status: 200 }
    } catch (error) {
      return { data: null, message: 'Failed to update repair reason', status: 500, error: (error as Error).message }
    }
  }

  async delete(id: number, tenant_id?: number): Promise<response<null>> {
    try {
      const deleted = await this.repo.delete(id, tenant_id)
      if (!deleted) return { data: null, message: 'Repair reason not found or failed to delete', status: 404 }
      return { data: null, message: 'Repair reason deleted successfully', status: 200 }
    } catch (error) {
      return { data: null, message: 'Failed to delete repair reason', status: 500, error: (error as Error).message }
    }
  }
}

export const repairReasonsController = new RepairReasonsController(new RepairReasonsRepository())
