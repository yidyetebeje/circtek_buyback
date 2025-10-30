import { db } from '../db'
import { devices } from '../db/circtek.schema'
import { eq, and } from 'drizzle-orm'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Import devices from repairs.csv
 * 
 * Usage:
 *   bun run src/scripts/import-devices-from-repairs.ts <path-to-csv-file> <tenant-id> <warehouse-id>
 * 
 * Example:
 *   bun run src/scripts/import-devices-from-repairs.ts ./repairs.csv 1 1
 */

interface RepairRecord {
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

interface ImportStats {
  total: number
  skipped: number
  existing: number
  created: number
  errors: Array<{ imei: string; error: string }>
  failedRows: RepairRecord[]
}

/**
 * Proper CSV parser that handles empty fields
 */
function parseCSV(content: string): RepairRecord[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  // Parse headers
  const headers = parseCSVLine(lines[0])
  const records: RepairRecord[] = []
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const record: any = {}
    
    headers.forEach((header, index) => {
      record[header] = values[index] || ''
    })
    
    records.push(record as RepairRecord)
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
  
  // Push the last field
  result.push(current.trim())
  
  return result
}

/**
 * Check if device exists by IMEI and tenant
 */
async function deviceExists(imei: string, tenantId: number): Promise<boolean> {
  if (!imei) return false
  
  const result = await db
    .select()
    .from(devices)
    .where(and(eq(devices.imei, imei), eq(devices.tenant_id, tenantId)))
    .limit(1)
  
  return result.length > 0
}

/**
 * Create a new device
 */
async function createDevice(
  imei: string,
  modelName: string,
  memory: string,
  tenantId: number,
  warehouseId: number
): Promise<void> {
  await db.insert(devices).values({
    imei,
    model_name: modelName || 'Unknown',
    memory: memory || 'Unknown',
    device_type: 'iPhone', // Default to iPhone based on the data
    tenant_id: tenantId,
    warehouse_id: warehouseId,
    status: true,
  })
}

/**
 * Import devices from CSV file
 */
async function importDevices(
  csvPath: string,
  tenantId: number,
  warehouseId: number
): Promise<ImportStats> {
  const stats: ImportStats = {
    total: 0,
    skipped: 0,
    existing: 0,
    created: 0,
    errors: [],
    failedRows: [],
  }

  // Read CSV file
 
  const content = fs.readFileSync(csvPath, 'utf-8')
  const records = parseCSV(content)
  
 
  stats.total = records.length

  // Process each record
  for (const record of records) {
    try {
      // Skip records without IMEI
      if (!record.imei || record.imei.trim() === '') {
        stats.skipped++
        continue
      }

      const imei = record.imei.trim()
      const modelName = record.phonecheck_model?.trim() || 'Unknown'
      const memory = record.phonecheck_memory?.trim() || 'Unknown'

      // Check if device already exists
      const exists = await deviceExists(imei, tenantId)
      
      if (exists) {
        stats.existing++
       
      } else {
        // Create new device
        await createDevice(imei, modelName, memory, tenantId, warehouseId)
        stats.created++
       
      }
    } catch (error) {
      stats.errors.push({
        imei: record.imei,
        error: error instanceof Error ? error.message : String(error),
      })
      stats.failedRows.push(record)
      console.error(`❌ Error processing IMEI ${record.imei}: ${error}`)
    }
  }

  return stats
}

/**
 * Convert records back to CSV format
 */
function recordsToCSV(records: RepairRecord[]): string {
  if (records.length === 0) return ''
  
  const headers = Object.keys(records[0])
  const csvLines = [headers.join(',')]
  
  for (const record of records) {
    const values = headers.map(header => {
      const value = (record as any)[header] || ''
      if (value.toString().includes(',') || value.toString().includes('"')) {
        return `"${value.toString().replace(/"/g, '""')}"`
      }
      return value
    })
    csvLines.push(values.join(','))
  }
  
  return csvLines.join('\n')
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length < 3) {
    console.error('❌ Error: Missing required arguments')
   
   
   
   
    process.exit(1)
  }

  const csvPath = path.resolve(args[0])
  const tenantId = parseInt(args[1], 10)
  const warehouseId = parseInt(args[2], 10)

  // Validate arguments
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: File not found: ${csvPath}`)
    process.exit(1)
  }

  if (isNaN(tenantId) || isNaN(warehouseId)) {
    console.error('❌ Error: tenant-id and warehouse-id must be valid numbers')
    process.exit(1)
  }

 
 
 
 
 

  const startTime = Date.now()

  try {
    const stats = await importDevices(csvPath, tenantId, warehouseId)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

   
   
   
   
   
   
   
   
   

    if (stats.errors.length > 0) {
     
      stats.errors.slice(0, 10).forEach((err, idx) => {
       
      })

      if (stats.errors.length > 10) {
       
      }

      // Save error details to JSON
      const errorJsonPath = path.join(path.dirname(csvPath), 'device-import-errors.json')
      fs.writeFileSync(errorJsonPath, JSON.stringify(stats.errors, null, 2))
     

      // Save failed rows to CSV for re-import
      const failedCsvPath = path.join(path.dirname(csvPath), 'device-import-failed.csv')
      const failedCsv = recordsToCSV(stats.failedRows)
      fs.writeFileSync(failedCsvPath, failedCsv)
     
     
    }

   
    process.exit(0)
  } catch (error) {
    console.error('\n💥 Fatal error during import:')
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()
