import { RepairsRepository } from './repository'
import { RepairConsumeItemsInput, RepairCreateInput, RepairQueryInput, RepairWithItems, RepairRecord, RepairConsumeResult, ConsumeResultItem, RepairCreateWithConsumeInput, RepairCreateWithConsumeResult } from './types'
import type { response } from '../../types/response'
import { movementsController } from '../movements'
import { purchasesRepository } from '../purchases'
import { deviceEventsService } from '../device-events'

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
      const allocationsResult = await this.allocateAllItems(payload.items, tenant_id)
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
      if (!persistResult.success) {
        await this.rollbackMovements(successfulMovements, payload.warehouse_id, repair_id, tenant_id, actor_id)
        await this.rollbackAllocations(allocations, tenant_id)
        return { data: null, message: 'Failed to record repair items; operation reverted', status: 500 }
      }

      const data: RepairConsumeResult = {
        repair_id,
        items_count: payload.items.length,
        total_quantity_consumed: totals.quantity,
        total_cost: totals.cost,
        results,
      }

      return { data, message: 'Consumption recorded', status: 200 }
    } catch (error) {
      return { data: null, message: 'Failed to consume items', status: 500, error: (error as Error).message }
    }
  }

  private async allocateAllItems(items: RepairConsumeItemsInput['items'], tenant_id: number) {
    type ItemAllocation = { sku: string; quantity: number; reason_id: number; allocations: Array<{ purchase_item_id: number; quantity: number; unit_price: number }> }
    const allocations: ItemAllocation[] = []

    for (const item of items) {
      const allocation = await purchasesRepository.allocateSkuQuantity(item.sku, item.quantity, tenant_id)
      
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
        reason_id: item.reason_id, 
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
    const repairItems = allocations.flatMap(item => 
      item.allocations.map((allocation: any) => ({
        repair_id,
        sku: item.sku,
        quantity: allocation.quantity,
        cost: Number(allocation.unit_price),
        reason_id: item.reason_id,
        purchase_items_id: allocation.purchase_item_id,
        status: true,
        tenant_id,
        created_at: null,
        updated_at: null,
      }))
    )

    try {
      await this.repo.addRepairItems(repair_id, repairItems, tenant_id)
      return { success: true, message: 'Repair items persisted successfully' }
    } catch (error) {
      return { success: false, message: 'Failed to persist repair items' }
    }
  }

  private async rollbackAllocations(allocations: any[], tenant_id: number) {
    const allAllocations = allocations.flatMap(a => 
      a.allocations.map((x: any) => ({ purchase_item_id: x.purchase_item_id, quantity: x.quantity }))
    )
    await purchasesRepository.deallocateAllocations(allAllocations, tenant_id)
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
}


