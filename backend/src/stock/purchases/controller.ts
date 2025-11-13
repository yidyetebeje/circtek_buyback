import { PurchasesRepository } from './repository'
import { movementsController } from '../movements'
import { 
  PurchaseCreateInput, 
  PurchaseWithItemsInput,
  PurchaseQueryInput, 
  ReceiveItemsRequestInput,
  PurchaseItemCreateInput,
  PurchaseItemUpdateInput,
  PurchaseRecord,
  PurchaseWithItemsAndReceived,
  PurchaseListResult,
  PurchaseWithItemsListResult,
  ReceivingResult
} from './types'
import type { response } from '../../types/response'
import { StockRepository } from '../stock/repository'
import { db } from '../../db/index'
import { deviceEventsService } from '../device-events'

export class PurchasesController {
  constructor(private readonly repo: PurchasesRepository) {}
  private readonly stockRepo = new StockRepository(db)

  async createPurchase(payload: PurchaseCreateInput, tenant_id: number): Promise<response<PurchaseRecord | null>> {
    try {
      const created = await this.repo.createPurchase({ ...payload, tenant_id })
      return { 
        data: created ?? null, 
        message: 'Purchase order created successfully', 
        status: 201 
      }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to create purchase order', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async createPurchaseWithItems(payload: PurchaseWithItemsInput, tenant_id: number): Promise<response<PurchaseWithItemsAndReceived | null>> {
    try {
      // Create the purchase order
      
      const purchase = await this.repo.createPurchase({ ...payload.purchase, tenant_id })
      if (!purchase) {
        return { data: null, message: 'Failed to create purchase order', status: 500 }
      }
    

      // Create the purchase items
      const items = await this.repo.createPurchaseItems(purchase.id, payload.items, tenant_id)
      
      // Return the full purchase with items
      const fullPurchase = await this.repo.findPurchaseWithItems(purchase.id, tenant_id)
      return { 
        data: fullPurchase ?? null, 
        message: 'Purchase order with items created successfully', 
        status: 201 
      }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to create purchase with items', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getPurchaseById(id: number, tenant_id?: number): Promise<response<PurchaseWithItemsAndReceived | null>> {
    try {
      const found = await this.repo.findPurchaseWithItems(id, tenant_id)
      if (!found) {
        return { data: null, message: 'Purchase order not found', status: 404 }
      }

      // Tenant access check for non-super-admin users
      if (typeof tenant_id === 'number' && found.purchase.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      return { data: found, message: 'OK', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to fetch purchase order', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async listPurchases(query: PurchaseQueryInput, tenant_id?: number): Promise<response<PurchaseRecord[]>> {
    try {
      const result = await this.repo.findAllPurchases({ ...query, tenant_id })
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
        message: 'Failed to fetch purchase orders', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async listPurchasesWithItems(query: PurchaseQueryInput, tenant_id?: number): Promise<response<any[]>> {
    try {
      const result = await this.repo.findAllPurchasesWithItems({ ...query, tenant_id })
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
        message: 'Failed to fetch purchase orders with items', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getPurchaseWithItems(id: number, tenant_id?: number): Promise<response<any | null>> {
    try {
      const purchase = await this.repo.findPurchaseWithItems(id, tenant_id)
      if (!purchase) {
        return { data: null, message: 'Purchase order not found', status: 404 }
      }

      // Tenant access check for non-super-admin users
      if (typeof tenant_id === 'number' && purchase.purchase.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      // Transform to consistent with-items format
      const result = {
        purchase: purchase.purchase,
        items: purchase.items
      }

      return { data: result, message: 'OK', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to fetch purchase order with items', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async receiveItems(payload: ReceiveItemsRequestInput, tenant_id: number): Promise<response<ReceivingResult | null>> {
    try {
      // Validate the purchase exists and belongs to tenant
      const purchase = await this.repo.findPurchaseById(payload.purchase_id, tenant_id)
      if (!purchase) {
        return { data: null, message: 'Purchase order not found', status: 404 }
      }

      if (purchase.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      // Get purchase with items to validate remaining quantities
      const purchaseWithItems = await this.repo.findPurchaseWithItems(payload.purchase_id, tenant_id)
      if (!purchaseWithItems) {
        return { data: null, message: 'Purchase order details not found', status: 404 }
      }

      // Validate that received quantities don't exceed remaining quantities
      for (const receiveItem of payload.items) {
        const purchaseItem = purchaseWithItems.items.find(
          pi => pi.id === receiveItem.purchase_item_id
        )
        
        if (!purchaseItem) {
          return { 
            data: null, 
            message: `Purchase item ID ${receiveItem.purchase_item_id} not found in purchase order`, 
            status: 400 
          }
        }

        // Calculate actual quantity being received (either from identifiers or quantity_received)
        const identifiers = (receiveItem as any).identifiers as string[] | undefined
        const quantityToReceive = identifiers && identifiers.length > 0 
          ? identifiers.length 
          : receiveItem.quantity_received

        // Check if quantity exceeds remaining
        if (quantityToReceive > purchaseItem.remaining_quantity) {
          return { 
            data: null, 
            message: `Cannot receive ${quantityToReceive} of SKU ${receiveItem.sku}. Only ${purchaseItem.remaining_quantity} remaining to receive (ordered: ${purchaseItem.quantity}, already received: ${purchaseItem.received_quantity})`, 
            status: 400 
          }
        }

        // Validate that quantity is positive
        if (quantityToReceive <= 0) {
          return { 
            data: null, 
            message: `Quantity to receive must be greater than 0 for SKU ${receiveItem.sku}`, 
            status: 400 
          }
        }
      }

      // Record the received items (also handles device creation from identifiers)
      const receivedItems = await this.repo.receiveItems(payload, tenant_id)

      // Create stock movements for each received item group
      let stockMovementsCreated = 0
      let totalQuantityReceived = 0

      for (const item of payload.items) {
        const identifiers = (item as any).identifiers as string[] | undefined
        const delta = identifiers && identifiers.length > 0
          ? identifiers.length
          : item.quantity_received
        if (identifiers && identifiers.length > 0){
          continue;
        }
        if (delta > 0) {
          const movementResult = await movementsController.create({
            sku: item.sku,
            warehouse_id: purchase.warehouse_id,
            delta,
            reason: 'purchase',
            ref_type: 'received_items',
            ref_id: payload.purchase_id,
            actor_id: payload.actor_id,
          }, tenant_id)

          if (movementResult.status === 201) stockMovementsCreated++
          totalQuantityReceived += delta
        }
      }

      // Create device events for any device-backed received items
      // We attach a TRANSFER_IN event to indicate inbound stock via purchase receiving
      try {
        const deviceReceivedItems = receivedItems.filter(ri => typeof ri.device_id === 'number' && ri.device_id)
        for (const ri of deviceReceivedItems) {
          await deviceEventsService.createDeviceEvent({
            device_id: ri.device_id as number,
            actor_id: payload.actor_id,
            event_type: 'TRANSFER_IN',
            details: { action: 'purchase_received', purchase_id: payload.purchase_id, sku: ri.sku, warehouse_id: purchase.warehouse_id },
            tenant_id,
          })
        }
      } catch (e) {
        // Do not fail the operation if event logging fails; just log for observability
        if (process.env.NODE_ENV === 'test') {
          console.error('Failed to create device events for received items', e)
        }
      }

      const result: ReceivingResult = {
        purchase_id: payload.purchase_id,
        received_items: receivedItems,
        stock_movements_created: stockMovementsCreated,
        total_quantity_received: totalQuantityReceived,
      }

      return { 
        data: result, 
        message: `Successfully received ${totalQuantityReceived} items with ${stockMovementsCreated} stock movements`, 
        status: 200 
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'test') {
        console.error('receiveItems error', error)
      }
      return { 
        data: null, 
        message: 'Failed to receive items', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getReceivedItems(purchase_id: number, tenant_id?: number): Promise<response<any[]>> {
    try {
      // Validate purchase exists and tenant access
      const purchase = await this.repo.findPurchaseById(purchase_id, tenant_id)
      if (!purchase) {
        return { data: [], message: 'Purchase order not found', status: 404 }
      }

      if (typeof tenant_id === 'number' && purchase.tenant_id !== tenant_id) {
        return { data: [], message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      const receivedItems = await this.repo.getReceivedItems(purchase_id, tenant_id)
      return { 
        data: receivedItems, 
        message: 'OK', 
        status: 200,
        meta: { total: receivedItems.length, page: 1, limit: receivedItems.length }
      }
    } catch (error) {
      return { 
        data: [], 
        message: 'Failed to fetch received items', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async deletePurchase(id: number, tenant_id?: number): Promise<response<{ id: number } | null>> {
    try {
      // Check if purchase exists and belongs to tenant
      const purchase = await this.repo.findPurchaseById(id, tenant_id)
      if (!purchase) {
        return { data: null, message: 'Purchase order not found', status: 404 }
      }

      if (typeof tenant_id === 'number' && purchase.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      // Check if any items have been received
      const receivedItems = await this.repo.getReceivedItems(id, tenant_id)
      if (receivedItems.length > 0) {
        return { 
          data: null, 
          message: 'Cannot delete purchase with received items. Please contact administrator.', 
          status: 400 
        }
      }

      await this.repo.deletePurchase(id, tenant_id)
      return { data: { id }, message: 'Purchase order deleted successfully', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to delete purchase order', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getPurchaseReceivingStatus(purchase_id: number, tenant_id?: number): Promise<response<any>> {
    try {
      const purchaseWithItems = await this.repo.findPurchaseWithItems(purchase_id, tenant_id)
      if (!purchaseWithItems) {
        return { data: null, message: 'Purchase order not found', status: 404 }
      }

      const status = {
        purchase_id,
        total_items: purchaseWithItems.total_items,
        total_received: purchaseWithItems.total_received,
        is_fully_received: purchaseWithItems.is_fully_received,
        completion_percentage: purchaseWithItems.total_items > 0 
          ? Math.round((purchaseWithItems.total_received / purchaseWithItems.total_items) * 100) 
          : 0,
        items_status: purchaseWithItems.items.map(item => ({
          sku: item.sku,
          ordered: item.quantity,
          received: item.received_quantity,
          remaining: item.remaining_quantity,
          percentage: item.quantity > 0 ? Math.round((item.received_quantity / item.quantity) * 100) : 0,
        }))
      }

      return { data: status, message: 'OK', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to get receiving status', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async updatePurchaseItemQuantity(
    purchase_item_id: number, 
    payload: PurchaseItemUpdateInput, 
    tenant_id: number
  ): Promise<response<any>> {
    try {
      // Get the purchase item with received quantity
      const purchaseItem = await this.repo.getPurchaseItemWithReceived(purchase_item_id, tenant_id)
      if (!purchaseItem) {
        return { data: null, message: 'Purchase item not found', status: 404 }
      }

      // Validate that new quantity is not less than received quantity
      if (payload.quantity < purchaseItem.received_quantity) {
        return { 
          data: null, 
          message: `Cannot set quantity to ${payload.quantity}. Already received ${purchaseItem.received_quantity} items. New quantity must be at least ${purchaseItem.received_quantity}.`, 
          status: 400 
        }
      }

      // Validate that quantity is positive
      if (payload.quantity <= 0) {
        return { 
          data: null, 
          message: 'Quantity must be greater than 0', 
          status: 400 
        }
      }

      // Update the quantity
      const updated = await this.repo.updatePurchaseItemQuantity(purchase_item_id, payload.quantity, tenant_id)
      
      if (!updated) {
        return { data: null, message: 'Failed to update purchase item', status: 500 }
      }

      return { 
        data: updated, 
        message: 'Purchase item quantity updated successfully', 
        status: 200 
      }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to update purchase item quantity', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async addItemsToPurchase(
    purchase_id: number, 
    items: PurchaseItemCreateInput[], 
    tenant_id: number
  ): Promise<response<any[]>> {
    try {
      // Validate that the purchase exists and belongs to tenant
      const purchase = await this.repo.findPurchaseById(purchase_id, tenant_id)
      if (!purchase) {
        return { data: [], message: 'Purchase order not found', status: 404 }
      }

      if (purchase.tenant_id !== tenant_id) {
        return { data: [], message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      // Validate items
      if (!items || items.length === 0) {
        return { data: [], message: 'No items provided', status: 400 }
      }

      // Validate each item
      for (const item of items) {
        if (!item.sku || item.sku.trim() === '') {
          return { data: [], message: 'SKU is required for all items', status: 400 }
        }
        if (item.quantity <= 0) {
          return { data: [], message: `Quantity must be greater than 0 for SKU ${item.sku}`, status: 400 }
        }
        if (item.price < 0) {
          return { data: [], message: `Price cannot be negative for SKU ${item.sku}`, status: 400 }
        }
      }

      // Check for duplicate SKUs in existing purchase items
      const existingItems = await this.repo.getPurchaseItems(purchase_id, tenant_id)
      const existingSkus = new Set(existingItems.map(item => item.sku?.toLowerCase()))
      
      for (const item of items) {
        if (existingSkus.has(item.sku.toLowerCase())) {
          return { 
            data: [], 
            message: `SKU ${item.sku} already exists in this purchase order`, 
            status: 400 
          }
        }
      }

      // Add the items
      const addedItems = await this.repo.addItemsToPurchase(purchase_id, items, tenant_id)
      
      return { 
        data: addedItems, 
        message: `Successfully added ${addedItems.length} item(s) to purchase order`, 
        status: 201 
      }
    } catch (error) {
      return { 
        data: [], 
        message: 'Failed to add items to purchase order', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async deletePurchaseItem(
    purchase_item_id: number,
    tenant_id: number
  ): Promise<response<{ id: number } | null>> {
    try {
      // Get the purchase item with received quantity
      const purchaseItem = await this.repo.getPurchaseItemWithReceived(purchase_item_id, tenant_id)
      if (!purchaseItem) {
        return { data: null, message: 'Purchase item not found', status: 404 }
      }

      // Check if any items have been received
      if (purchaseItem.received_quantity > 0) {
        return {
          data: null,
          message: `Cannot delete purchase item. ${purchaseItem.received_quantity} item(s) have already been received.`,
          status: 400
        }
      }

      // Delete the item
      const result = await this.repo.deletePurchaseItem(purchase_item_id, tenant_id)
      
      return {
        data: result,
        message: 'Purchase item deleted successfully',
        status: 200
      }
    } catch (error) {
      return {
        data: null,
        message: 'Failed to delete purchase item',
        status: 500,
        error: (error as Error).message
      }
    }
  }
}
