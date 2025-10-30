import { db } from '../db'
import { stock } from '../db/circtek.schema'
import { eq, and, sql } from 'drizzle-orm'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Check if stock contains sufficient quantity for parts in repairs.csv
 * 
 * Usage:
 *   bun run src/scripts/check-repair-parts-stock.ts <path-to-csv-file> <tenant-id> [warehouse-id]
 * 
 * Example:
 *   bun run src/scripts/check-repair-parts-stock.ts ./repairs.csv 1
 *   bun run src/scripts/check-repair-parts-stock.ts ./repairs.csv 1 1
 */

interface RepairCSVRecord {
  id: string
  repair_update_create_key: string
  imei: string
  reason: string
  description: string
  partcode: string
  user: string
  repair_number: string
  scan_date: string
  phonecheck_model: string
  phonecheck_memory: string
  repair_dates: string
  warehouse_order_id: string
  warehouse_quantity: string
  created_at: string
  updated_at: string
}

interface PartCodeAggregation {
  sku: string
  count: number
  repairs: string[] // repair_numbers using this part
}

interface StockCheck {
  sku: string
  required: number
  available: number
  sufficient: boolean
  warehouses?: Array<{ warehouse_id: number; warehouse_name: string | null; quantity: number }>
}

/**
 * Proper CSV parser that handles empty fields
 */
function parseCSV(content: string): RepairCSVRecord[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  const headers = parseCSVLine(lines[0])
  const records: RepairCSVRecord[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const record: any = {}
    
    headers.forEach((header, index) => {
      record[header] = values[index] || ''
    })
    
    records.push(record as RepairCSVRecord)
  }
  
  return records
}

/**
 * Parse a single CSV line, properly handling empty fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

/**
 * Aggregate partcodes from CSV records
 */
function aggregatePartCodes(records: RepairCSVRecord[]): PartCodeAggregation[] {
  const aggregation = new Map<string, { count: number; repairs: Set<string> }>()
  
  for (const record of records) {
    const partcode = record.partcode?.trim()
    
    // Skip empty partcodes
    if (!partcode) continue
    
    if (!aggregation.has(partcode)) {
      aggregation.set(partcode, { count: 0, repairs: new Set() })
    }
    
    const agg = aggregation.get(partcode)!
    agg.count++
    if (record.repair_number) {
      agg.repairs.add(record.repair_number)
    }
  }
  
  // Convert to array and sort by count descending
  return Array.from(aggregation.entries())
    .map(([sku, data]) => ({
      sku,
      count: data.count,
      repairs: Array.from(data.repairs),
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Check stock for a SKU (with optional warehouse filter)
 */
async function checkStockForSku(
  sku: string,
  tenantId: number,
  warehouseId?: number
): Promise<StockCheck> {
  // If warehouse is specified, check only that warehouse
  if (warehouseId !== undefined) {
    const [stockRecord] = await db
      .select({
        quantity: stock.quantity,
      })
      .from(stock)
      .where(and(
        eq(stock.sku, sku),
        eq(stock.tenant_id, tenantId),
        eq(stock.warehouse_id, warehouseId)
      ))
      .limit(1)
    
    const available = stockRecord?.quantity || 0
    
    return {
      sku,
      required: 0, // Will be set later
      available,
      sufficient: false, // Will be calculated later
    }
  }
  
  // Otherwise, check all warehouses for this tenant
  const stockRecords = await db
    .select({
      warehouse_id: stock.warehouse_id,
      quantity: stock.quantity,
    })
    .from(stock)
    .where(and(
      eq(stock.sku, sku),
      eq(stock.tenant_id, tenantId)
    ))
  
  const totalAvailable = stockRecords.reduce((sum, record) => sum + (record.quantity || 0), 0)
  
  return {
    sku,
    required: 0, // Will be set later
    available: totalAvailable,
    sufficient: false, // Will be calculated later
    warehouses: stockRecords.map(r => ({
      warehouse_id: r.warehouse_id,
      warehouse_name: null, // Could join with warehouses table if needed
      quantity: r.quantity || 0,
    })),
  }
}

/**
 * Check stock availability for all parts
 */
async function checkStockAvailability(
  aggregations: PartCodeAggregation[],
  tenantId: number,
  warehouseId?: number
): Promise<StockCheck[]> {
  const checks: StockCheck[] = []
  
  for (const agg of aggregations) {
    const check = await checkStockForSku(agg.sku, tenantId, warehouseId)
    check.required = agg.count
    check.sufficient = check.available >= check.required
    checks.push(check)
  }
  
  return checks
}

/**
 * Generate CSV for purchase orders
 */
function generatePurchaseCSV(items: StockCheck[], title: string): string {
  const lines: string[] = []
  
  // Title row (as comment)
  lines.push(`# ${title}`)
  lines.push(`# Generated: ${new Date().toISOString()}`)
  lines.push('')
  
  // Header row
  lines.push('SKU,Required Quantity,Current Stock,Shortage,Status,Priority')
  
  // Data rows
  for (const item of items) {
    const shortage = item.required - item.available
    const status = item.available === 0 ? 'NOT_IN_STOCK' : 'INSUFFICIENT'
    const priority = item.available === 0 ? 'HIGH' : 'MEDIUM'
    
    lines.push([
      item.sku,
      item.required,
      item.available,
      shortage,
      status,
      priority,
    ].join(','))
  }
  
  return lines.join('\n')
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error('❌ Error: Missing required arguments')
    console.log('\nUsage:')
    console.log('  bun run src/scripts/check-repair-parts-stock.ts <csv-path> <tenant-id> [warehouse-id]')
    console.log('\nExamples:')
    console.log('  bun run src/scripts/check-repair-parts-stock.ts ./repairs.csv 1')
    console.log('  bun run src/scripts/check-repair-parts-stock.ts ./repairs.csv 1 1')
    console.log('\nNote:')
    console.log('  - If warehouse-id is provided, checks stock only in that warehouse')
    console.log('  - If omitted, checks total stock across all warehouses for the tenant')
    process.exit(1)
  }

  const csvPath = path.resolve(args[0])
  const tenantId = parseInt(args[1], 10)
  const warehouseId = args[2] ? parseInt(args[2], 10) : undefined

  // Validate arguments
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: File not found: ${csvPath}`)
    process.exit(1)
  }

  if (isNaN(tenantId)) {
    console.error('❌ Error: tenant-id must be a valid number')
    process.exit(1)
  }

  if (args[2] && isNaN(warehouseId!)) {
    console.error('❌ Error: warehouse-id must be a valid number')
    process.exit(1)
  }

  console.log('🔍 Checking repair parts stock availability...\n')
  console.log('📋 Configuration:')
  console.log(`   CSV File: ${csvPath}`)
  console.log(`   Tenant ID: ${tenantId}`)
  console.log(`   Warehouse: ${warehouseId !== undefined ? warehouseId : 'All warehouses'}\n`)

  try {
    // Read and parse CSV
    console.log('📂 Reading CSV file...')
    const content = fs.readFileSync(csvPath, 'utf-8')
    const records = parseCSV(content)
    console.log(`✅ Found ${records.length} repair records\n`)

    // Aggregate partcodes
    console.log('📊 Aggregating part codes...')
    const aggregations = aggregatePartCodes(records)
    
    const totalParts = aggregations.reduce((sum, agg) => sum + agg.count, 0)
    const uniqueParts = aggregations.length
    const repairsWithoutParts = records.filter(r => !r.partcode?.trim()).length
    
    console.log(`✅ Found ${totalParts} parts across ${uniqueParts} unique SKUs`)
    console.log(`📝 ${repairsWithoutParts} repairs have no part code (service-only)\n`)

    if (aggregations.length === 0) {
      console.log('ℹ️  No parts to check (all repairs are service-only)')
      process.exit(0)
    }

    // Check stock availability
    console.log('🔍 Checking stock availability...\n')
    const stockChecks = await checkStockAvailability(aggregations, tenantId, warehouseId)

    // Categorize results
    const sufficient = stockChecks.filter(c => c.sufficient)
    const insufficient = stockChecks.filter(c => !c.sufficient)
    const notFound = insufficient.filter(c => c.available === 0)
    const partialStock = insufficient.filter(c => c.available > 0)

    // Display results
    console.log('='.repeat(80))
    console.log('📊 STOCK AVAILABILITY REPORT')
    console.log('='.repeat(80))
    console.log(`✅ Sufficient Stock: ${sufficient.length} SKUs`)
    console.log(`⚠️  Insufficient Stock: ${partialStock.length} SKUs`)
    console.log(`❌ Not in Stock: ${notFound.length} SKUs`)
    console.log('='.repeat(80))

    // Show sufficient stock
    if (sufficient.length > 0) {
      console.log('\n✅ SUFFICIENT STOCK:')
      console.log('-'.repeat(80))
      for (const check of sufficient.slice(0, 10)) {
        console.log(`   ${check.sku}: Required=${check.required}, Available=${check.available}`)
      }
      if (sufficient.length > 10) {
        console.log(`   ... and ${sufficient.length - 10} more SKUs with sufficient stock`)
      }
    }

    // Show insufficient stock (partial)
    if (partialStock.length > 0) {
      console.log('\n⚠️  INSUFFICIENT STOCK (Partial):')
      console.log('-'.repeat(80))
      for (const check of partialStock) {
        const shortage = check.required - check.available
        console.log(`   ${check.sku}: Required=${check.required}, Available=${check.available}, Shortage=${shortage}`)
        if (check.warehouses && check.warehouses.length > 1) {
          console.log(`      Spread across ${check.warehouses.length} warehouses`)
        }
      }
    }

    // Show not found
    if (notFound.length > 0) {
      console.log('\n❌ NOT IN STOCK:')
      console.log('-'.repeat(80))
      for (const check of notFound) {
        console.log(`   ${check.sku}: Required=${check.required}, Available=0`)
        // Show which repairs need this part
        const agg = aggregations.find(a => a.sku === check.sku)
        if (agg && agg.repairs.length > 0) {
          const repairList = agg.repairs.slice(0, 3).join(', ')
          const more = agg.repairs.length > 3 ? ` (+${agg.repairs.length - 3} more)` : ''
          console.log(`      Used in repairs: ${repairList}${more}`)
        }
      }
    }

    // Summary and recommendations
    console.log('\n' + '='.repeat(80))
    console.log('💡 RECOMMENDATIONS')
    console.log('='.repeat(80))

    if (insufficient.length === 0) {
      console.log('✅ All required parts are in stock!')
      console.log('   You can proceed with the repair import.')
    } else {
      console.log(`⚠️  ${insufficient.length} SKUs need attention before importing repairs:`)
      
      if (notFound.length > 0) {
        console.log(`\n   1. Add missing SKUs to stock (${notFound.length} SKUs):`)
        notFound.slice(0, 5).forEach(check => {
          console.log(`      - ${check.sku} (need ${check.required})`)
        })
        if (notFound.length > 5) {
          console.log(`      ... and ${notFound.length - 5} more`)
        }
      }
      
      if (partialStock.length > 0) {
        console.log(`\n   2. Increase stock for partially available SKUs (${partialStock.length} SKUs):`)
        partialStock.slice(0, 5).forEach(check => {
          const shortage = check.required - check.available
          console.log(`      - ${check.sku} (need ${shortage} more)`)
        })
        if (partialStock.length > 5) {
          console.log(`      ... and ${partialStock.length - 5} more`)
        }
      }

      console.log('\n   Alternative: Import repairs without consuming stock (modify import script)')
    }

    // Save detailed JSON report
    const reportPath = path.join(path.dirname(csvPath), 'stock-check-report.json')
    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        csv_file: csvPath,
        tenant_id: tenantId,
        warehouse_id: warehouseId,
      },
      summary: {
        total_repairs: records.length,
        repairs_with_parts: totalParts,
        repairs_without_parts: repairsWithoutParts,
        unique_skus: uniqueParts,
        sufficient_skus: sufficient.length,
        insufficient_skus: insufficient.length,
        missing_skus: notFound.length,
      },
      details: {
        sufficient,
        insufficient: partialStock,
        not_found: notFound,
      },
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n💾 Detailed report saved to: ${reportPath}`)

    // Generate CSV for missing SKUs (to purchase)
    if (notFound.length > 0) {
      const missingCsvPath = path.join(path.dirname(csvPath), 'parts-to-purchase-missing.csv')
      const missingCsvContent = generatePurchaseCSV(notFound, 'Missing SKUs - Not in Stock')
      fs.writeFileSync(missingCsvPath, missingCsvContent)
      console.log(`📄 Missing SKUs CSV saved to: ${missingCsvPath}`)
    }

    // Generate CSV for insufficient SKUs (to increase stock)
    if (partialStock.length > 0) {
      const insufficientCsvPath = path.join(path.dirname(csvPath), 'parts-to-purchase-insufficient.csv')
      const insufficientCsvContent = generatePurchaseCSV(partialStock, 'Insufficient SKUs - Need More Stock')
      fs.writeFileSync(insufficientCsvPath, insufficientCsvContent)
      console.log(`📄 Insufficient SKUs CSV saved to: ${insufficientCsvPath}`)
    }

    // Generate combined CSV for all items to purchase
    if (insufficient.length > 0) {
      const allToPurchasePath = path.join(path.dirname(csvPath), 'parts-to-purchase-all.csv')
      const allToPurchaseContent = generatePurchaseCSV(insufficient, 'All SKUs Needing Stock')
      fs.writeFileSync(allToPurchasePath, allToPurchaseContent)
      console.log(`📄 Combined purchase list saved to: ${allToPurchasePath}`)
      console.log(`   💡 Use this file to create purchase orders`)
    }

    console.log('\n✨ Check completed!')
    process.exit(insufficient.length > 0 ? 1 : 0)
  } catch (error) {
    console.error('\n💥 Fatal error during stock check:')
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()
