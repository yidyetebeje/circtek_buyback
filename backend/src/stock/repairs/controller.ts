import { RepairsRepository } from './repository'
import { RepairConsumeItemsInput, RepairCreateInput, RepairQueryInput, RepairWithItems, RepairRecord, RepairConsumeResult, ConsumeResultItem, RepairCreateWithConsumeInput, RepairCreateWithConsumeResult, RepairAnalyticsQueryInput, RepairAnalytics } from './types'
import type { response } from '../../types/response'
import { movementsController } from '../movements'
import { purchasesRepository } from '../purchases'
import { deviceEventsService } from '../device-events'
import { stockRepository } from '../stock'

export class RepairsController {
  constructor(private readonly repo: RepairsRepository) {}

  async create(payload: RepairCreateInput, tenant_id: number, actor_id: number): Promise<response<RepairRecord | null>> {
    try {
      const created = await this.repo.createRepair({ ...payload, tenant_id, actor_id })
      if (!created) return { data: null, message: 'Failed to create repair', status: 500 }
      // Fire device event for repair started
      try {
        await deviceEventsService.createDeviceEvent({
          device_id: created.device_id,
          actor_id,
          event_type: 'REPAIR_STARTED',
          details: { repair_id: created.id, remarks: created.remarks },
          tenant_id,
        })
      } catch (e) {
        // Non-blocking: log in tests
        if (process.env.NODE_ENV === 'test') {
          console.error('Failed to create REPAIR_STARTED device event', e)
        }
      }
      return { data: created, message: 'Repair created successfully', status: 201 }
    } catch (error) {
      return { data: null, message: 'Failed to create repair', status: 500, error: (error as Error).message }
    }
  }

  async createWithConsume(payload: RepairCreateWithConsumeInput, tenant_id: number, actor_id: number): Promise<response<RepairCreateWithConsumeResult | null>> {
    try {
      // 1) Create the repair first
      const repairPayload = {
        device_id: payload.device_id,
        remarks: payload.remarks,
        warehouse_id: payload.warehouse_id,
        actor_id,
      }
      
      const created = await this.repo.createRepair({ ...repairPayload, tenant_id })
      if (!created) return { data: null, message: 'Failed to create repair', status: 500 }

      // Fire device event for repair started
      

      // 2) If no items to consume, return early
      if (!payload.items || payload.items.length === 0) {
        return { 
          data: { 
            repair: created, 
            consume_result: {
              repair_id: created.id,
              items_count: 0,
              total_quantity_consumed: 0,
              total_cost: 0,
              results: []
            }
          }, 
          message: 'Repair created successfully (no items consumed)', 
          status: 201 
        }
      }

      // 3) Consume items for the repair
      const consumePayload: RepairConsumeItemsInput = {
        warehouse_id: payload.warehouse_id,
        items: payload.items,
        notes: payload.notes,
      }

      const consumeResult = await this.consumeItems(created.id, consumePayload, tenant_id, actor_id)
      if (consumeResult.status !== 200) {
        // If consumption fails, we should delete the created repair
        try {
          await this.repo.deleteRepair(created.id, tenant_id)
        } catch (deleteError) {
          // Log the error but don't fail the operation
          console.error('Failed to delete repair after consumption failure:', deleteError)
        }
        return { data: null, message: consumeResult.message, status: consumeResult.status, error: consumeResult.error }
      }

      const data: RepairCreateWithConsumeResult = {
        repair: created,
        consume_result: consumeResult.data!,
      }

      return { data, message: 'Repair created and items consumed successfully', status: 201 }
    } catch (error) {
    
      console.log("error",error);
      return { data: null, message: 'Failed to create repair with consumption', status: 500, error: (error as Error).message }
    }
  }

  async getById(id: number, tenant_id?: number): Promise<response<RepairWithItems | null>> {
    try {
      const found = await this.repo.getRepairWithItems(id, tenant_id)
      if (!found) return { data: null, message: 'Repair not found', status: 404 }
      if (typeof tenant_id === 'number' && found.repair.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }
      return { data: found, message: 'OK', status: 200 }
    } catch (error) {
      return { data: null, message: 'Failed to fetch repair', status: 500, error: (error as Error).message }
    }
  }

  async list(query: RepairQueryInput, tenant_id?: number): Promise<response<RepairRecord[]>> {
    try {
      const result = await this.repo.findAll({ ...query, tenant_id })
      return { data: result.rows, message: 'OK', status: 200, meta: { total: result.total, page: result.page, limit: result.limit } }
    } catch (error) {
      return { data: [], message: 'Failed to fetch repairs', status: 500, error: (error as Error).message }
    }
  }

  async consumeItems(repair_id: number, payload: RepairConsumeItemsInput, tenant_id: number, actor_id: number): Promise<response<RepairConsumeResult | null>> {
    try {
      const repair = await this.repo.findById(repair_id, tenant_id)
      if (!repair) return { data: null, message: 'Repair not found', status: 404 }

      // Step 1: Allocate all items from purchases (fail fast if insufficient)
      const allocationsResult = await this.allocateAllItems(payload.items, repair.device_id, tenant_id, payload.warehouse_id)
      if (!allocationsResult.success || !allocationsResult.data) {
        return { data: null, message: allocationsResult.message, status: 400 }
      }
      
      const allocations = allocationsResult.data

      // Step 2: Create stock movements for each item
      const movementsResult = await this.createStockMovements(allocations, payload.warehouse_id, repair_id, tenant_id, actor_id)
      if (!movementsResult.success || !movementsResult.data) {
        await this.rollbackAllocations(allocations, tenant_id)
        return { data: null, message: 'Failed to create stock movement; operation reverted', status: 500 }
      }

      const { results, successfulMovements, totals } = movementsResult.data

      // Step 3: Persist repair items
      const persistResult = await this.persistRepairItems(allocations, repair_id, tenant_id)
      console.log("persistResult",persistResult);
      if (!persistResult.success) {

        await this.rollbackMovements(successfulMovements, payload.warehouse_id, repair_id, tenant_id, actor_id)
        return { data: null, message: 'Failed to record repair items; operation reverted', status: 500 }
      }

      const data: RepairConsumeResult = {
        repair_id,
        items_count: payload.items.length,
        total_quantity_consumed: totals.quantity,
        total_cost: totals.cost,
        results,
      }

      // Fire device event for repair completed when items are consumed
      try {
        // Get repair items with reasons for the event
        const consumedItemsWithReasons = await Promise.all(
          allocations.map(async (alloc: any) => {
            const reason = await this.repo.getRepairReasonById(alloc.reason_id, tenant_id);
            return {
              part_sku: alloc.sku || 'fixed_price',
              reason: reason?.name || 'Unknown'
            };
          })
        );

        await deviceEventsService.createDeviceEvent({
          device_id: repair.device_id,
          actor_id,
          event_type: 'REPAIR_COMPLETED',
          details: {
            repair_id: repair.id,
            warehouse_id: payload.warehouse_id,
            warehouse_name: repair.warehouse_name || 'Unknown',
            repairer_name: repair.repairer_name || 'Unknown',
            items_count: payload.items.length,
            total_quantity_consumed: totals.quantity,
            total_cost: totals.cost,
            consumed_skus: consumedItemsWithReasons,
          },
          tenant_id,
        })
      } catch (e) {
        // Non-blocking: log in tests
        if (process.env.NODE_ENV === 'test') {
          console.error('Failed to create REPAIR_COMPLETED device event', e)
          console.log("Failed to create Repaired_complete ",e);
        }
      }

      return { data, message: 'Consumption recorded', status: 200 }
    } catch (error) {
      return { data: null, message: 'Failed to consume items', status: 500, error: (error as Error).message }
    }
  }

  private async allocateAllItems(items: RepairConsumeItemsInput['items'], device_id: number, tenant_id: number, warehouse_id: number) {
    type ItemAllocation = { sku: string; quantity: number; reason_id: number; description?: string; allocations: Array<{ purchase_item_id: number; quantity: number; unit_price: number }>; is_fixed_price?: boolean; fixed_price?: number}
    const allocations: ItemAllocation[] = []

    // Get device information to determine model-specific pricing
    const device = await this.repo.getDeviceById(device_id, tenant_id)
    console.log("device information", device)
    if (!device) {
      return { 
        success: false, 
        message: 'Device not found',
        data: null 
      }
    }

    for (const item of items) {
     
      // Handle fixed-price items (service-only repairs)
      if (item.sku === 'fixed_price' || item.sku === '') {
        // Get model-specific or default price
        const priceInfo = await this.repo.getRepairReasonPrice(item.reason_id || 0, device.model_name || '', tenant_id)
        const reason = await this.repo.getRepairReasonById(item.reason_id || 0, tenant_id)
        
        if (!priceInfo) {
          // Rollback any successful allocations before failing
          await this.rollbackAllocations(allocations, tenant_id)
          return { 
            success: false, 
            message: `Repair reason ${item.reason_id} not found`,
            data: null 
          }
        }
        
        
        if (!priceInfo.fixed_price) {
          // Rollback any successful allocations before failing
          await this.rollbackAllocations(allocations, tenant_id)
          
          // Get the repair reason name for a better error message
          const repairReason = await this.repo.getRepairReasonById(item.reason_id || 0, tenant_id)
          const reasonName = repairReason?.name || 'Unknown'
          
          return { 
            success: false, 
            message: `Repair reason "${reasonName}" does not have a fixed price${device.model_name ? ` for model ${device.model_name}` : ''}`,
            data: null 
          }
        }
      
        allocations.push({ 
          sku: 'fixed_price', 
          quantity: item.quantity, 
          reason_id: item.reason_id || 0, 
          description: item.description,
          allocations: [],
          is_fixed_price: true,
          fixed_price: Number(priceInfo.fixed_price)
        })
        continue
      }
      
      
      // Handle regular parts-based items
      const allocation = await purchasesRepository.allocateSkuQuantity(item.sku, item.quantity, tenant_id, warehouse_id)
      
      if (allocation.total_allocated !== item.quantity) {
        // Rollback any successful allocations before failing
        await this.rollbackAllocations(allocations, tenant_id)
        
        // Also rollback the partial allocation from this failed attempt
        if (allocation.allocations?.length > 0) {
          await this.rollbackPurchaseAllocations(allocation.allocations, tenant_id)
        }
        
        return { 
          success: false, 
          message: `Insufficient available purchased quantity for SKU ${item.sku}`,
          data: null 
        }
      }

      allocations.push({ 
        sku: item.sku, 
        quantity: item.quantity, 
        reason_id: item.reason_id || 0, 
        description: item.description,
        allocations: allocation.allocations 
      })
    }

    return { success: true, data: allocations, message: 'All items allocated successfully' }
  }

  private async createStockMovements(allocations: any[], warehouse_id: number, repair_id: number, tenant_id: number, actor_id: number) {
    const results: ConsumeResultItem[] = []
    const successfulMovements: Array<{ sku: string; quantity: number }> = []
    let total_quantity = 0
    let total_cost = 0

    for (const item of allocations) {
      // Skip stock movements for fixed-price items (no physical inventory consumed)
      if (item.is_fixed_price) {
        const itemCost = item.fixed_price * item.quantity
        
        results.push({
          sku: item.sku,
          quantity: item.quantity,
          cost: item.fixed_price,
          success: true,
          movement_status: 200, // No movement needed
        })

        total_quantity += item.quantity
        total_cost += itemCost
        continue
      }

      // Handle regular parts-based items with stock movements
      const movementResult = await movementsController.create({
        sku: item.sku,
        warehouse_id,
        delta: -item.quantity,
        reason: 'repair',
        ref_type: 'repairs',
        ref_id: repair_id,
        actor_id,
      }, tenant_id)

      const itemCost = this.calculateItemCost(item.allocations, item.quantity)
      const success = movementResult.status === 201
      
      results.push({
        sku: item.sku,
        quantity: item.quantity,
        cost: itemCost,
        success,
        movement_status: movementResult.status,
      })

      if (!success) {
        // Rollback successful movements before failing
        await this.rollbackMovements(successfulMovements, warehouse_id, repair_id, tenant_id, actor_id)
        return { success: false, data: null, message: 'Movement creation failed' }
      }

      successfulMovements.push({ sku: item.sku, quantity: item.quantity })
      total_quantity += item.quantity
      total_cost += this.calculateTotalItemCost(item.allocations)
    }

    return { 
      success: true, 
      data: { results, successfulMovements, totals: { quantity: total_quantity, cost: total_cost } },
      message: 'All movements created successfully'
    }
  }

  private async persistRepairItems(allocations: any[], repair_id: number, tenant_id: number) {
    const repairItems = allocations.flatMap(item => {
      if(item.reason_id == 0){
         item.reason_id = null;
      }
      // Handle fixed-price items (no purchase allocations)
      if (item.is_fixed_price) {
        return [{
          repair_id,
          sku: item.sku,
          quantity: item.quantity,
          description: item.description,
          cost: item.fixed_price,
          reason_id: item.reason_id,
          purchase_items_id: null,
          status: true,
          tenant_id,
          created_at: null,
          updated_at: null,
        }]
      }
      
      // Handle regular parts-based items (with purchase allocations)
      return item.allocations.map((allocation: any) => ({
        repair_id,
        sku: item.sku,
        quantity: allocation.quantity,
        description: item.description,
        cost: Number(allocation.unit_price),
        reason_id: item.reason_id,
        purchase_items_id: allocation.purchase_item_id,
        status: true,
        tenant_id,
        created_at: null,
        updated_at: null,
      }))
    })

    try {
      await this.repo.addRepairItems(repair_id, repairItems, tenant_id)
      return { success: true, message: 'Repair items persisted successfully' }
    } catch (error) {
      console.log(error);
      return { success: false, message: 'Failed to persist repair items' }
    }
  }

  private async rollbackAllocations(allocations: any[], tenant_id: number) {
    // Filter out fixed-price items as they don't have allocations to rollback
    const allAllocations = allocations
      .filter(a => !a.is_fixed_price)
      .flatMap(a => 
        a.allocations.map((x: any) => ({ purchase_item_id: x.purchase_item_id, quantity: x.quantity }))
      )
    
    if (allAllocations.length > 0) {
      await purchasesRepository.deallocateAllocations(allAllocations, tenant_id)
    }
  }

  private async rollbackPurchaseAllocations(allocations: Array<{ purchase_item_id: number; quantity: number }>, tenant_id: number) {
    const rollbackList = allocations.map(x => ({ purchase_item_id: x.purchase_item_id, quantity: x.quantity }))
    await purchasesRepository.deallocateAllocations(rollbackList, tenant_id)
  }

  private async rollbackMovements(movements: Array<{ sku: string; quantity: number }>, warehouse_id: number, repair_id: number, tenant_id: number, actor_id: number) {
    for (const movement of movements) {
      await movementsController.create({
        sku: movement.sku,
        warehouse_id,
        delta: movement.quantity, // compensate with positive delta
        reason: 'repair',
        ref_type: 'repairs_rollback',
        ref_id: repair_id,
        actor_id,
      }, tenant_id)
    }
  }

  private calculateItemCost(allocations: Array<{ unit_price: number; quantity: number }>, totalQuantity: number): number {
    const totalCost = allocations.reduce((sum, alloc) => sum + alloc.unit_price * alloc.quantity, 0)
    return totalCost / (totalQuantity || 1)
  }

  private calculateTotalItemCost(allocations: Array<{ unit_price: number; quantity: number }>): number {
    return allocations.reduce((sum, alloc) => sum + alloc.unit_price * alloc.quantity, 0)
  }

  async getAnalytics(query: RepairAnalyticsQueryInput, tenant_id: number): Promise<response<RepairAnalytics | null>> {
    try {
      const filters = {
        tenant_id,
        date_from: query.date_from,
        date_to: query.date_to,
        warehouse_id: query.warehouse_id,
        model_name: query.model_name,
        reason_id: query.reason_id,
      }

      const analytics = await this.repo.getRepairAnalytics(filters)
      return { data: analytics, message: 'Analytics retrieved successfully', status: 200 }
    } catch (error) {
      return { data: null, message: 'Failed to retrieve analytics', status: 500, error: (error as Error).message }
    }
  }

  async getDeviceModels(tenant_id: number): Promise<response<string[]>> {
    try {
      const models = await this.repo.getUniqueDeviceModels(tenant_id)
      return { data: models, message: 'Device models retrieved successfully', status: 200 }
    } catch (error) {
      return { data: [], message: 'Failed to retrieve device models', status: 500, error: (error as Error).message }
    }
  }

  async getIMEIAnalytics(query: any, tenant_id: number): Promise<response<any>> {
    try {
      const filters = {
        tenant_id,
        date_from: query.date_from,
        date_to: query.date_to,
        warehouse_id: query.warehouse_id,
        model_name: query.model_name,
        reason_id: query.reason_id,
        search: query.search,
        page: query.page || 1,
        limit: query.limit || 10,
      }

      const result = await this.repo.getIMEIAnalytics(filters)
      return { data: result, message: 'IMEI analytics retrieved successfully', status: 200 }
    } catch (error) {
      return { data: null, message: 'Failed to retrieve IMEI analytics', status: 500, error: (error as Error).message }
    }
  }

  async deleteRepairWithCleanup(repair_id: number, tenant_id: number, actor_id: number): Promise<response<{ id: number } | null>> {
    try {
      // Step 1: Get the repair with all its items
      const repairWithItems = await this.repo.getRepairWithItems(repair_id, tenant_id)
      if (!repairWithItems) {
        return { data: null, message: 'Repair not found', status: 404 }
      }

      const { repair, items } = repairWithItems

      // Step 2: Restore stock and deallocate purchases for each item
      for (const item of items) {
        // Skip fixed-price items as they don't consume physical inventory
        if (item.sku === 'fixed_price') {
          continue
        }

        // Deallocate from purchase items (restore quantity_used_for_repair)
        if (item.purchase_items_id) {
          await purchasesRepository.deallocateAllocations(
            [{ purchase_item_id: item.purchase_items_id, quantity: item.quantity }],
            tenant_id
          )
        }

        // Create reverse stock movement to restore inventory
        await movementsController.create({
          sku: item.sku,
          warehouse_id: repair.warehouse_id,
          delta: item.quantity, // positive delta to restore stock
          reason: 'repair',
          ref_type: 'repairs_deleted',
          ref_id: repair_id,
          actor_id,
        }, tenant_id)
      }
      // delete all device events from this repair
      await this.repo.deleteDeviceEventsByRepairId(repair_id, tenant_id)

      
      // Step 3: Create REPAIR_DELETED event for audit trail
      try {
        // Prepare consumed items summary for the event
        const consumedItemsSummary = items.map(item => ({
          sku: item.sku,
          quantity: item.quantity,
          cost: Number(item.cost),
          reason: item.reason_name || null
        }))

        await deviceEventsService.createDeviceEvent({
          device_id: repair.device_id,
          actor_id,
          event_type: 'REPAIR_DELETED',
          details: {
            repair_id: repair.id,
            deleted_at: new Date().toISOString(),
            warehouse_id: repair.warehouse_id,
            warehouse_name: repair.warehouse_name || 'Unknown',
            repairer_name: repair.repairer_name || 'Unknown',
            items_count: items.length,
            total_quantity_restored: items.reduce((sum, item) => sum + item.quantity, 0),
            total_cost: items.reduce((sum, item) => sum + Number(item.cost) * item.quantity, 0),
            consumed_items: consumedItemsSummary,
            remarks: repair.remarks || null,
          },
          tenant_id,
        })
      } catch (e) {
        // Non-blocking: log the error but continue with deletion
        console.error('Failed to create REPAIR_DELETED device event', e)
      }

      // Step 4: Delete repair items
      await this.repo.deleteRepairItemsByRepairId(repair_id, tenant_id)

      // Step 5: Delete the repair itself
      await this.repo.deleteRepair(repair_id, tenant_id)

      // Note: We keep the original REPAIR_STARTED and REPAIR_COMPLETED events for audit trail
      // The REPAIR_DELETED event marks that this repair was removed

      return { data: { id: repair_id }, message: 'Repair deleted successfully and stock restored', status: 200 }
    } catch (error) {
      console.error('Failed to delete repair:', error)
      return { data: null, message: 'Failed to delete repair', status: 500, error: (error as Error).message }
    }
  }
}


