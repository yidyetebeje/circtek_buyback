import { db } from '../db'
import { purchases, purchase_items, received_items, stock_movements, device_events, stock } from '../db/circtek.schema'
import { and, eq, sql, inArray } from 'drizzle-orm'

/**
 * Delete multiple purchase orders and reverse all associated operations
 * 
 * This script will delete multiple purchases in batch by:
 * 1. Deleting all received_items for the purchases
 * 2. Deleting all purchase_items for the purchases
 * 3. Reversing all stock_movements (reducing stock counts)
 * 4. Deleting all device_events related to the purchases
 * 5. Deleting the purchase records themselves
 * 
 * Usage:
 *   bun run src/scripts/delete-purchases-batch.ts <tenant-id> <purchase-ids...> [--dry-run]
 * 
 * Example:
 *   bun run src/scripts/delete-purchases-batch.ts 1 123 124 125
 *   bun run src/scripts/delete-purchases-batch.ts 1 123 124 125 --dry-run
 * 
 * Arguments:
 *   tenant-id: The tenant ID (for security verification)
 *   purchase-ids: Space-separated list of purchase IDs to delete
 *   --dry-run: Optional flag to preview what would be deleted without making changes
 */

interface PurchaseDeleteStats {
  purchaseId: number
  purchaseOrderNo: string
  receivedItemsDeleted: number
  purchaseItemsDeleted: number
  stockMovementsReversed: number
  deviceEventsDeleted: number
  success: boolean
  error?: string
}

interface BatchStats {
  totalPurchases: number
  successfulDeletions: number
  failedDeletions: number
  totalReceivedItemsDeleted: number
  totalPurchaseItemsDeleted: number
  totalStockMovementsReversed: number
  totalDeviceEventsDeleted: number
  details: PurchaseDeleteStats[]
}

async function deleteSinglePurchase(
  purchaseId: number, 
  tenantId: number, 
  dryRun: boolean
): Promise<PurchaseDeleteStats> {
  const stats: PurchaseDeleteStats = {
    purchaseId,
    purchaseOrderNo: '',
    receivedItemsDeleted: 0,
    purchaseItemsDeleted: 0,
    stockMovementsReversed: 0,
    deviceEventsDeleted: 0,
    success: false,
  }

  try {
    // Verify purchase exists
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

    // Get received items
    const receivedItemsList = await db
      .select()
      .from(received_items)
      .where(and(
        eq(received_items.purchase_id, purchaseId),
        eq(received_items.tenant_id, tenantId)
      ))

    // Get stock movements
    const movements = await db
      .select()
      .from(stock_movements)
      .where(and(
        eq(stock_movements.ref_type, 'received_items'),
        eq(stock_movements.ref_id, purchaseId),
        eq(stock_movements.tenant_id, tenantId)
      ))

    // Get device events
    const deviceIds = receivedItemsList
      .filter(item => item.device_id !== null)
      .map(item => item.device_id as number)

    let deviceEventsList: any[] = []
    if (deviceIds.length > 0) {
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

    // Get purchase items
    const purchaseItemsList = await db
      .select()
      .from(purchase_items)
      .where(and(
        eq(purchase_items.purchase_id, purchaseId),
        eq(purchase_items.tenant_id, tenantId)
      ))

    if (dryRun) {
      stats.receivedItemsDeleted = receivedItemsList.length
      stats.purchaseItemsDeleted = purchaseItemsList.length
      stats.stockMovementsReversed = movements.length
      stats.deviceEventsDeleted = deviceEventsList.length
      stats.success = true
      return stats
    }

    // Execute deletions

    // Delete device events
    for (const event of deviceEventsList) {
      await db
        .delete(device_events)
        .where(eq(device_events.id, event.id))
      stats.deviceEventsDeleted++
    }

    // Reverse stock movements
    for (const movement of movements) {
      if (movement.sku) {
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

        await db
          .delete(stock_movements)
          .where(eq(stock_movements.id, movement.id))
        
        stats.stockMovementsReversed++
      }
    }

    // Delete received items
    if (receivedItemsList.length > 0) {
      await db
        .delete(received_items)
        .where(and(
          eq(received_items.purchase_id, purchaseId),
          eq(received_items.tenant_id, tenantId)
        ))
      stats.receivedItemsDeleted = receivedItemsList.length
    }

    // Delete purchase items
    if (purchaseItemsList.length > 0) {
      await db
        .delete(purchase_items)
        .where(and(
          eq(purchase_items.purchase_id, purchaseId),
          eq(purchase_items.tenant_id, tenantId)
        ))
      stats.purchaseItemsDeleted = purchaseItemsList.length
    }

    // Delete purchase
    await db
      .delete(purchases)
      .where(and(
        eq(purchases.id, purchaseId),
        eq(purchases.tenant_id, tenantId)
      ))

    stats.success = true
    return stats

  } catch (error) {
    stats.error = error instanceof Error ? error.message : String(error)
    stats.success = false
    return stats
  }
}

async function deletePurchasesBatch(
  purchaseIds: number[], 
  tenantId: number, 
  dryRun: boolean = false
): Promise<BatchStats> {
  const batchStats: BatchStats = {
    totalPurchases: purchaseIds.length,
    successfulDeletions: 0,
    failedDeletions: 0,
    totalReceivedItemsDeleted: 0,
    totalPurchaseItemsDeleted: 0,
    totalStockMovementsReversed: 0,
    totalDeviceEventsDeleted: 0,
    details: []
  }

 
 
 
 
 
 
 
 

  for (let i = 0; i < purchaseIds.length; i++) {
    const purchaseId = purchaseIds[i]
    
   
   
   

    try {
      const stats = await deleteSinglePurchase(purchaseId, tenantId, dryRun)
      batchStats.details.push(stats)

      if (stats.success) {
       
       
       
       
       
       

        batchStats.successfulDeletions++
        batchStats.totalReceivedItemsDeleted += stats.receivedItemsDeleted
        batchStats.totalPurchaseItemsDeleted += stats.purchaseItemsDeleted
        batchStats.totalStockMovementsReversed += stats.stockMovementsReversed
        batchStats.totalDeviceEventsDeleted += stats.deviceEventsDeleted
      } else {
       
       
       
        batchStats.failedDeletions++
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`✗ Error processing purchase #${purchaseId}: ${errorMsg}`)
      
      batchStats.details.push({
        purchaseId,
        purchaseOrderNo: '',
        receivedItemsDeleted: 0,
        purchaseItemsDeleted: 0,
        stockMovementsReversed: 0,
        deviceEventsDeleted: 0,
        success: false,
        error: errorMsg
      })
      batchStats.failedDeletions++
    }
  }

  // Print final summary
 
 
 
 
 
 
 
 
 
 

  if (batchStats.failedDeletions > 0) {
   
   
   
    batchStats.details
      .filter(d => !d.success)
      .forEach(detail => {
       
      })
  }

 

  return batchStats
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.error('Error: Missing required arguments')
    console.error('\nUsage: bun run src/scripts/delete-purchases-batch.ts <tenant-id> <purchase-ids...> [--dry-run]')
    console.error('\nExample:')
    console.error('  bun run src/scripts/delete-purchases-batch.ts 1 123 124 125')
    console.error('  bun run src/scripts/delete-purchases-batch.ts 1 123 124 125 --dry-run')
    console.error('\nArguments:')
    console.error('  tenant-id: The tenant ID (for security verification)')
    console.error('  purchase-ids: Space-separated list of purchase IDs to delete')
    console.error('  --dry-run: Preview what would be deleted without making changes')
    process.exit(1)
  }

  const tenantId = parseInt(args[0], 10)
  const dryRun = args.includes('--dry-run')
  
  // Get all purchase IDs (excluding tenant-id and --dry-run flag)
  const purchaseIds = args
    .slice(1)
    .filter(arg => arg !== '--dry-run')
    .map(id => parseInt(id, 10))

  if (isNaN(tenantId)) {
    console.error('Error: tenant-id must be a valid number')
    process.exit(1)
  }

  if (purchaseIds.length === 0) {
    console.error('Error: No purchase IDs provided')
    process.exit(1)
  }

  if (purchaseIds.some(id => isNaN(id))) {
    console.error('Error: All purchase IDs must be valid numbers')
    process.exit(1)
  }

  try {
    const stats = await deletePurchasesBatch(purchaseIds, tenantId, dryRun)
    
    if (stats.failedDeletions === 0) {
     
      process.exit(0)
    } else {
      console.error(`\n⚠ Batch script completed with ${stats.failedDeletions} failures`)
      process.exit(1)
    }
  } catch (error) {
    console.error('\n✗ Batch script failed:', error)
    process.exit(1)
  }
}

main()
