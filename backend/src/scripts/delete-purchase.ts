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

  console.log(`\n${'='.repeat(70)}`)
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Deleting Purchase Entry`)
  console.log(`${'='.repeat(70)}`)
  console.log(`Purchase ID: ${purchaseId}`)
  console.log(`Tenant ID: ${tenantId}`)
  console.log(`${dryRun ? 'Mode: DRY RUN (no changes will be made)' : 'Mode: LIVE'}`)
  console.log(`${'='.repeat(70)}\n`)

  try {
    // Step 1: Verify purchase exists and belongs to tenant
    console.log('Step 1: Verifying purchase exists...')
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
    console.log(`✓ Found purchase: ${purchase.purchase_order_no}`)
    console.log(`  Supplier: ${purchase.supplier_name}`)
    console.log(`  Warehouse ID: ${purchase.warehouse_id}`)
    console.log(`  Created: ${purchase.created_at}\n`)

    // Step 2: Find and collect received items
    console.log('Step 2: Finding received items...')
    const receivedItemsList = await db
      .select()
      .from(received_items)
      .where(and(
        eq(received_items.purchase_id, purchaseId),
        eq(received_items.tenant_id, tenantId)
      ))

    console.log(`✓ Found ${receivedItemsList.length} received items\n`)

    // Step 3: Find stock movements related to this purchase
    console.log('Step 3: Finding stock movements...')
    const movements = await db
      .select()
      .from(stock_movements)
      .where(and(
        eq(stock_movements.ref_type, 'received_items'),
        eq(stock_movements.ref_id, purchaseId),
        eq(stock_movements.tenant_id, tenantId)
      ))

    console.log(`✓ Found ${movements.length} stock movements\n`)

    // Step 4: Find device events related to this purchase
    console.log('Step 4: Finding device events...')
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

    console.log(`✓ Found ${deviceEventsList.length} device events\n`)

    // Step 5: Find purchase items
    console.log('Step 5: Finding purchase items...')
    const purchaseItemsList = await db
      .select()
      .from(purchase_items)
      .where(and(
        eq(purchase_items.purchase_id, purchaseId),
        eq(purchase_items.tenant_id, tenantId)
      ))

    console.log(`✓ Found ${purchaseItemsList.length} purchase items\n`)

    // Display what will be done
    console.log(`${'─'.repeat(70)}`)
    console.log('Summary of operations:')
    console.log(`${'─'.repeat(70)}`)
    console.log(`Received items to delete: ${receivedItemsList.length}`)
    console.log(`Purchase items to delete: ${purchaseItemsList.length}`)
    console.log(`Stock movements to reverse: ${movements.length}`)
    console.log(`Device events to delete: ${deviceEventsList.length}`)
    
    if (receivedItemsList.length > 0) {
      console.log(`\nReceived items details:`)
      receivedItemsList.forEach((item, idx) => {
        console.log(`  ${idx + 1}. SKU: ${item.sku}, Qty: ${item.quantity}, Device ID: ${item.device_id || 'N/A'}`)
      })
    }

    if (movements.length > 0) {
      console.log(`\nStock movements to reverse:`)
      movements.forEach((movement, idx) => {
        console.log(`  ${idx + 1}. SKU: ${movement.sku}, Warehouse: ${movement.warehouse_id}, Delta: ${movement.delta}`)
        stats.stockAdjustments.push({
          sku: movement.sku!,
          warehouse_id: movement.warehouse_id,
          delta: -movement.delta // Reverse the delta
        })
      })
    }

    console.log(`\n${'─'.repeat(70)}\n`)

    if (dryRun) {
      console.log('⊘ [DRY RUN] Skipping actual deletion operations\n')
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
      console.log('Step 6: Deleting device events...')
      for (const event of deviceEventsList) {
        await db
          .delete(device_events)
          .where(eq(device_events.id, event.id))
        stats.deviceEventsDeleted++
      }
      console.log(`✓ Deleted ${stats.deviceEventsDeleted} device events\n`)
    }

    // Step 7: Reverse stock movements (reduce stock counts)
    if (movements.length > 0) {
      console.log('Step 7: Reversing stock movements...')
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

          console.log(`  ✓ Reduced stock for SKU ${movement.sku} by ${movement.delta}`)

          // Delete the stock movement record
          await db
            .delete(stock_movements)
            .where(eq(stock_movements.id, movement.id))
          
          stats.stockMovementsReversed++
        }
      }
      console.log(`✓ Reversed ${stats.stockMovementsReversed} stock movements\n`)
    }

    // Step 8: Delete received items
    if (receivedItemsList.length > 0) {
      console.log('Step 8: Deleting received items...')
      const deleteResult = await db
        .delete(received_items)
        .where(and(
          eq(received_items.purchase_id, purchaseId),
          eq(received_items.tenant_id, tenantId)
        ))
      stats.receivedItemsDeleted = receivedItemsList.length
      console.log(`✓ Deleted ${stats.receivedItemsDeleted} received items\n`)
    }

    // Step 9: Delete purchase items
    if (purchaseItemsList.length > 0) {
      console.log('Step 9: Deleting purchase items...')
      const deleteResult = await db
        .delete(purchase_items)
        .where(and(
          eq(purchase_items.purchase_id, purchaseId),
          eq(purchase_items.tenant_id, tenantId)
        ))
      stats.purchaseItemsDeleted = purchaseItemsList.length
      console.log(`✓ Deleted ${stats.purchaseItemsDeleted} purchase items\n`)
    }

    // Step 10: Delete the purchase itself
    console.log('Step 10: Deleting purchase...')
    await db
      .delete(purchases)
      .where(and(
        eq(purchases.id, purchaseId),
        eq(purchases.tenant_id, tenantId)
      ))
    console.log(`✓ Deleted purchase #${purchaseId}\n`)

    stats.success = true

    // Print final summary
    console.log(`${'='.repeat(70)}`)
    console.log('Deletion Summary')
    console.log(`${'='.repeat(70)}`)
    console.log(`Purchase: ${stats.purchaseOrderNo} (ID: ${purchaseId})`)
    console.log(`Received items deleted: ${stats.receivedItemsDeleted}`)
    console.log(`Purchase items deleted: ${stats.purchaseItemsDeleted}`)
    console.log(`Stock movements reversed: ${stats.stockMovementsReversed}`)
    console.log(`Device events deleted: ${stats.deviceEventsDeleted}`)
    console.log(`Status: ✓ SUCCESS`)
    console.log(`${'='.repeat(70)}\n`)

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
    for(let id = 63; id < 119; id++){
      const stats = await deletePurchase(id, tenantId, dryRun)
    
    if (stats.success) {
      console.log('\n✓ Script completed successfully')
     
    } else {
      console.error('\n✗ Script completed with errors')
     
    }
    }
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Script failed:', error)
    process.exit(1)
  }
}

main()
