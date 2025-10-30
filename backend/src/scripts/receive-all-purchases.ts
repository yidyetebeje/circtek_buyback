import { db } from '../db'
import { PurchasesRepository } from '../stock/purchases/repository'
import { PurchasesController } from '../stock/purchases/controller'

/**
 * Receive all items from purchases that are not yet fully received
 * 
 * Usage:
 *   bun run src/scripts/receive-all-purchases.ts <tenant-id> <actor-id> [--dry-run]
 * 
 * Example:
 *   bun run src/scripts/receive-all-purchases.ts 1 1
 *   bun run src/scripts/receive-all-purchases.ts 1 1 --dry-run
 * 
 * Arguments:
 *   tenant-id: The tenant ID to process purchases for
 *   actor-id: The user ID who will be recorded as receiving the items
 *   --dry-run: Optional flag to preview what would be received without making changes
 */

interface ReceiveStats {
  totalPurchases: number
  processedPurchases: number
  skippedPurchases: number
  totalItemsReceived: number
  errors: Array<{ purchaseId: number; purchaseOrderNo: string; error: string }>
}

async function receiveAllPurchases(tenantId: number, actorId: number, dryRun: boolean = false): Promise<ReceiveStats> {
  const repo = new PurchasesRepository(db)
  const controller = new PurchasesController(repo)
  
  const stats: ReceiveStats = {
    totalPurchases: 0,
    processedPurchases: 0,
    skippedPurchases: 0,
    totalItemsReceived: 0,
    errors: []
  }

 
 
 
 
 
 
 

  try {
    // Fetch all purchases with items
   
    const result = await repo.findAllPurchasesWithItems({ 
      tenant_id: tenantId,
      limit: 1000, // Get a large batch
      page: 1 
    })

    const allPurchases = result.rows
    stats.totalPurchases = allPurchases.length
    
   

    // Filter for purchases that are not fully received
    const unreceived = allPurchases.filter(p => {
      const totalItems = p.items.reduce((sum, item) => sum + item.quantity, 0)
      const totalReceived = p.items.reduce((sum, item) => sum + item.received_quantity, 0)
      return totalReceived < totalItems
    })

   

    if (unreceived.length === 0) {
     
      return stats
    }

    // Process each unreceived purchase
    for (const purchaseData of unreceived) {
      const purchase = purchaseData.purchase
      const items = purchaseData.items

     
     
     
     
     

      try {
        // Build the receive items payload
        const itemsToReceive = items
          .filter(item => item.remaining_quantity > 0 && item.sku !== null)
          .map(item => ({
            purchase_item_id: item.id,
            sku: item.sku as string, // Safe because we filtered out nulls
            quantity_received: item.remaining_quantity
          }))

        if (itemsToReceive.length === 0) {
         
          stats.skippedPurchases++
          continue
        }

       
        itemsToReceive.forEach(item => {
         
        })

        const totalQuantity = itemsToReceive.reduce((sum, item) => sum + item.quantity_received, 0)
       

        if (dryRun) {
         
          stats.processedPurchases++
          stats.totalItemsReceived += totalQuantity
        } else {
          // Actually receive the items
          const receiveResult = await controller.receiveItems({
            purchase_id: purchase.id,
            actor_id: actorId,
            warehouse_id: purchase.warehouse_id,
            items: itemsToReceive
          }, tenantId)

          if (receiveResult.status === 200 && receiveResult.data) {
           
           
            stats.processedPurchases++
            stats.totalItemsReceived += receiveResult.data.total_quantity_received
          } else {
            throw new Error(receiveResult.message || 'Failed to receive items')
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`✗ Error processing purchase #${purchase.id}: ${errorMessage}`)
        stats.errors.push({
          purchaseId: purchase.id,
          purchaseOrderNo: purchase.purchase_order_no,
          error: errorMessage
        })
      }
    }

    // Print summary
   
   
   
   
   
   
   
   
   
    
    if (stats.errors.length > 0) {
     
     
     
      stats.errors.forEach(err => {
       
      })
    }
    
   

    return stats
  } catch (error) {
    console.error('\n✗ Fatal error:', error)
    throw error
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.error('Error: Missing required arguments')
    console.error('\nUsage: bun run src/scripts/receive-all-purchases.ts <tenant-id> <actor-id> [--dry-run]')
    console.error('\nExample:')
    console.error('  bun run src/scripts/receive-all-purchases.ts 1 1')
    console.error('  bun run src/scripts/receive-all-purchases.ts 1 1 --dry-run')
    process.exit(1)
  }

  const tenantId = parseInt(args[0], 10)
  const actorId = parseInt(args[1], 10)
  const dryRun = args.includes('--dry-run')

  if (isNaN(tenantId) || isNaN(actorId)) {
    console.error('Error: tenant-id and actor-id must be valid numbers')
    process.exit(1)
  }

  try {
    await receiveAllPurchases(tenantId, actorId, dryRun)
   
    process.exit(0)
  } catch (error) {
    console.error('\n✗ Script failed:', error)
    process.exit(1)
  }
}

main()
