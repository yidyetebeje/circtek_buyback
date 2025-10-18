import { RepairReasonsRepository } from './repository'
import { RepairReasonCreateInput, RepairReasonUpdateInput, RepairReasonQueryInput, RepairReasonRecord, RepairReasonModelPriceCreateInput, RepairReasonModelPriceUpdateInput, RepairReasonModelPriceRecord, RepairReasonWithModelPrices } from './types'
import type { response } from '../../types/response'

export class RepairReasonsController {
  constructor(private readonly repo: RepairReasonsRepository) {}

  async create(payload: RepairReasonCreateInput, tenant_id: number): Promise<response<RepairReasonRecord | null>> {
    try {
      // Sanitize and validate input data
      const sanitizedPayload: RepairReasonCreateInput = {
        name: payload.name?.toString().trim(),
        description: payload.description?.toString().trim() || undefined,
        fixed_price: payload.fixed_price ?? undefined,
        status: payload.status
      };
      
      // Additional validation for excessive spacing
      if (sanitizedPayload.name && /\s{3,}/.test(sanitizedPayload.name)) {
        return { data: null, message: 'Name cannot contain more than two consecutive spaces', status: 400 };
      }
      
      if (sanitizedPayload.description && /\s{3,}/.test(sanitizedPayload.description)) {
        return { data: null, message: 'Description cannot contain more than two consecutive spaces', status: 400 };
      }

      // Validate fixed_price if provided
      if (sanitizedPayload.fixed_price !== undefined && sanitizedPayload.fixed_price !== null) {
        if (sanitizedPayload.fixed_price < 0) {
          return { data: null, message: 'Fixed price must be greater than or equal to 0', status: 400 };
        }
      }
      
      const created = await this.repo.create({ ...sanitizedPayload, tenant_id })
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
      // Sanitize and validate input data
      const sanitizedPayload: RepairReasonUpdateInput = {};
      if (payload.name !== undefined) {
        sanitizedPayload.name = payload.name?.toString().trim();
        // Check for excessive spacing
        if (sanitizedPayload.name && /\s{3,}/.test(sanitizedPayload.name)) {
          return { data: null, message: 'Name cannot contain more than two consecutive spaces', status: 400 };
        }
      }
      if (payload.description !== undefined) {
        sanitizedPayload.description = payload.description?.toString().trim() || undefined;
        // Check for excessive spacing
        if (sanitizedPayload.description && /\s{3,}/.test(sanitizedPayload.description)) {
          return { data: null, message: 'Description cannot contain more than two consecutive spaces', status: 400 };
        }
      }
      if (payload.fixed_price !== undefined) {
        sanitizedPayload.fixed_price = payload.fixed_price;
        // Validate fixed_price if provided
        if (sanitizedPayload.fixed_price !== null && sanitizedPayload.fixed_price < 0) {
          return { data: null, message: 'Fixed price must be greater than or equal to 0', status: 400 };
        }
      }
      if (payload.status !== undefined) {
        sanitizedPayload.status = payload.status;
      }
      
      const updated = await this.repo.update(id, sanitizedPayload, tenant_id)
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

  // Model-specific pricing methods
  async getByIdWithModelPrices(id: number, tenant_id?: number): Promise<response<RepairReasonWithModelPrices | null>> {
    try {
      const found = await this.repo.findByIdWithModelPrices(id, tenant_id)
      if (!found) return { data: null, message: 'Repair reason not found', status: 404 }
      if (typeof tenant_id === 'number' && found.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }
      return { data: found, message: 'OK', status: 200 }
    } catch (error) {
      return { data: null, message: 'Failed to fetch repair reason', status: 500, error: (error as Error).message }
    }
  }

  async getModelPrices(repair_reason_id: number, tenant_id?: number): Promise<response<RepairReasonModelPriceRecord[]>> {
    try {
      const prices = await this.repo.getModelPrices(repair_reason_id, tenant_id)
      return { data: prices, message: 'OK', status: 200 }
    } catch (error) {
      return { data: [], message: 'Failed to fetch model prices', status: 500, error: (error as Error).message }
    }
  }

  async createModelPrice(payload: RepairReasonModelPriceCreateInput, tenant_id: number): Promise<response<RepairReasonModelPriceRecord | null>> {
    try {
      // Sanitize and validate input data
      const sanitizedPayload: RepairReasonModelPriceCreateInput = {
        repair_reason_id: payload.repair_reason_id,
        model_name: payload.model_name?.toString().trim(),
        fixed_price: payload.fixed_price,
        status: payload.status
      };

      // Validate repair_reason_id
      const reason = await this.repo.findById(sanitizedPayload.repair_reason_id, tenant_id)
      if (!reason) {
        return { data: null, message: 'Repair reason not found', status: 404 }
      }

      // Validate fixed_price
      if (sanitizedPayload.fixed_price < 0) {
        return { data: null, message: 'Fixed price must be greater than or equal to 0', status: 400 }
      }

      // Check for duplicate
      const existing = await this.repo.getModelPrice(sanitizedPayload.repair_reason_id, sanitizedPayload.model_name, tenant_id)
      if (existing) {
        return { data: null, message: 'Model price already exists for this repair reason and model', status: 409 }
      }

      const created = await this.repo.createModelPrice({ ...sanitizedPayload, tenant_id })
      if (!created) return { data: null, message: 'Failed to create model price', status: 500 }
      return { data: created, message: 'Model price created successfully', status: 201 }
    } catch (error) {
      return { data: null, message: 'Failed to create model price', status: 500, error: (error as Error).message }
    }
  }

  async updateModelPrice(id: number, payload: RepairReasonModelPriceUpdateInput, tenant_id?: number): Promise<response<RepairReasonModelPriceRecord | null>> {
    try {
      // Sanitize and validate input data
      const sanitizedPayload: RepairReasonModelPriceUpdateInput = {};
      if (payload.model_name !== undefined) {
        sanitizedPayload.model_name = payload.model_name?.toString().trim();
      }
      if (payload.fixed_price !== undefined) {
        sanitizedPayload.fixed_price = payload.fixed_price;
        if (sanitizedPayload.fixed_price < 0) {
          return { data: null, message: 'Fixed price must be greater than or equal to 0', status: 400 }
        }
      }
      if (payload.status !== undefined) {
        sanitizedPayload.status = payload.status;
      }

      const updated = await this.repo.updateModelPrice(id, sanitizedPayload, tenant_id)
      if (!updated) return { data: null, message: 'Model price not found or failed to update', status: 404 }
      return { data: updated, message: 'Model price updated successfully', status: 200 }
    } catch (error) {
      return { data: null, message: 'Failed to update model price', status: 500, error: (error as Error).message }
    }
  }

  async deleteModelPrice(id: number, tenant_id?: number): Promise<response<null>> {
    try {
      const deleted = await this.repo.deleteModelPrice(id, tenant_id)
      if (!deleted) return { data: null, message: 'Model price not found or failed to delete', status: 404 }
      return { data: null, message: 'Model price deleted successfully', status: 200 }
    } catch (error) {
      return { data: null, message: 'Failed to delete model price', status: 500, error: (error as Error).message }
    }
  }
}

export const repairReasonsController = new RepairReasonsController(new RepairReasonsRepository())
