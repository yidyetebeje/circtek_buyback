import { SkuSpecsRepository } from './repository'
import { SkuSpecsCreateInput, SkuSpecsQueryInput, SkuSpecsUpdateInput, SkuSpecsRecord, SkuSpecsListResult } from './types'
import type { response } from '../../types/response'

export class SkuSpecsController {
  constructor(private readonly repo: SkuSpecsRepository) {}

  async create(payload: SkuSpecsCreateInput, tenant_id: number): Promise<response<SkuSpecsRecord | null>> {
    try {
      // Check if SKU specs already exist for this SKU
      const existing = await this.repo.findBySku(payload.sku, tenant_id)
      if (existing) {
        return { data: null, message: 'SKU specs already exist for this SKU', status: 409 }
      }

      const created = await this.repo.createSkuSpecs({ ...payload, tenant_id })
      return { data: created ?? null, message: 'SKU specs created successfully', status: 201 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to create SKU specs', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getById(id: number, tenant_id?: number): Promise<response<SkuSpecsRecord | null>> {
    try {
      const found = await this.repo.findById(id, tenant_id)
      if (!found) {
        return { data: null, message: 'SKU specs not found', status: 404 }
      }

      // Tenant access check for non-super-admin users
      if (typeof tenant_id === 'number' && found.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      return { data: found, message: 'OK', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to fetch SKU specs', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getBySku(sku: string, tenant_id: number): Promise<response<SkuSpecsRecord | null>> {
    try {
      const found = await this.repo.findBySku(sku, tenant_id)
      return { 
        data: found ?? null, 
        message: found ? 'OK' : 'SKU specs not found for this SKU', 
        status: found ? 200 : 404 
      }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to fetch SKU specs by SKU', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async list(query: SkuSpecsQueryInput, tenant_id?: number): Promise<response<SkuSpecsRecord[]>> {
    try {
      const result = await this.repo.findAll({ ...query, tenant_id })
      return {
        data: result.rows,
        message: 'OK',
        status: 200,
        meta: { 
          total: result.total, 
          page: result.page, 
          limit: result.limit 
        },
      }
    } catch (error) {
      return { 
        data: [], 
        message: 'Failed to fetch SKU specs list', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async update(id: number, payload: SkuSpecsUpdateInput, tenant_id?: number): Promise<response<SkuSpecsRecord | null>> {
    try {
      // Check if record exists and belongs to tenant
      const existing = await this.repo.findById(id, tenant_id)
      if (!existing) {
        return { data: null, message: 'SKU specs not found', status: 404 }
      }

      if (typeof tenant_id === 'number' && existing.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      const updated = await this.repo.updateSkuSpecs(id, payload, tenant_id)
      if (!updated) {
        return { data: null, message: 'SKU specs not found', status: 404 }
      }

      return { data: updated, message: 'SKU specs updated successfully', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to update SKU specs', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async delete(id: number, tenant_id?: number): Promise<response<{ id: number } | null>> {
    try {
      // Check if record exists and belongs to tenant
      const existing = await this.repo.findById(id, tenant_id)
      if (!existing) {
        return { data: null, message: 'SKU specs not found', status: 404 }
      }

      if (typeof tenant_id === 'number' && existing.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      await this.repo.deleteSkuSpecs(id, tenant_id)
      return { data: { id }, message: 'SKU specs deleted successfully', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to delete SKU specs', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async searchAutocomplete(query: string, tenant_id: number, limit: number = 10): Promise<response<Array<{ sku: string; model_name: string | null; is_part: boolean | null }>>> {
    try {
      const results = await this.repo.searchForAutocomplete(query, tenant_id, limit)
      return { 
        data: results, 
        message: 'OK', 
        status: 200 
      }
    } catch (error) {
      return { 
        data: [], 
        message: 'Failed to search SKU specs', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }
}
