import 'dotenv/config'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { db } from '../db'
import { stock, warehouses, sku_specs, tenants } from '../db/circtek.schema'
import { eq, and, gt, sql } from 'drizzle-orm'

/**
 * Export stock items with quantity > 0 to a CSV file
 * 
 * This script fetches all stock items that have a quantity greater than 0
 * and exports them to a CSV file with detailed information including
 * warehouse name, SKU specifications, and quantity.
 * 
 * Usage:
 *   bun run src/scripts/export-stock-to-csv.ts [output-file] [tenant-id]
 * 
 * Examples:
 *   bun run src/scripts/export-stock-to-csv.ts                      # Export all tenants to stock-export.csv
 *   bun run src/scripts/export-stock-to-csv.ts my-stock.csv         # Export all tenants to my-stock.csv
 *   bun run src/scripts/export-stock-to-csv.ts my-stock.csv 2       # Export tenant 2 only
 */

interface StockExportRow {
  stock_id: number
  sku: string
  is_part: boolean
  quantity: number
  warehouse_id: number
  warehouse_name: string
  tenant_id: number
  tenant_name: string
  make: string | null
  model_no: string | null
  model_name: string | null
  storage: string | null
  memory: string | null
  color: string | null
  device_type: string | null
  created_at: Date | null
  updated_at: Date | null
}

interface ExportStats {
  totalRecords: number
  totalQuantity: number
  uniqueSkus: number
  uniqueWarehouses: number
  uniqueTenants: number
}

/**
 * Fetch stock items with quantity > 0
 */
async function fetchStockData(tenantId?: number): Promise<StockExportRow[]> {
  const whereConditions = tenantId
    ? and(
        eq(stock.status, true),
        gt(stock.quantity, 0),
        eq(stock.tenant_id, tenantId)
      )
    : and(eq(stock.status, true), gt(stock.quantity, 0))

  const results = await db
    .select({
      stock_id: stock.id,
      sku: stock.sku,
      is_part: stock.is_part,
      quantity: stock.quantity,
      warehouse_id: stock.warehouse_id,
      warehouse_name: warehouses.name,
      tenant_id: stock.tenant_id,
      tenant_name: tenants.name,
      make: sku_specs.make,
      model_no: sku_specs.model_no,
      model_name: sku_specs.model_name,
      storage: sku_specs.storage,
      memory: sku_specs.memory,
      color: sku_specs.color,
      device_type: sku_specs.device_type,
      created_at: stock.created_at,
      updated_at: stock.updated_at,
    })
    .from(stock)
    .leftJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
    .leftJoin(tenants, eq(stock.tenant_id, tenants.id))
    .leftJoin(
      sku_specs,
      and(
        eq(stock.sku, sku_specs.sku),
        eq(stock.tenant_id, sku_specs.tenant_id)
      )
    )
    .where(whereConditions)
    .orderBy(stock.tenant_id, stock.warehouse_id, stock.sku)

  return results.map(row => ({
    ...row,
    warehouse_name: row.warehouse_name || 'Unknown',
    tenant_name: row.tenant_name || 'Unknown',
  }))
}

/**
 * Calculate statistics from stock data
 */
function calculateStats(data: StockExportRow[]): ExportStats {
  return {
    totalRecords: data.length,
    totalQuantity: data.reduce((sum, row) => sum + row.quantity, 0),
    uniqueSkus: new Set(data.map(row => row.sku)).size,
    uniqueWarehouses: new Set(data.map(row => row.warehouse_id)).size,
    uniqueTenants: new Set(data.map(row => row.tenant_id)).size,
  }
}

/**
 * Escape CSV field (handle commas, quotes, and newlines)
 */
function escapeCsvField(field: any): string {
  if (field === null || field === undefined) {
    return ''
  }
  
  const str = String(field)
  
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  
  return str
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: StockExportRow[]): string {
  const headers = [
    'Stock ID',
    'SKU',
    'Is Part',
    'Quantity',
    'Warehouse ID',
    'Warehouse Name',
    'Tenant ID',
    'Tenant Name',
    'Make',
    'Model No',
    'Model Name',
    'Storage',
    'Memory',
    'Color',
    'Device Type',
    'Created At',
    'Updated At',
  ]

  const csvLines: string[] = []
  
  // Add header row
  csvLines.push(headers.map(h => escapeCsvField(h)).join(','))

  // Add data rows
  for (const row of data) {
    const fields = [
      row.stock_id,
      row.sku,
      row.is_part ? 'Yes' : 'No',
      row.quantity,
      row.warehouse_id,
      row.warehouse_name,
      row.tenant_id,
      row.tenant_name,
      row.make,
      row.model_no,
      row.model_name,
      row.storage,
      row.memory,
      row.color,
      row.device_type,
      row.created_at ? row.created_at.toISOString() : '',
      row.updated_at ? row.updated_at.toISOString() : '',
    ]
    
    csvLines.push(fields.map(f => escapeCsvField(f)).join(','))
  }

  return csvLines.join('\n')
}

/**
 * Write CSV content to file
 */
async function writeCsvFile(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, 'utf-8')
}

/**
 * Main export function
 */
async function exportStock(
  outputFile: string,
  tenantId?: number
): Promise<ExportStats> {
  console.log(`\n${'='.repeat(70)}`)
  console.log('Stock Export to CSV')
  console.log(`${'='.repeat(70)}`)
  console.log(`Output File: ${outputFile}`)
  if (tenantId) {
    console.log(`Tenant ID: ${tenantId}`)
  } else {
    console.log('Tenant ID: All tenants')
  }
  console.log(`${'='.repeat(70)}\n`)

  console.log('📦 Fetching stock data...')
  const stockData = await fetchStockData(tenantId)
  
  if (stockData.length === 0) {
    console.log('⚠️  No stock items found with quantity > 0')
    return {
      totalRecords: 0,
      totalQuantity: 0,
      uniqueSkus: 0,
      uniqueWarehouses: 0,
      uniqueTenants: 0,
    }
  }

  console.log(`✓ Found ${stockData.length} stock items\n`)

  console.log('📊 Converting to CSV format...')
  const csvContent = convertToCSV(stockData)
  console.log(`✓ CSV content generated\n`)

  console.log('💾 Writing to file...')
  await writeCsvFile(outputFile, csvContent)
  console.log(`✓ File written successfully: ${outputFile}\n`)

  const stats = calculateStats(stockData)

  return stats
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  const outputFile = args[0] || 'stock-export.csv'
  let tenantId: number | undefined

  if (args.length > 1) {
    tenantId = parseInt(args[1], 10)
    if (isNaN(tenantId)) {
      console.error('❌ Error: tenant-id must be a valid number')
      process.exit(1)
    }
  }

  // Resolve output file path
  const outputPath = path.resolve(process.cwd(), outputFile)

  const startTime = Date.now()

  try {
    const stats = await exportStock(outputPath, tenantId)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    // Print summary
    console.log(`${'='.repeat(70)}`)
    console.log('Export Summary')
    console.log(`${'='.repeat(70)}`)
    console.log(`Total Records: ${stats.totalRecords}`)
    console.log(`Total Quantity: ${stats.totalQuantity}`)
    console.log(`Unique SKUs: ${stats.uniqueSkus}`)
    console.log(`Unique Warehouses: ${stats.uniqueWarehouses}`)
    console.log(`Unique Tenants: ${stats.uniqueTenants}`)
    console.log(`Duration: ${duration}s`)
    console.log(`Output File: ${outputPath}`)
    console.log(`${'='.repeat(70)}\n`)

    console.log('✓ Export completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('\n✗ Export failed:', error)
    process.exit(1)
  }
}

main()
