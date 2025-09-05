import { movementsController } from '../movements'
import { 
  ConsumptionCreateInput, 
  BulkConsumptionInput,
  ConsumptionQueryInput,
  ConsumptionResult,
  BulkConsumptionResult,
  ConsumptionRecord
} from './types'
import type { response } from '../../types/response'

export class ConsumptionController {
  constructor() {}

  async createConsumption(payload: ConsumptionCreateInput, tenant_id: number): Promise<response<ConsumptionResult | null>> {
    try {
      // Validate consumption quantity is positive
      if (payload.quantity_consumed <= 0) {
        return { data: null, message: 'Consumption quantity must be positive', status: 400 }
      }

      // Create stock movement for the consumption (negative delta)
      const movementResult = await movementsController.create({
        sku: payload.sku,
        warehouse_id: payload.warehouse_id,
        delta: -payload.quantity_consumed, // Negative because we're consuming stock
        reason: 'repair',
        ref_type: 'repairs',
        ref_id: payload.repair_id,
        actor_id: payload.actor_id,
      }, tenant_id)

      const movement_created = movementResult.status === 201
      const stock_updated = movement_created // Stock is updated when movement is created

      // TODO: Create repair_item record when repair module exists
      const repair_item_created = false

      // Create consumption record (simplified - in a real implementation, this would be stored)
      const consumptionRecord: ConsumptionRecord = {
        id: Date.now(),
        repair_id: payload.repair_id,
        sku: payload.sku,
        warehouse_id: payload.warehouse_id,
        quantity_consumed: payload.quantity_consumed,
        cost: null,
        notes: payload.notes || null,
        actor_id: payload.actor_id,
        created_at: new Date(),
        tenant_id,
      }

      const result: ConsumptionResult = {
        consumption: consumptionRecord,
        movement_created,
        stock_updated,
        repair_item_created,
      }

      return { 
        data: result, 
        message: movement_created 
          ? 'Part consumption recorded and stock updated successfully'
          : 'Part consumption recorded, but stock update failed (insufficient stock or no stock record)',
        status: movement_created ? 201 : 207 // 207 for partial success
      }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to record consumption', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async createBulkConsumption(payload: BulkConsumptionInput, tenant_id: number): Promise<response<BulkConsumptionResult | null>> {
    try {
      const results: ConsumptionResult[] = []
      let successful_consumptions = 0
      let failed_consumptions = 0
      let total_quantity_consumed = 0
      let total_cost = 0

      for (const item of payload.items) {
        const consumptionData: ConsumptionCreateInput = {
          repair_id: payload.repair_id,
          sku: item.sku,
          warehouse_id: payload.warehouse_id,
          quantity_consumed: item.quantity_consumed,
          notes: payload.notes,
          actor_id: payload.actor_id,
        }

        const result = await this.createConsumption(consumptionData, tenant_id)
        
        if (result.data) {
          results.push(result.data)
          if (result.status === 201) {
            successful_consumptions++
            total_quantity_consumed += item.quantity_consumed
            total_cost += 0
          } else {
            failed_consumptions++
          }
        } else {
          failed_consumptions++
        }
      }

      const bulkResult: BulkConsumptionResult = {
        repair_id: payload.repair_id,
        successful_consumptions,
        failed_consumptions,
        total_quantity_consumed,
        total_cost,
        results,
      }

      return { 
        data: bulkResult, 
        message: `Bulk consumption completed. ${successful_consumptions} successful, ${failed_consumptions} failed.`, 
        status: successful_consumptions > 0 ? 200 : 500 
      }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to process bulk consumption', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getConsumptionHistory(query: ConsumptionQueryInput, tenant_id?: number): Promise<response<ConsumptionRecord[]>> {
    try {
      // Get movements with reason 'repair'
      const movementsResult = await movementsController.list({
        ...query,
        reason: 'repair',
      }, tenant_id)

      if (movementsResult.status !== 200) {
        return { 
          data: [], 
          message: 'Failed to fetch consumption history', 
          status: movementsResult.status 
        }
      }

      // Transform movements to consumption records
      const consumptions: ConsumptionRecord[] = movementsResult.data
        .filter(movement => movement.delta < 0) // Only negative deltas are consumptions
        .map(movement => ({
          id: movement.id,
          repair_id: movement.ref_id,
          sku: movement.sku,
          warehouse_id: movement.warehouse_id,
          warehouse_name: movement.warehouse_name,
          quantity_consumed: Math.abs(movement.delta), // Convert negative to positive
          cost: null, // Not available in movements
          notes: null,
          actor_id: movement.actor_id,
          actor_name: movement.actor_name,
          created_at: movement.created_at,
          tenant_id: movement.tenant_id,
        }))

      return {
        data: consumptions,
        message: 'OK',
        status: 200,
        meta: movementsResult.meta,
      }
    } catch (error) {
      return { 
        data: [], 
        message: 'Failed to fetch consumption history', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getRepairConsumption(repair_id: number, tenant_id?: number): Promise<response<ConsumptionRecord[]>> {
    try {
      const result = await this.getConsumptionHistory({
        repair_id,
      }, tenant_id)

      if (result.status === 200) {
        result.message = `Consumption history for repair ${repair_id} retrieved successfully`
        result.meta = {
          page: result.meta?.page ?? 1,
          limit: result.meta?.limit ?? result.data.length,
          total: result.meta?.total ?? result.data.length,
          repair_id,
          total_items: result.data.length,
          total_quantity: result.data.reduce((sum, item) => sum + item.quantity_consumed, 0)
        }
      }

      return result
    } catch (error) {
      return { 
        data: [], 
        message: 'Failed to fetch repair consumption', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }
}
