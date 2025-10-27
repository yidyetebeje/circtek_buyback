import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { db } from '../db'
import { stock } from '../db/circtek.schema'
import { eq, and } from 'drizzle-orm'

/**
 * Reset stock quantities from a CSV file for a specific warehouse
 * 
 * CSV Format: SKU,quantity
 * 
 * Usage:
 *   bun run src/scripts/reset-stock-from-csv.ts <csv-file-path> <warehouse-id> <tenant-id> [--dry-run]
 * 
 * Example:
 *   bun run src/scripts/reset-stock-from-csv.ts part_copied\ -\ stock.csv 1 2
 *   bun run src/scripts/reset-stock-from-csv.ts part_copied\ -\ stock.csv 1 2 --dry-run
 * 
 * Arguments:
 *   csv-file-path: Path to the CSV file (relative to backend directory)
 *   warehouse-id: The warehouse ID to update stock for
 *   tenant-id: The tenant ID
 *   --dry-run: Optional flag to preview what would be updated without making changes
 */

interface StockItem {
  sku: string
  quantity: number
}

interface UpdateStats {
  totalItems: number
  created: number
  updated: number
  skipped: number
  errors: Array<{ sku: string; error: string }>
}

/**
 * Parse CSV file
 */
async function parseCSV(filePath: string): Promise<StockItem[]> {
  const content = await readFile(filePath, 'utf-8')
  const lines = content.split(/\r?\n/).filter(line => line.trim())
  
  // Skip header row
  const dataLines = lines.slice(1)
  
  const items: StockItem[] = []
  
  for (const line of dataLines) {
    const [sku, quantity] = line.split(',').map(s => s.trim())
    
    if (!sku || quantity === undefined || quantity === '') {
      console.warn(`⚠ Skipping invalid line: ${line}`)
      continue
    }
    
    const parsedQuantity = parseInt(quantity, 10)
    
    if (isNaN(parsedQuantity)) {
      console.warn(`⚠ Skipping invalid quantity for SKU ${sku}: ${quantity}`)
      continue
    }
    
    items.push({
      sku,
      quantity: parsedQuantity
    })
  }
  
  return items
}

/**
 * Get existing stock record
 */
async function getExistingStock(sku: string, warehouseId: number, tenantId: number) {
  const result = await db
    .select()
    .from(stock)
    .where(
      and(
        eq(stock.sku, sku),
        eq(stock.warehouse_id, warehouseId),
        eq(stock.tenant_id, tenantId)
      )
    )
    .limit(1)
  
  return result.length > 0 ? result[0] : null
}

/**
 * Create new stock record
 */
async function createStock(sku: string, quantity: number, warehouseId: number, tenantId: number): Promise<void> {
  await db.insert(stock).values({
    sku,
    quantity,
    warehouse_id: warehouseId,
    tenant_id: tenantId,
    is_part: true,
    status: true
  })
}

/**
 * Update existing stock record
 */
async function updateStock(sku: string, quantity: number, warehouseId: number, tenantId: number): Promise<void> {
  await db
    .update(stock)
    .set({ 
      quantity,
      updated_at: new Date()
    })
    .where(
      and(
        eq(stock.sku, sku),
        eq(stock.warehouse_id, warehouseId),
        eq(stock.tenant_id, tenantId)
      )
    )
}

/**
 * Reset stock from CSV
 */
async function resetStock(
  csvPath: string,
  warehouseId: number,
  tenantId: number,
  dryRun: boolean
): Promise<UpdateStats> {
  const stats: UpdateStats = {
    totalItems: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  }
  
  console.log(`\n${'='.repeat(70)}`)
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Resetting Stock from CSV`)
  console.log(`${'='.repeat(70)}`)
  console.log(`CSV File: ${csvPath}`)
  console.log(`Warehouse ID: ${warehouseId}`)
  console.log(`Tenant ID: ${tenantId}`)
  console.log(`${dryRun ? 'Mode: DRY RUN (no database changes will be made)' : 'Mode: LIVE'}`)
  console.log(`${'='.repeat(70)}\n`)
  
  // Parse CSV
  console.log('📖 Parsing CSV file...')
  const items = await parseCSV(csvPath)
  stats.totalItems = items.length
  
  console.log(`✓ Found ${stats.totalItems} items\n`)
  
  // Process each item
  for (const item of items) {
    try {
      // Check if stock record exists
      const existingStock = await getExistingStock(item.sku, warehouseId, tenantId)
      
      if (existingStock) {
        if (existingStock.quantity === item.quantity) {
          console.log(`⊘ ${item.sku}: Already ${item.quantity} (no change needed)`)
          stats.skipped++
        } else {
          console.log(`↻ ${item.sku}: ${existingStock.quantity} → ${item.quantity}`)
          
          if (!dryRun) {
            await updateStock(item.sku, item.quantity, warehouseId, tenantId)
          }
          
          stats.updated++
        }
      } else {
        console.log(`+ ${item.sku}: Creating with quantity ${item.quantity}`)
        
        if (!dryRun) {
          await createStock(item.sku, item.quantity, warehouseId, tenantId)
        }
        
        stats.created++
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`✗ ${item.sku}: Error - ${errorMessage}`)
      stats.errors.push({
        sku: item.sku,
        error: errorMessage
      })
    }
  }
  
  // Print summary
  console.log(`\n\n${'='.repeat(70)}`)
  console.log('Summary')
  console.log(`${'='.repeat(70)}`)
  console.log(`Total Items: ${stats.totalItems}`)
  console.log(`Created: ${stats.created}`)
  console.log(`Updated: ${stats.updated}`)
  console.log(`Skipped (no change): ${stats.skipped}`)
  console.log(`Errors: ${stats.errors.length}`)
  
  if (stats.errors.length > 0) {
    console.log(`\n${'─'.repeat(70)}`)
    console.log('Errors:')
    console.log(`${'─'.repeat(70)}`)
    stats.errors.forEach(err => {
      console.log(`${err.sku}: ${err.error}`)
    })
  }
  
  console.log(`${'='.repeat(70)}\n`)
  
  return stats
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 3) {
    console.error('Error: Missing required arguments')
    console.error('Usage: bun run src/scripts/reset-stock-from-csv.ts <csv-file-path> <warehouse-id> <tenant-id> [--dry-run]')
    console.error('Example: bun run src/scripts/reset-stock-from-csv.ts part_copied\\ -\\ stock.csv 1 2')
    process.exit(1)
  }
  
  const csvPath = path.resolve(process.cwd(), args[0])
  const warehouseId = parseInt(args[1], 10)
  const tenantId = parseInt(args[2], 10)
  
  // Parse optional flags
  let dryRun = false
  
  for (let i = 3; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--dry-run') {
      dryRun = true
    }
  }
  
  if (isNaN(warehouseId) || isNaN(tenantId)) {
    console.error('Error: warehouse-id and tenant-id must be valid numbers')
    process.exit(1)
  }
  
  try {
    await resetStock(csvPath, warehouseId, tenantId, dryRun)
    console.log('✓ Script completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('\n✗ Script failed:', error)
    process.exit(1)
  }
}

main()
