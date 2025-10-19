import { db } from '../db'
import { devices, users, repair_reasons, repairs, repair_items, device_events } from '../db/circtek.schema'
import { eq, and, gte } from 'drizzle-orm'
import { RepairsRepository } from '../stock/repairs/repository'
import { RepairsController } from '../stock/repairs/controller'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Import repairs from repairs.csv
 * 
 * Usage:
 *   bun run src/scripts/import-repairs-from-csv.ts <path-to-csv-file> <tenant-id> <warehouse-id>
 * 
 * Example:
 *   bun run src/scripts/import-repairs-from-csv.ts ./repairs.csv 1 1
 * 
 * Prerequisites:
 *   - Devices must be imported first (using import-devices script)
 *   - Users must be imported first (using import-users script)
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

interface ImportStats {
  total: number
  skipped: number
  created: number
  errors: Array<{ row: number; imei: string; reason: string; error: string }>
  failedRows: RepairCSVRecord[]
}

/**
 * Proper CSV parser that handles empty fields
 */
function parseCSV(content: string): RepairCSVRecord[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  // Parse headers
  const headers = parseCSVLine(lines[0])
  const records: RepairCSVRecord[] = []
  
  // Parse data rows
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
  
  // Push the last field
  result.push(current.trim())
  
  return result
}

/**
 * Find device by IMEI and tenant
 */
async function findDeviceByIMEI(imei: string, tenantId: number): Promise<number | null> {
  if (!imei || imei.trim() === '') return null
  
  const [device] = await db
    .select({ id: devices.id })
    .from(devices)
    .where(and(eq(devices.imei, imei), eq(devices.tenant_id, tenantId)))
    .limit(1)
  
  return device?.id || null
}

/**
 * Find user by name and tenant
 */
async function findUserByName(name: string, tenantId: number): Promise<number | null> {
  if (!name || name.trim() === '') return null
  
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.name, name), eq(users.tenant_id, tenantId)))
    .limit(1)
  
  return user?.id || null
}

/**
 * Find or create repair reason by name
 */
async function findOrCreateRepairReason(
  reasonName: string,
  tenantId: number,
  hasPartCode: boolean
): Promise<number | null> {
  if (!reasonName || reasonName.trim() === '') return null
  
  // Try to find existing
  const [existing] = await db
    .select({ id: repair_reasons.id })
    .from(repair_reasons)
    .where(and(eq(repair_reasons.name, reasonName), eq(repair_reasons.tenant_id, tenantId)))
    .limit(1)
  
  if (existing) return existing.id
  
  // Create new repair reason with default fixed price for service-only repairs
  const [result] = await db.insert(repair_reasons).values({
    name: reasonName,
    description: `Auto-imported from repairs CSV`,
    fixed_price: hasPartCode ? null : '0.00', // Set 0 for service-only, null for parts-based
    tenant_id: tenantId,
    status: true,
  })
  
  return result.insertId ? Number(result.insertId) : null
}

/**
 * Check if repair already exists for this device with same repair_number
 */
async function repairExists(
  repo: RepairsRepository,
  deviceId: number,
  repairNumber: string,
  tenantId: number
): Promise<boolean> {
  if (!repairNumber) return false
  
  // Search for repairs with this repair number in remarks
  const result = await repo.findAll({
    device_id: deviceId,
    tenant_id: tenantId,
    search: `Repair #${repairNumber}`,
    page: 1,
    limit: 1,
  })
  
  return result.rows.length > 0
}

/**
 * Parse repair date from CSV
 */
function parseRepairDate(dateString: string): Date | null {
  if (!dateString || dateString.trim() === '') return null
  
  try {
    const date = new Date(dateString)
    // Check if date is valid
    if (isNaN(date.getTime())) return null
    return date
  } catch {
    return null
  }
}

/**
 * Update timestamps for repair and its related entities
 */
async function updateRepairTimestamps(
  repairId: number,
  deviceId: number,
  customDate: Date,
  tenantId: number,
  creationTime: Date
): Promise<void> {
  // Update repair timestamps
  await db
    .update(repairs)
    .set({
      created_at: customDate,
      updated_at: customDate,
    })
    .where(and(eq(repairs.id, repairId), eq(repairs.tenant_id, tenantId)))
  
  // Update repair items timestamps
  await db
    .update(repair_items)
    .set({
      created_at: customDate,
      updated_at: customDate,
    })
    .where(and(eq(repair_items.repair_id, repairId), eq(repair_items.tenant_id, tenantId)))
  
  // Update device events timestamps (REPAIR_STARTED and REPAIR_COMPLETED events)
  // These were created by the controller just now (within the last few seconds)
  const recentThreshold = new Date(creationTime.getTime() - 5000) // 5 seconds before creation
  
  await db
    .update(device_events)
    .set({
      created_at: customDate,
    })
    .where(
      and(
        eq(device_events.device_id, deviceId),
        eq(device_events.tenant_id, tenantId),
        gte(device_events.created_at, recentThreshold)
      )
    )
}

/**
 * Create repair using the controller (with proper business logic)
 */
async function createRepairWithConsume(
  controller: RepairsController,
  record: RepairCSVRecord,
  deviceId: number,
  actorId: number,
  warehouseId: number,
  reasonId: number,
  tenantId: number
): Promise<{ success: boolean; repairId?: number; error?: string }> {
  const remarks = `Repair #${record.repair_number}`
  
  // Prepare repair payload
  const payload = {
    device_id: deviceId,
    remarks,
    warehouse_id: warehouseId,
    items: [
      {
        sku: record.partcode || 'fixed_price', // Use fixed_price for service-only repairs
        quantity: 1,
        reason_id: reasonId,
      }
    ],
    notes: record.description || undefined,
  }
  
  // Create repair with consume
  const creationTime = new Date() // Capture the time before creation
  const result = await controller.createWithConsume(payload, tenantId, actorId)
  
  if (result.status === 201 && result.data) {
    const repairId = result.data.repair.id
    
    // Update timestamps if repair_dates exists in CSV
    const repairDate = parseRepairDate(record.repair_dates)
    if (repairDate) {
      try {
        await updateRepairTimestamps(repairId, deviceId, repairDate, tenantId, creationTime)
      } catch (error) {
        console.warn(`⚠️  Warning: Failed to update timestamps for repair ${repairId}:`, error)
        // Don't fail the import, just warn
      }
    }
    
    return { success: true, repairId }
  } else {
    return { success: false, error: result.message }
  }
}

/**
 * Import repairs from CSV file
 */
async function importRepairs(
  csvPath: string,
  tenantId: number,
  warehouseId: number
): Promise<ImportStats> {
  // Initialize repository and controller
  const repo = new RepairsRepository(db)
  const controller = new RepairsController(repo)
  const stats: ImportStats = {
    total: 0,
    skipped: 0,
    created: 0,
    errors: [],
    failedRows: [],
  }

  // Read CSV file
  console.log(`📂 Reading CSV file: ${csvPath}`)
  const content = fs.readFileSync(csvPath, 'utf-8')
  const records = parseCSV(content)
  
  console.log(`✅ Found ${records.length} records in CSV\n`)
  stats.total = records.length

  let rowNum = 1 // Start from 1 (header is row 0)
  
  // Process each record
  for (const record of records) {
    rowNum++
    
    try {
       if(record.partcode.toLowerCase() === 'cameracleaning'){
           record.partcode = '';
           record.reason = 'Ultrasonic Camera Cleaning'
       }
       if(record.reason.toLowerCase() === 'screen' && (record.partcode.toLowerCase() === 'rfb' || record.description.toLowerCase() === 'rfb')){
           record.reason = 'GLASS REFURBISHMENT';
           record.partcode = '';
       }
      // Skip records without IMEI
      if (!record.imei || record.imei.trim() === '') {
        stats.skipped++
        console.log(`⏭️  Row ${rowNum}: Skipping - no IMEI`)
        continue
      }

      // Skip records without reason
      if (!record.reason || record.reason.trim() === '') {
        stats.skipped++
        console.log(`⏭️  Row ${rowNum}: Skipping IMEI ${record.imei} - no reason`)
        continue
      }

      // Find device
      const deviceId = await findDeviceByIMEI(record.imei, tenantId)
      if (!deviceId) {
        stats.errors.push({
          row: rowNum,
          imei: record.imei,
          reason: record.reason,
          error: 'Device not found - run import-devices script first',
        })
        stats.failedRows.push(record)
        console.log(`❌ Row ${rowNum}: Device not found for IMEI ${record.imei}`)
        continue
      }

      // Find user (actor)
      let actorId: number | null = null
      if (record.user && record.user.trim() !== '') {
        actorId = await findUserByName(record.user, tenantId)
        if (!actorId) {
          stats.errors.push({
            row: rowNum,
            imei: record.imei,
            reason: record.reason,
            error: `User "${record.user}" not found - run import-users script first`,
          })
          stats.failedRows.push(record)
          console.log(`❌ Row ${rowNum}: User "${record.user}" not found`)
          continue
        }
      } else {
        stats.skipped++
        console.log(`⏭️  Row ${rowNum}: Skipping - no user`)
        continue
      }

      // Find or create repair reason
      const hasPartCode = !!(record.partcode && record.partcode.trim())
      const reasonId = await findOrCreateRepairReason(record.reason, tenantId, hasPartCode)
      if (!reasonId) {
        stats.errors.push({
          row: rowNum,
          imei: record.imei,
          reason: record.reason,
          error: 'Failed to create repair reason',
        })
        stats.failedRows.push(record)
        console.log(`❌ Row ${rowNum}: Failed to create repair reason`)
        continue
      }

      // Check if repair already exists (prevent duplicates)
      if (record.repair_number) {
        const exists = await repairExists(repo, deviceId, record.repair_number, tenantId)
        if (exists) {
          stats.skipped++
          console.log(`⏭️  Row ${rowNum}: Repair #${record.repair_number} already exists for device ${deviceId}`)
          continue
        }
      }

      // Create repair using controller
      const createResult = await createRepairWithConsume(
        controller,
        record,
        deviceId,
        actorId,
        warehouseId,
        reasonId,
        tenantId
      )
      
      if (!createResult.success) {
        stats.errors.push({
          row: rowNum,
          imei: record.imei,
          reason: record.reason,
          error: createResult.error || 'Failed to create repair',
        })
        stats.failedRows.push(record)
        console.log(`❌ Row ${rowNum}: ${createResult.error}`)
        continue
      }

      stats.created++
      const dateInfo = parseRepairDate(record.repair_dates) 
        ? ` (Date: ${record.repair_dates})` 
        : ''
      console.log(
        `✅ Row ${rowNum}: Created repair #${record.repair_number} for IMEI ${record.imei}, Reason: ${record.reason}, Part: ${record.partcode || 'Service'}${dateInfo}`
      )
    } catch (error) {
      stats.errors.push({
        row: rowNum,
        imei: record.imei,
        reason: record.reason,
        error: error instanceof Error ? error.message : String(error),
      })
      stats.failedRows.push(record)
      console.error(`❌ Row ${rowNum}: Error - ${error}`)
    }
  }

  return stats
}

/**
 * Convert records back to CSV format
 */
function recordsToCSV(records: RepairCSVRecord[]): string {
  if (records.length === 0) return ''
  
  // Headers
  const headers = Object.keys(records[0])
  const csvLines = [headers.join(',')]
  
  // Data rows
  for (const record of records) {
    const values = headers.map(header => {
      const value = (record as any)[header] || ''
      // Escape values that contain commas or quotes
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
    console.log('\nUsage:')
    console.log('  bun run src/scripts/import-repairs-from-csv.ts <csv-path> <tenant-id> <warehouse-id>')
    console.log('\nExample:')
    console.log('  bun run src/scripts/import-repairs-from-csv.ts ./repairs.csv 1 1')
    console.log('\nPrerequisites:')
    console.log('  1. Run import-devices script first')
    console.log('  2. Run import-users script first')
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

  console.log('🚀 Starting repair import...\n')
  console.log('📋 Configuration:')
  console.log(`   CSV File: ${csvPath}`)
  console.log(`   Tenant ID: ${tenantId}`)
  console.log(`   Warehouse ID: ${warehouseId}\n`)

  const startTime = Date.now()

  try {
    const stats = await importRepairs(csvPath, tenantId, warehouseId)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('\n' + '='.repeat(60))
    console.log('📊 Import Summary')
    console.log('='.repeat(60))
    console.log(`📝 Total records: ${stats.total}`)
    console.log(`⏭️  Skipped: ${stats.skipped}`)
    console.log(`✅ Created: ${stats.created}`)
    console.log(`❌ Errors: ${stats.errors.length}`)
    console.log(`⏱️  Duration: ${duration}s`)

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:')
      stats.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`  ${idx + 1}. Row ${err.row} - IMEI ${err.imei}: ${err.error}`)
      })

      if (stats.errors.length > 10) {
        console.log(`  ... and ${stats.errors.length - 10} more errors`)
      }

      // Save error details to JSON
      const errorJsonPath = path.join(path.dirname(csvPath), 'repair-import-errors.json')
      fs.writeFileSync(errorJsonPath, JSON.stringify(stats.errors, null, 2))
      console.log(`\n💾 Error details saved to: ${errorJsonPath}`)

      // Save failed rows to CSV for re-import
      const failedCsvPath = path.join(path.dirname(csvPath), 'repair-import-failed.csv')
      const failedCsv = recordsToCSV(stats.failedRows)
      fs.writeFileSync(failedCsvPath, failedCsv)
      console.log(`📄 Failed rows saved to: ${failedCsvPath}`)
      console.log(`   💡 Fix the issues and re-import this file`)
    }

    console.log('\n✨ Import completed!')
    process.exit(0)
  } catch (error) {
    console.error('\n💥 Fatal error during import:')
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()
