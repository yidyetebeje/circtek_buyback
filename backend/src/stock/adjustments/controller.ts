import { movementsController } from '../movements'
import { createDeviceEvents } from '../device-events'
import { 
  AdjustmentCreateInput, 
  DeadIMEIWriteOffInput,
  BulkAdjustmentInput,
  AdjustmentQueryInput,
  AdjustmentResult,
  BulkAdjustmentResult,
  AdjustmentRecord,
  ChangeSkuInput,
  ChangeSkuResult
} from './types'
import type { response } from '../../types/response'
import { db } from '../../db'
import { and, eq } from 'drizzle-orm'
import { devices, device_events } from '../../db/circtek.schema'

export class AdjustmentsController {
  constructor() {}

  async createAdjustment(payload: AdjustmentCreateInput, tenant_id: number): Promise<response<AdjustmentResult | null>> {
    try {
      // Validate adjustment quantity is not zero
      if (payload.quantity_adjustment === 0) {
        return { data: null, message: 'Adjustment quantity cannot be zero', status: 400 }
      }
      

      // Create stock movement for the adjustment
      const movementResult = await movementsController.create({
        sku: payload.sku,
        warehouse_id: payload.warehouse_id,
        delta: payload.quantity_adjustment,
        reason: 'adjustment',
        ref_type: 'manual_adjustment',
        ref_id: Date.now(), // Use timestamp as pseudo-ID for manual adjustments
        actor_id: payload.actor_id,
      }, tenant_id)

      const movement_created = movementResult.status === 201
      const stock_updated = movement_created // Stock is updated when movement is created

      // Create device event if device_id is provided
      let device_event_created = false
      if (payload.device_id) {
        device_event_created = await createDeviceEvents.adjustment(
          payload.device_id,
          payload.actor_id,
          tenant_id,
          payload.reason,
          { quantity_adjustment: payload.quantity_adjustment, notes: payload.notes }
        )
      }

      // Create adjustment record (simplified - in a real implementation, this would be stored)
      const adjustmentRecord: AdjustmentRecord = {
        id: Date.now(),
        sku: payload.sku,
        warehouse_id: payload.warehouse_id,
        quantity_adjustment: payload.quantity_adjustment,
        reason: payload.reason,
        notes: payload.notes || null,
        device_id: payload.device_id || null,
        actor_id: payload.actor_id,
        created_at: new Date(),
        tenant_id,
      }

      const result: AdjustmentResult = {
        adjustment: adjustmentRecord,
        movement_created,
        stock_updated,
        device_event_created,
      }

      return { 
        data: result, 
        message: `Stock adjustment created successfully. ${movement_created ? 'Stock updated.' : 'Stock update failed.'}`, 
        status: movement_created ? 201 : 207 // 207 for partial success
      }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to create adjustment', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async createDeadIMEIWriteOff(payload: DeadIMEIWriteOffInput, tenant_id: number): Promise<response<AdjustmentResult | null>> {
    try {
      // Ensure device_id is provided for dead IMEI flow
      if (!payload.device_id) {
        return { data: null, message: 'device_id is required for dead IMEI write-off', status: 400 }
      }

      // Ensure the device is already marked as DEAD_IMEI; if not, create the event first
      const [existingDead] = await db
        .select({ id: device_events.id })
        .from(device_events)
        .where(
          and(
            eq(device_events.device_id, payload.device_id),
            eq(device_events.tenant_id, tenant_id),
            // enum compare
            eq(device_events.event_type as any, 'DEAD_IMEI' as any),
          )
        )
      console.log(existingDead, 'existing dead imei')

      let deadEventCreated = false
      if (!existingDead) {
        deadEventCreated = await createDeviceEvents.deadIMEI(
          payload.device_id,
          payload.actor_id,
          tenant_id,
          payload.reason_notes || 'Dead IMEI write-off'
        )

        if (!deadEventCreated) {
          return { data: null, message: 'Failed to mark device as DEAD_IMEI', status: 500 }
        }
        const adjustmentData: AdjustmentCreateInput = {
          sku: payload.sku,
          warehouse_id: payload.warehouse_id,
          quantity_adjustment: -1, // Write off one unit
          reason: 'dead_imei',
          notes: payload.reason_notes || 'Dead IMEI write-off',
          device_id: payload.device_id,
          actor_id: payload.actor_id,
        }
  
        const result = await this.createAdjustment(adjustmentData, tenant_id)
  
        if (result.data && result.status === 201) {
          // Reflect whether we created the DEAD_IMEI event in this call
          result.data.device_event_created = deadEventCreated
          result.message = 'Dead IMEI write-off completed successfully'
        }
        return result
      }
      return { 
        data: null, 
        message: 'The device is already in dead imei list', 
        status: 500, 
        
      }
      // Create adjustment for dead IMEI (always -1 quantity)
     
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to create dead IMEI write-off', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async createBulkAdjustments(payload: BulkAdjustmentInput, tenant_id: number): Promise<response<BulkAdjustmentResult | null>> {
    try {
      const results: AdjustmentResult[] = []
      let successful_adjustments = 0
      let failed_adjustments = 0
      let total_quantity_adjusted = 0

      for (const adjustment of payload.adjustments) {
        const result = await this.createAdjustment(adjustment, tenant_id)
        
        if (result.data) {
          results.push(result.data)
          if (result.status === 201) {
            successful_adjustments++
            total_quantity_adjusted += adjustment.quantity_adjustment
          } else {
            failed_adjustments++
          }
        } else {
          failed_adjustments++
        }
      }

      const bulkResult: BulkAdjustmentResult = {
        successful_adjustments,
        failed_adjustments,
        total_quantity_adjusted,
        results,
      }

      return { 
        data: bulkResult, 
        message: `Bulk adjustment completed. ${successful_adjustments} successful, ${failed_adjustments} failed.`, 
        status: successful_adjustments > 0 ? 200 : 500 
      }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to process bulk adjustments', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getAdjustmentHistory(query: AdjustmentQueryInput, tenant_id?: number): Promise<response<AdjustmentRecord[]>> {
    try {
      // In a real implementation, this would query a dedicated adjustments table
      // For now, we'll return movements with reason 'adjustment'
      const movementsResult = await movementsController.list({
        ...query,
        reason: 'adjustment',
      }, tenant_id)

      if (movementsResult.status !== 200) {
        return { 
          data: [], 
          message: 'Failed to fetch adjustment history', 
          status: movementsResult.status 
        }
      }

      // Transform movements to adjustment records
      const adjustments: AdjustmentRecord[] = movementsResult.data.map(movement => ({
        id: movement.id,
        sku: movement.sku,
        warehouse_id: movement.warehouse_id,
        warehouse_name: movement.warehouse_name,
        quantity_adjustment: movement.delta,
        reason: movement.reason === 'dead_imei' ? 'dead_imei' : 'adjustment',
        notes: null,
        device_id: null,
        actor_id: movement.actor_id,
        actor_name: movement.actor_name,
        created_at: movement.created_at,
        tenant_id: movement.tenant_id,
      }))

      return {
        data: adjustments,
        message: 'OK',
        status: 200,
        meta: movementsResult.meta,
      }
    } catch (error) {
      return { 
        data: [], 
        message: 'Failed to fetch adjustment history', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getDeadIMEIHistory(query: AdjustmentQueryInput, tenant_id?: number): Promise<response<AdjustmentRecord[]>> {
    try {
      const result = await this.getAdjustmentHistory({
        ...query,
        reason: 'dead_imei',
      }, tenant_id)

      if (result.status === 200) {
        // Convert negative deltas to positive for dead IMEI display
        result.data = result.data.map(record => ({
          ...record,
          quantity_adjustment: Math.abs(record.quantity_adjustment)
        }))
        result.message = 'Dead IMEI history retrieved successfully'
      }

      return result
    } catch (error) {
      return { 
        data: [], 
        message: 'Failed to fetch dead IMEI history', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async changeDeviceSku(payload: ChangeSkuInput, tenant_id: number): Promise<response<ChangeSkuResult | null>> {
    try {
      if (payload.from_sku === payload.to_sku) {
        return { data: null, message: 'from_sku and to_sku must be different', status: 400 }
      }

      // Validate device ownership and current SKU
      const [found] = await db
        .select({ id: devices.id, sku: devices.sku, tenant_id: devices.tenant_id })
        .from(devices)
        .where(and(eq(devices.id, payload.device_id), eq(devices.tenant_id, tenant_id)))

      if (!found) {
        return { data: null, message: 'Device not found', status: 404 }
      }

      if (found.sku && found.sku !== payload.from_sku) {
        return { data: null, message: 'Device current SKU does not match from_sku', status: 409 }
      }

      // Create two movements: -1 from from_sku, +1 to to_sku
      const refId = payload.device_id

      const outMovement = await movementsController.create({
        sku: payload.from_sku,
        warehouse_id: payload.warehouse_id,
        delta: -1,
        reason: 'adjustment',
        ref_type: 'sku_change',
        ref_id: refId,
        actor_id: payload.actor_id,
      }, tenant_id)

      const inMovement = await movementsController.create({
        sku: payload.to_sku,
        warehouse_id: payload.warehouse_id,
        delta: 1,
        reason: 'adjustment',
        ref_type: 'sku_change',
        ref_id: refId,
        actor_id: payload.actor_id,
      }, tenant_id)

      // Update device SKU regardless of partial stock update to keep device record accurate
      await db
        .update(devices)
        .set({ sku: payload.to_sku })
        .where(and(eq(devices.id, payload.device_id), eq(devices.tenant_id, tenant_id)))

      // Device event
      await createDeviceEvents.adjustment(payload.device_id, payload.actor_id, tenant_id, 'sku_change', {
        from_sku: payload.from_sku,
        to_sku: payload.to_sku,
        warehouse_id: payload.warehouse_id,
        notes: payload.notes || null,
      })

      const result: ChangeSkuResult = {
        device_id: payload.device_id,
        from_sku: payload.from_sku,
        to_sku: payload.to_sku,
        warehouse_id: payload.warehouse_id,
        movement_out_created: outMovement.status === 201,
        movement_in_created: inMovement.status === 201,
        device_updated: true,
      }

      const ok = result.movement_out_created && result.movement_in_created
      return {
        data: result,
        message: ok ? 'Device SKU changed and stock updated' : 'Device SKU changed with partial stock update',
        status: ok ? 200 : 207,
      }
    } catch (error) {
      return { data: null, message: 'Failed to change device SKU', status: 500, error: (error as Error).message }
    }
  }
}
