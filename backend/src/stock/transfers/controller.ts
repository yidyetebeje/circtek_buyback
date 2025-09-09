import { TransfersRepository } from './repository'
import { movementsController } from '../movements'
import { createDeviceEvents } from '../device-events'
import { 
  TransferCreateInput, 
  TransferWithItemsInput,
  TransferQueryInput, 
  CompleteTransferRequestInput,
  TransferRecord,
  TransferWithDetails,
  TransferListResult,
  TransferCompletionResult,
  TransferSummary
} from './types'
import type { response } from '../../types/response'

export class TransfersController {
  constructor(private readonly repo: TransfersRepository) {}

  async createTransfer(payload: TransferCreateInput & { created_by: number }, tenant_id: number): Promise<response<TransferRecord | null>> {
    try {
      // Validate that source and destination warehouses are different
      if (payload.from_warehouse_id === payload.to_warehouse_id) {
        return { 
          data: null, 
          message: 'Source and destination warehouses must be different', 
          status: 400 
        }
      }

      const created = await this.repo.createTransfer({ ...payload, tenant_id, created_by: payload.created_by })
      return { 
        data: created ?? null, 
        message: 'Transfer created successfully', 
        status: 201 
      }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to create transfer', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async createTransferWithItems(payload: TransferWithItemsInput & { created_by: number }, tenant_id: number): Promise<response<TransferWithDetails | null>> {
    try {
      // Validate that source and destination warehouses are different
      if (payload.transfer.from_warehouse_id === payload.transfer.to_warehouse_id) {
        return { 
          data: null, 
          message: 'Source and destination warehouses must be different', 
          status: 400 
        }
      }

      // Create the transfer
      const transfer = await this.repo.createTransfer({ ...payload.transfer, tenant_id, created_by: payload.created_by })
      if (!transfer) {
        return { data: null, message: 'Failed to create transfer', status: 500 }
      }

      // Create the transfer items with validation
      await this.repo.createTransferItems(transfer.id, payload.items, tenant_id, payload.transfer.from_warehouse_id, payload.transfer.to_warehouse_id)
      
      // Return the full transfer with details
      const fullTransfer = await this.repo.findTransferWithDetails(transfer.id, tenant_id)
      return { 
        data: fullTransfer ?? null, 
        message: 'Transfer with items created successfully', 
        status: 201 
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      // Check if it's a validation error (stock availability)
      if (errorMessage.includes('does not exist in the sender warehouse') || 
          errorMessage.includes('Insufficient quantity for SKU')) {
        return { 
          data: null, 
          message: errorMessage, 
          status: 400 
        }
      }
      
      // Generic error
      return { 
        data: null, 
        message: 'Failed to create transfer with items', 
        status: 500, 
        error: errorMessage 
      }
    }
  }

  async getTransferById(id: number, tenant_id?: number): Promise<response<TransferWithDetails | null>> {
    try {
      const found = await this.repo.findTransferWithDetails(id, tenant_id)
      if (!found) {
        return { data: null, message: 'Transfer not found', status: 404 }
      }

      // Tenant access check for non-super-admin users
      if (typeof tenant_id === 'number' && found.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      return { data: found, message: 'OK', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to fetch transfer', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async listTransfers(query: TransferQueryInput, tenant_id?: number): Promise<response<TransferWithDetails[]>> {
    try {
      const result = await this.repo.findAllTransfers({ ...query, tenant_id })
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
        message: 'Failed to fetch transfers', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async completeTransfer(payload: CompleteTransferRequestInput, tenant_id: number): Promise<response<TransferCompletionResult | null>> {
    try {
      // Get the transfer with details
      const transfer = await this.repo.findTransferWithDetails(payload.transfer_id, tenant_id)
      if (!transfer) {
        return { data: null, message: 'Transfer not found', status: 404 }
      }

      if (transfer.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      // Check if already completed
      if (transfer.is_completed) {
        return { data: null, message: 'Transfer is already completed', status: 400 }
      }

      // Create dual stock movements for each item (out from source, in to destination)
      let movementsCreated = 0
      let totalItemsTransferred = 0
      let totalQuantityTransferred = 0
      let deviceEventsCreated = 0

      for (const item of transfer.items) {
        const quantity = item.quantity || 1
        
        // Movement 1: Stock Out from Source Warehouse
        const outMovement = await movementsController.create({
          sku: item.sku,
          warehouse_id: transfer.from_warehouse_id,
          delta: -quantity, // Negative delta for outbound
          reason: 'transfer_out',
          ref_type: 'transfers',
          ref_id: transfer.id,
          actor_id: (transfer as any).created_by,
          is_part: item.is_part || false,
        }, tenant_id, true) // Update stock

        // Movement 2: Stock In to Destination Warehouse
        const inMovement = await movementsController.create({
          sku: item.sku,
          warehouse_id: transfer.to_warehouse_id,
          delta: quantity, // Positive delta for inbound
          reason: 'transfer_in',
          ref_type: 'transfers',
          ref_id: transfer.id,
          actor_id: payload.actor_id,
          is_part: item.is_part || false,
        }, tenant_id, true) // Update stock

        if (outMovement.status === 201) movementsCreated++
        if (inMovement.status === 201) movementsCreated++

        // Update stock quantities for successful movements
        if (outMovement.status === 201 && inMovement.status === 201) {
          totalItemsTransferred++
          totalQuantityTransferred += quantity
        }

        // Create device events for TRANSFER_OUT and TRANSFER_IN if not a part
        if (!item.is_part && item.device_id) {
          const outEvent = await createDeviceEvents.transferOut(
            item.device_id, 
            (transfer as any).created_by, 
            tenant_id, 
            transfer.id
          )
          const inEvent = await createDeviceEvents.transferIn(
            item.device_id, 
            payload.actor_id, 
            tenant_id, 
            transfer.id
          )
          if (outEvent) deviceEventsCreated++
          if (inEvent) deviceEventsCreated++
        }
      }

      // Mark transfer as completed
      await this.repo.updateTransferStatus(transfer.id, true, tenant_id, payload.actor_id)

      const result: TransferCompletionResult = {
        transfer_id: transfer.id,
        movements_created: movementsCreated,
        total_items_transferred: totalItemsTransferred,
        total_quantity_transferred: totalQuantityTransferred,
        from_warehouse_id: transfer.from_warehouse_id,
        to_warehouse_id: transfer.to_warehouse_id,
        device_events_created: deviceEventsCreated,
      }

      return { 
        data: result, 
        message: `Transfer completed successfully. ${totalItemsTransferred} items transferred with ${movementsCreated} movements`, 
        status: 200 
      }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to complete transfer', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getTransferSummary(tenant_id?: number): Promise<response<TransferSummary | null>> {
    try {
      const summary = await this.repo.getTransferSummary(tenant_id)
      return { data: summary, message: 'OK', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to get transfer summary', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async deleteTransfer(id: number, tenant_id?: number): Promise<response<{ id: number } | null>> {
    try {
      // Check if transfer exists and belongs to tenant
      const transfer = await this.repo.findTransferById(id, tenant_id)
      if (!transfer) {
        return { data: null, message: 'Transfer not found', status: 404 }
      }

      if (typeof tenant_id === 'number' && transfer.tenant_id !== tenant_id) {
        return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
      }

      // Check if transfer is completed
      if (transfer.status === true) {
        return { 
          data: null, 
          message: 'Cannot delete completed transfer. Stock movements have been created.', 
          status: 400 
        }
      }

      await this.repo.deleteTransfer(id, tenant_id)
      return { data: { id }, message: 'Transfer deleted successfully', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to delete transfer', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async getPendingTransfers(tenant_id?: number): Promise<response<TransferWithDetails[]>> {
    try {
      const result = await this.repo.findAllTransfers({ 
        status: 'false', // Pending transfers
        tenant_id 
      })
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
        message: 'Failed to fetch pending transfers', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }

  async findDeviceByImeiOrSerial(identifier: string, tenant_id?: number): Promise<response<any | null>> {
    try {
      const device = await this.repo.findDeviceByImeiOrSerial(identifier, tenant_id)
      if (!device) {
        return { data: null, message: 'Device not found', status: 404 }
      }
      return { data: device, message: 'Device found', status: 200 }
    } catch (error) {
      return { 
        data: null, 
        message: 'Failed to find device', 
        status: 500, 
        error: (error as Error).message 
      }
    }
  }
}
