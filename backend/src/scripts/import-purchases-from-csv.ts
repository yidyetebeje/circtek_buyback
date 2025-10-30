import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Import purchase orders from a CSV file using REST API
 * 
 * CSV Format: Supplier,SKU,Count,Price
 * 
 * Usage:
 *   bun run src/scripts/import-purchases-from-csv.ts <csv-file-path> <tenant-id> <warehouse-id> [--api-url=http://localhost:3000] [--dry-run]
 * 
 * Example:
 *   bun run src/scripts/import-purchases-from-csv.ts partimport.csv 2 1
 *   bun run src/scripts/import-purchases-from-csv.ts partimport.csv 2 1 --api-url=http://localhost:3000 --dry-run
 * 
 * Arguments:
 *   csv-file-path: Path to the CSV file (relative to backend directory)
 *   tenant-id: The tenant ID for the purchases
 *   warehouse-id: The warehouse ID where items will be received
 *   --api-url: Optional base URL of the API (default: http://localhost:3000)
 *   --dry-run: Optional flag to preview what would be imported without making requests
 */

interface PurchaseItem {
  sku: string
  quantity: number
  price: number
  is_part: boolean
}

interface PurchaseGroup {
  supplier: string
  items: PurchaseItem[]
  totalItems: number
  totalValue: number
}

interface ImportStats {
  totalSuppliers: number
  totalItems: number
  totalValue: number
  successfulPurchases: number
  failedPurchases: number
  errors: Array<{ supplier: string; error: string }>
}

/**
 * Parse CSV file and group items by supplier
 */
async function parseCSV(filePath: string): Promise<Map<string, PurchaseItem[]>> {
  const content = await readFile(filePath, 'utf-8')
  const lines = content.split(/\r?\n/).filter(line => line.trim())
  
  // Skip header row
  const dataLines = lines.slice(1)
  
  const supplierGroups = new Map<string, PurchaseItem[]>()
  
  for (const line of dataLines) {
    const [supplier, sku, count, price] = line.split(',').map(s => s.trim())
    
    if (!supplier || !sku || !count || !price) {
      console.warn(`⚠ Skipping invalid line: ${line}`)
      continue
    }
    
    const item: PurchaseItem = {
      sku,
      quantity: parseInt(count, 10),
      price: parseFloat(price),
      is_part: true // Assuming all items are parts by default
    }
    
    if (!supplierGroups.has(supplier)) {
      supplierGroups.set(supplier, [])
    }
    
    supplierGroups.get(supplier)!.push(item)
  }
  
  return supplierGroups
}

/**
 * Create a purchase order with items via REST API
 */
async function createPurchaseOrder(
  supplier: string,
  items: PurchaseItem[],
  tenantId: number,
  warehouseId: number,
  apiUrl: string,
  authToken?: string
): Promise<{ success: boolean; error?: string; purchaseId?: number }> {
  const today = new Date()
  const expectedDelivery = new Date(today)
  expectedDelivery.setDate(today.getDate() + 7) // 7 days from now
  
  const payload = {
    purchase: {
      supplier_name: supplier,
      supplier_order_no: `IMPORT_${supplier}_${Date.now()}`,
      expected_delivery_date: expectedDelivery.toISOString(),
      warehouse_id: warehouseId,
      remarks: 'Imported from CSV',
      customer_name: 'Stock Purchase'
    },
    items: items
  }
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }
    
    const response = await fetch(`${apiUrl}/api/v1/stock/purchases/with-items`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${errorText}` 
      }
    }
    
    const result = await response.json()
    
    if (result.status === 201 && result.data) {
      return { 
        success: true, 
        purchaseId: result.data.purchase?.id 
      }
    } else {
      return { 
        success: false, 
        error: result.message || 'Unknown error' 
      }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
}

/**
 * Import all purchases from CSV
 */
async function importPurchases(
  csvPath: string,
  tenantId: number,
  warehouseId: number,
  apiUrl: string,
  dryRun: boolean,
  authToken?: string
): Promise<ImportStats> {
  const stats: ImportStats = {
    totalSuppliers: 0,
    totalItems: 0,
    totalValue: 0,
    successfulPurchases: 0,
    failedPurchases: 0,
    errors: []
  }
  
 
 
 
 
 
 
 
 
 
  
  // Parse CSV
 
  const supplierGroups = await parseCSV(csvPath)
  stats.totalSuppliers = supplierGroups.size
  
 
  
  // Process each supplier
  for (const [supplier, items] of supplierGroups.entries()) {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    
    stats.totalItems += totalItems
    stats.totalValue += totalValue
    
   
   
   
   
   
   
   
    
    items.forEach(item => {
     
    })
    
    if (dryRun) {
     
      stats.successfulPurchases++
    } else {
     
      const result = await createPurchaseOrder(
        supplier,
        items,
        tenantId,
        warehouseId,
        apiUrl,
        authToken
      )
      
      if (result.success) {
       
        stats.successfulPurchases++
      } else {
       
        stats.failedPurchases++
        stats.errors.push({
          supplier,
          error: result.error || 'Unknown error'
        })
      }
    }
  }
  
  // Print summary
 
 
 
 
 
 
 
 
  
  if (stats.errors.length > 0) {
   
   
   
    stats.errors.forEach(err => {
     
    })
  }
  
 
  
  return stats
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  
  
  
  const csvPath = path.resolve(process.cwd(), args[0])
  const tenantId = 2
  const warehouseId = 1
  
  // Parse optional flags
  let apiUrl = 'https://api.circtek.io'
  let dryRun = false
  let authToken: string | undefined = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjUsInJvbGUiOiJ0ZXN0ZXIiLCJ0ZW5hbnRfaWQiOjIsIndhcmVob3VzZV9pZCI6MSwibWFuYWdlZF9zaG9wX2lkIjpudWxsLCJleHAiOjE3NjM2Mjc4NzEsImlhdCI6MTc2MTAzNTg3MX0.qnd3iCfsRTtCbkmiKGTYY8zznLNHlLpIe0FSLQInGF0'
  
  for (let i = 3; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--api-url=')) {
      apiUrl = arg.split('=')[1]
    } else if (arg === '--dry-run') {
      dryRun = true
    } else if (arg.startsWith('--token=')) {
      authToken = arg.split('=')[1]
    }
  }
  
  if (isNaN(tenantId) || isNaN(warehouseId)) {
    console.error('Error: tenant-id and warehouse-id must be valid numbers')
    process.exit(1)
  }
  
  try {
    await importPurchases(csvPath, tenantId, warehouseId, apiUrl, dryRun, authToken)
   
    process.exit(0)
  } catch (error) {
    console.error('\n✗ Script failed:', error)
    process.exit(1)
  }
}

main()
