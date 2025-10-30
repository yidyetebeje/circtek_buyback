import { StockRepository } from './repository'
import { StockCreateInput, StockQueryInput, StockUpdateInput, StockWithWarehouse, StockListResult, StockSummary } from './types'
import type { response } from '../../types/response'

export class StockController {
  constructor(private readonly repo: StockRepository) {}

  async create(payload: StockCreateInput, tenant_id: number): Promise<response<StockWithWarehouse | null>> {
    try {
      // Validate quantity is positive
      if (payload.quantity < 0) {
        return { data: null, message: 'Quantity cannot be negative', status: 400 }
      }

      const created = await this.repo.createStock({ ...payload, tenant_id })
      return { data: created ?? null, message: 'Stock created successfully', status: 201 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to create stock', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getById(id: number, tenant_id?: number): Promise<response<StockWithWarehouse | null>> {
    try {
      const found = await this.repo.findById(id, tenant_id)
      if (!found) {
        return { data: null, message: 'Stock record not found', status: 404 }
      }

      // Tenant access check for non-super-admin users
      if (typeof tenant_id === 'number' && found.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      return { data: found, message: 'OK', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to fetch stock', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getBySku(sku: string, warehouse_id: number, tenant_id: number): Promise<response<StockWithWarehouse | null>> {
    try {
      const found = await this.repo.findBySkuAndWarehouse(sku, warehouse_id, tenant_id)
      return { 
        data: found ?? null, 
        message: found ? 'OK' : 'Stock not found for SKU at warehouse', 
        status: found ? 200 : 404 
      }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to fetch stock by SKU', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async list(query: StockQueryInput, tenant_id?: number): Promise<response<StockWithWarehouse[]>> {
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
        message: 'Failed to fetch stock list', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async update(id: number, payload: StockUpdateInput, tenant_id?: number): Promise<response<StockWithWarehouse | null>> {
    try {
      // Validate quantity if provided
      if (typeof payload.quantity === 'number' && payload.quantity < 0) {
        return { data: null, message: 'Quantity cannot be negative', status: 400 }
      }

      // Check if record exists and belongs to tenant
      const existing = await this.repo.findById(id, tenant_id)
      if (!existing) {
        return { data: null, message: 'Stock record not found', status: 404 }
      }

      if (typeof tenant_id === 'number' && existing.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      const updated = await this.repo.updateStock(id, payload, tenant_id)
      if (!updated) {
        return { data: null, message: 'Stock record not found', status: 404 }
      }

      return { data: updated, message: 'Stock updated successfully', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to update stock', 
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
        return { data: null, message: 'Stock record not found', status: 404 }
      }

      if (typeof tenant_id === 'number' && existing.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      await this.repo.deleteStock(id, tenant_id)
      return { data: { id }, message: 'Stock deleted successfully', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to delete stock', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getStockSummary(tenant_id?: number): Promise<response<StockSummary | null>> {
    try {
      const summary = await this.repo.getStockSummary(tenant_id)
      return { data: summary, message: 'OK', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to get stock summary', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getLowStockItems(threshold: number = 5, tenant_id?: number): Promise<response<StockWithWarehouse[]>> {
    try {
      const items = await this.repo.getLowStockItems(threshold, tenant_id)
      return { 
        data: items, 
        message: 'OK', 
        status: 200,
        meta: { total: items.length, page: 1, limit: items.length }
      }
    } catch (error) {
      return { 
        data: [], 
        message: 'Failed to get low stock items', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  // Internal method used by other stock modules
  async updateStockQuantity(sku: string, warehouse_id: number, delta: number, tenant_id: number, is_part?: boolean): Promise<response<StockWithWarehouse | null>> {
    try {
      // First, try to update existing stock
      console.log("updateStockQuantity", sku, warehouse_id, delta, tenant_id);
      let updated = await this.repo.updateStockQuantity(sku, warehouse_id, delta, tenant_id)
      
      // If no stock record exists and delta is positive, create a new one
      if (!updated && delta > 0) {
        try {
          const created = await this.repo.createStock({
            sku,
            warehouse_id,
            quantity: delta,
            is_part: is_part ?? false, // Use provided is_part value or default to device
            tenant_id
          })
          updated = created
        } catch (createError) {
          // If creation fails (e.g., duplicate key), try update again
          console.log("error", createError);
          updated = await this.repo.updateStockQuantity(sku, warehouse_id, delta, tenant_id)
        }
      }
      
      // If still no result and delta is negative, that's an insufficient stock scenario
      if (!updated && delta < 0) {
        return { 
          data: null, 
          message: 'Insufficient stock - cannot reduce quantity below zero', 
          status: 422 // Unprocessable Entity
        }
      }
      
      return { 
        data: updated ?? null, 
        message: updated ? 'Stock quantity updated' : 'No stock record found or created', 
        status: updated ? 200 : 404
      }
    } catch (error) {
      console.log("error", error);
      return { 
        data: null, 
        message: 'Failed to update stock quantity', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  // Ensure stock record exists for foreign key constraint satisfaction
  async ensureStockExists(sku: string, warehouse_id: number, tenant_id: number): Promise<void> {
    const existing = await this.repo.findBySkuAndWarehouse(sku, warehouse_id, tenant_id);
    if (!existing) {
      await this.repo.createStock({
        sku,
        warehouse_id,
        quantity: 0,
        tenant_id,
        is_part: false
      });
    }
  }
}
