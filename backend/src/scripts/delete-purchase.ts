import { db } from '../db'
import { purchases, purchase_items, received_items, stock_movements, device_events, stock } from '../db/circtek.schema'
import { and, eq, sql } from 'drizzle-orm'

/**
 * Delete a purchase order and reverse all associated operations
 * 
 * This script will:
 * 1. Find and delete all received_items for the purchase
 * 2. Find and delete all purchase_items for the purchase
 * 3. Find and reverse all stock_movements (reduce stock counts)
 * 4. Find and delete all device_events related to the purchase
 * 5. Delete the purchase record itself
 * 
 * Usage:
 *   bun run src/scripts/delete-purchase.ts <purchase-id> <tenant-id> [--dry-run]
 * 
 * Example:
 *   bun run src/scripts/delete-purchase.ts 123 1
 *   bun run src/scripts/delete-purchase.ts 123 1 --dry-run
 * 
 * Arguments:
 *   purchase-id: The ID of the purchase to delete
 *   tenant-id: The tenant ID (for security verification)
 *   --dry-run: Optional flag to preview what would be deleted without making changes
 */

interface DeleteStats {
  purchaseId: number
  purchaseOrderNo: string
  receivedItemsDeleted: number
  purchaseItemsDeleted: number
  stockMovementsReversed: number
  deviceEventsDeleted: number
  stockAdjustments: Array<{ sku: string; warehouse_id: number; delta: number }>
  success: boolean
  error?: string
}

async function deletePurchase(purchaseId: number, tenantId: number, dryRun: boolean = false): Promise<DeleteStats> {
  const stats: DeleteStats = {
    purchaseId,
    purchaseOrderNo: '',
    receivedItemsDeleted: 0,
    purchaseItemsDeleted: 0,
    stockMovementsReversed: 0,
    deviceEventsDeleted: 0,
    stockAdjustments: [],
    success: false,
  }

 
 
 
 
 
 
 

  try {
    // Step 1: Verify purchase exists and belongs to tenant
   
    const [purchase] = await db
      .select()
      .from(purchases)
      .where(and(
        eq(purchases.id, purchaseId),
        eq(purchases.tenant_id, tenantId)
      ))

    if (!purchase) {
      throw new Error(`Purchase #${purchaseId} not found for tenant #${tenantId}`)
    }

    stats.purchaseOrderNo = purchase.purchase_order_no
   
   
   
   

    // Step 2: Find and collect received items
   
    const receivedItemsList = await db
      .select()
      .from(received_items)
      .where(and(
        eq(received_items.purchase_id, purchaseId),
        eq(received_items.tenant_id, tenantId)
      ))

   

    // Step 3: Find stock movements related to this purchase
   
    const movements = await db
      .select()
      .from(stock_movements)
      .where(and(
        eq(stock_movements.ref_type, 'received_items'),
        eq(stock_movements.ref_id, purchaseId),
        eq(stock_movements.tenant_id, tenantId)
      ))

   

    // Step 4: Find device events related to this purchase
   
    const deviceIds = receivedItemsList
      .filter(item => item.device_id !== null)
      .map(item => item.device_id as number)

    let deviceEventsList: any[] = []
    if (deviceIds.length > 0) {
      // Find device events where details contains purchase_id
      const allDeviceEvents = await db
        .select()
        .from(device_events)
        .where(eq(device_events.tenant_id, tenantId))

      deviceEventsList = allDeviceEvents.filter((event: any) => {
        if (deviceIds.includes(event.device_id)) {
          const details = event.details as any
          return details?.purchase_id === purchaseId || details?.action === 'purchase_received'
        }
        return false
      })
    }

   

    // Step 5: Find purchase items
   
    const purchaseItemsList = await db
      .select()
      .from(purchase_items)
      .where(and(
        eq(purchase_items.purchase_id, purchaseId),
        eq(purchase_items.tenant_id, tenantId)
      ))

   

    // Display what will be done
   
   
   
   
   
   
   
    
    if (receivedItemsList.length > 0) {
     
      receivedItemsList.forEach((item, idx) => {
       
      })
    }

    if (movements.length > 0) {
     
      movements.forEach((movement, idx) => {
       
        stats.stockAdjustments.push({
          sku: movement.sku!,
          warehouse_id: movement.warehouse_id,
          delta: -movement.delta // Reverse the delta
        })
      })
    }

   

    if (dryRun) {
     
      stats.receivedItemsDeleted = receivedItemsList.length
      stats.purchaseItemsDeleted = purchaseItemsList.length
      stats.stockMovementsReversed = movements.length
      stats.deviceEventsDeleted = deviceEventsList.length
      stats.success = true
      return stats
    }

    // Execute deletions in correct order (reverse of creation)

    // Step 6: Delete device events
    if (deviceEventsList.length > 0) {
     
      for (const event of deviceEventsList) {
        await db
          .delete(device_events)
          .where(eq(device_events.id, event.id))
        stats.deviceEventsDeleted++
      }
     
    }

    // Step 7: Reverse stock movements (reduce stock counts)
    if (movements.length > 0) {
     
      for (const movement of movements) {
        if (movement.sku) {
          // Reduce stock by the original delta amount
          await db
            .update(stock)
            .set({
              quantity: sql`${stock.quantity} - ${movement.delta}`
            })
            .where(and(
              eq(stock.sku, movement.sku),
              eq(stock.warehouse_id, movement.warehouse_id),
              eq(stock.tenant_id, tenantId)
            ))

         

          // Delete the stock movement record
          await db
            .delete(stock_movements)
            .where(eq(stock_movements.id, movement.id))
          
          stats.stockMovementsReversed++
        }
      }
     
    }

    // Step 8: Delete received items
    if (receivedItemsList.length > 0) {
     
      const deleteResult = await db
        .delete(received_items)
        .where(and(
          eq(received_items.purchase_id, purchaseId),
          eq(received_items.tenant_id, tenantId)
        ))
      stats.receivedItemsDeleted = receivedItemsList.length
     
    }

    // Step 9: Delete purchase items
    if (purchaseItemsList.length > 0) {
     
      const deleteResult = await db
        .delete(purchase_items)
        .where(and(
          eq(purchase_items.purchase_id, purchaseId),
          eq(purchase_items.tenant_id, tenantId)
        ))
      stats.purchaseItemsDeleted = purchaseItemsList.length
     
    }

    // Step 10: Delete the purchase itself
   
    await db
      .delete(purchases)
      .where(and(
        eq(purchases.id, purchaseId),
        eq(purchases.tenant_id, tenantId)
      ))
   

    stats.success = true

    // Print final summary
   
   
   
   
   
   
   
   
   
   

    return stats
  } catch (error) {
    stats.error = error instanceof Error ? error.message : String(error)
    stats.success = false
    console.error(`\n✗ Error: ${stats.error}\n`)
    throw error
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.error('Error: Missing required arguments')
    console.error('\nUsage: bun run src/scripts/delete-purchase.ts <purchase-id> <tenant-id> [--dry-run]')
    console.error('\nExample:')
    console.error('  bun run src/scripts/delete-purchase.ts 123 1')
    console.error('  bun run src/scripts/delete-purchase.ts 123 1 --dry-run')
    console.error('\nArguments:')
    console.error('  purchase-id: The ID of the purchase to delete')
    console.error('  tenant-id: The tenant ID (for security verification)')
    console.error('  --dry-run: Preview what would be deleted without making changes')
    process.exit(1)
  }

  const purchaseId = parseInt(args[0], 10)
  const tenantId = parseInt(args[1], 10)
  const dryRun = args.includes('--dry-run')

  if (isNaN(purchaseId) || isNaN(tenantId)) {
    console.error('Error: purchase-id and tenant-id must be valid numbers')
    process.exit(1)
  }

  try {
    const stats = await deletePurchase(purchaseId, tenantId, dryRun)
    
    if (stats.success) {
     
      process.exit(0)
    } else {
      console.error('\n✗ Script completed with errors')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n✗ Script failed:', error)
    process.exit(1)
  }
}

main()
