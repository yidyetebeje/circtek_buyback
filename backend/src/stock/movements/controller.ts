import { MovementsRepository } from './repository'
import { MovementCreateInput, MovementQueryInput, MovementWithDetails, MovementListResult, MovementSummary, StockAuditTrail } from './types'
import { stockController } from '../stock'
import type { response } from '../../types/response'

export class MovementsController {
  constructor(private readonly repo: MovementsRepository) {}

  async create(payload: MovementCreateInput & { is_part?: boolean }, tenant_id: number, updateStock: boolean = true): Promise<response<MovementWithDetails | null>> {
    try {
      // Ensure stock record exists BEFORE creating movement (to satisfy foreign key constraint)
      if (updateStock) {
        const stockUpdate = await stockController.updateStockQuantity(
          payload.sku,
          payload.warehouse_id,
          payload.delta,
          tenant_id,
          payload.is_part
        )

        if (stockUpdate.status !== 200) {
          return { 
            data: null, 
            message: `Failed to update stock: ${stockUpdate.message}`, 
            status: 500,
            error: stockUpdate.error 
          }
        }
      } else {
        // Even if not updating stock, ensure the SKU exists to satisfy FK constraint
        await stockController.ensureStockExists(payload.sku, payload.warehouse_id, tenant_id)
      }

      // Create the movement record (now that stock exists)
      const created = await this.repo.createMovement({ ...payload, tenant_id })
      
      if (!created) {
        return { data: null, message: 'Failed to create movement', status: 500 }
      }

      return { 
        data: created, 
        message: 'Stock movement created and stock updated successfully',
        status: 201
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'test') {
        console.error('Movement creation error:', error)
      }
      return { 
        data: null, 
        message: 'Failed to create stock movement', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getById(id: number, tenant_id?: number): Promise<response<MovementWithDetails | null>> {
    try {
      const found = await this.repo.findById(id, tenant_id)
      if (!found) {
        return { data: null, message: 'Movement not found', status: 404 }
      }

      // Tenant access check for non-super-admin users
      if (typeof tenant_id === 'number' && found.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      return { data: found, message: 'OK', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to fetch movement', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async list(query: MovementQueryInput, tenant_id?: number): Promise<response<MovementWithDetails[]>> {
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
        message: 'Failed to fetch movements', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getMovementSummary(query: MovementQueryInput, tenant_id?: number): Promise<response<MovementSummary | null>> {
    try {
      const summary = await this.repo.getMovementSummary({ ...query, tenant_id })
      return { data: summary, message: 'OK', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to get movement summary', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getStockAuditTrail(sku: string, warehouse_id: number, tenant_id: number): Promise<response<StockAuditTrail | null>> {
    try {
      const auditTrail = await this.repo.getStockAuditTrail(sku, warehouse_id, tenant_id)
      
      if (!auditTrail) {
        return { 
          data: null, 
          message: 'No movements found for this SKU and warehouse', 
          status: 404 
        }
      }

      return { data: auditTrail, message: 'OK', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to get audit trail', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getMovementsByReference(ref_type: string, ref_id: number, tenant_id?: number): Promise<response<MovementWithDetails[]>> {
    try {
      const movements = await this.repo.findByReference(ref_type, ref_id, tenant_id)
      return { 
        data: movements, 
        message: 'OK', 
        status: 200,
        meta: { total: movements.length, page: 1, limit: movements.length }
      }
    } catch (error) {
      return { 
        data: [], 
        message: 'Failed to get movements by reference', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  // Batch movement creation for complex operations like transfers
  async createBatchMovements(
    movements: MovementCreateInput[], 
    tenant_id: number, 
    updateStock: boolean = true
  ): Promise<response<MovementWithDetails[]>> {
    try {
      const createdMovements: MovementWithDetails[] = []
      
      // Create all movements first
      for (const movement of movements) {
        const created = await this.repo.createMovement({ ...movement, tenant_id })
        if (created) {
          createdMovements.push(created)
        }
      }

      // Update stock for all movements if requested
      if (updateStock) {
        for (const movement of movements) {
          await stockController.updateStockQuantity(
            movement.sku,
            movement.warehouse_id,
            movement.delta,
            tenant_id
          )
        }
      }

      return { 
        data: createdMovements, 
        message: `${createdMovements.length} movements created successfully`, 
        status: 201 
      }
    } catch (error) {
      return { 
        data: [], 
        message: 'Failed to create batch movements', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }
}
