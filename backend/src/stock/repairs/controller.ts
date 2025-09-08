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

      // 1) Pre-allocate from purchases for all items to ensure availability and compute costs
      type Allocation = { sku: string; quantity: number; reason_id: number; allocations: Array<{ purchase_item_id: number; quantity: number; unit_price: number }> }
      const perItemAllocations: Allocation[] = []

      for (const item of payload.items) {
        const alloc = await purchasesRepository.allocateSkuQuantity(item.sku, item.quantity, tenant_id)
        if (alloc.total_allocated !== item.quantity) {
          // Rollback previous allocations if any
          const rollbackList = perItemAllocations.flatMap(a => a.allocations.map(x => ({ purchase_item_id: x.purchase_item_id, quantity: x.quantity })))
          await purchasesRepository.deallocateAllocations(rollbackList, tenant_id)
          // Also rollback the partial allocations from this failed attempt
          if (alloc.allocations && alloc.allocations.length > 0) {
            await purchasesRepository.deallocateAllocations(
              alloc.allocations.map(x => ({ purchase_item_id: x.purchase_item_id, quantity: x.quantity })),
              tenant_id
            )
          }
          return { data: null, message: `Insufficient available purchased quantity for SKU ${item.sku}`, status: 400 }
        }
        perItemAllocations.push({ sku: item.sku, quantity: item.quantity, reason_id: item.reason_id, allocations: alloc.allocations })
      }

      // 2) Create stock movements per item
      const results: ConsumeResultItem[] = []
      const successfulMovements: Array<{ sku: string; quantity: number }> = []
      let total_quantity_consumed = 0
      let total_cost = 0

      for (const item of perItemAllocations) {
        const delta = -item.quantity
        const movementResult = await movementsController.create({
          sku: item.sku,
          warehouse_id: payload.warehouse_id,
          delta,
          reason: 'repair',
          ref_type: 'repairs',
          ref_id: repair_id,
          actor_id,
        }, tenant_id)

        const success = movementResult.status === 201
        results.push({
          sku: item.sku,
          quantity: item.quantity,
          cost: item.allocations.reduce((s, a) => s + a.unit_price * a.quantity, 0) / (item.quantity || 1),
          success,
          movement_status: movementResult.status,
        })

        if (!success) {
          // rollback prior successful movements and allocations
          for (const ok of successfulMovements) {
            await movementsController.create({
              sku: ok.sku,
              warehouse_id: payload.warehouse_id,
              delta: ok.quantity, // compensate
              reason: 'repair',
              ref_type: 'repairs_rollback',
              ref_id: repair_id,
              actor_id,
            }, tenant_id)
          }
          const rollbackList = perItemAllocations.flatMap(a => a.allocations.map(x => ({ purchase_item_id: x.purchase_item_id, quantity: x.quantity })))
          await purchasesRepository.deallocateAllocations(rollbackList, tenant_id)
          return { data: null, message: 'Failed to create stock movement; operation reverted', status: 500 }
        }

        successfulMovements.push({ sku: item.sku, quantity: item.quantity })
        total_quantity_consumed += item.quantity
        total_cost += item.allocations.reduce((s, a) => s + a.unit_price * a.quantity, 0)
      }

      // 3) Persist repair_items per allocation
      const itemsToPersist = perItemAllocations.flatMap(a => a.allocations.map(x => ({
        repair_id,
        sku: a.sku,
        quantity: x.quantity,
        cost: Number(x.unit_price),
        reason_id: a.reason_id,
        purchase_items_id: x.purchase_item_id,
        status: true,
        tenant_id,
        created_at: null,
        updated_at: null,
      })))

      try {
        await this.repo.addRepairItems(repair_id, itemsToPersist, tenant_id)
      } catch (e) {
        // rollback: delete persisted repair_items if any, compensate movements, deallocate allocations
        for (const ok of successfulMovements) {
          await movementsController.create({
            sku: ok.sku,
            warehouse_id: payload.warehouse_id,
            delta: ok.quantity, // compensate
            reason: 'repair',
            ref_type: 'repairs_rollback',
            ref_id: repair_id,
            actor_id,
          }, tenant_id)
        }
        const rollbackList = perItemAllocations.flatMap(a => a.allocations.map(x => ({ purchase_item_id: x.purchase_item_id, quantity: x.quantity })))
        await purchasesRepository.deallocateAllocations(rollbackList, tenant_id)
        return { data: null, message: 'Failed to record repair items; operation reverted', status: 500 }
      }

      const data: RepairConsumeResult = {
        repair_id,
        items_count: payload.items.length,
        total_quantity_consumed,
        total_cost,
        results,
      }

      return { data, message: 'Consumption recorded', status: 200 }
    } catch (error) {
      return { data: null, message: 'Failed to consume items', status: 500, error: (error as Error).message }
    }
  }
}


