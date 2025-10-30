import { db } from '../db'
import { users } from '../db/circtek.schema'
import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Import users from repairs.csv
 * 
 * Usage:
 *   bun run src/scripts/import-users-from-repairs.ts <path-to-csv-file> <tenant-id> <role-id> <warehouse-id> [default-password]
 * 
 * Example:
 *   bun run src/scripts/import-users-from-repairs.ts ./repairs.csv 1 2 1 password123
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
  unique: number
  skipped: number
  existing: number
  created: number
  errors: Array<{ name: string; error: string }>
  failedNames: string[]
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
 * Generate username from name
 * Examples: "Shivaji Jadhav" -> "shivaji_jadhav", "Fasil" -> "fasil"
 */
function generateUsername(name: string, suffix?: number): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
  
  return suffix ? `${base}_${suffix}` : base
}

/**
 * Check if user exists by name and tenant
 */
async function userExists(name: string, tenantId: number): Promise<boolean> {
  if (!name) return false
  
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.name, name), eq(users.tenant_id, tenantId)))
    .limit(1)
  
  return result.length > 0
}

/**
 * Check if username is taken
 */
async function usernameExists(username: string): Promise<boolean> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.user_name, username))
    .limit(1)
  
  return result.length > 0
}

/**
 * Create a new user
 */
async function createUser(
  name: string,
  passwordHash: string,
  tenantId: number,
  roleId?: number,
  warehouseId?: number
): Promise<void> {
  // Generate unique username
  let username = generateUsername(name)
  let suffix = 1
  
  while (await usernameExists(username)) {
    username = generateUsername(name, suffix)
    suffix++
  }

  await db.insert(users).values({
    name,
    user_name: username,
    password: passwordHash,
    tenant_id: tenantId,
    role_id: roleId || null,
    warehouse_id: warehouseId || null,
    status: true,
  })
}

/**
 * Extract unique user names from CSV
 */
function extractUniqueUsers(records: RepairRecord[]): string[] {
  const uniqueNames = new Set<string>()
  
  for (const record of records) {
    const name = record.user?.trim()
    if (name && name !== '') {
      uniqueNames.add(name)
    }
  }
  
  return Array.from(uniqueNames).sort()
}

/**
 * Import users from CSV file
 */
async function importUsers(
  csvPath: string,
  tenantId: number,
  defaultPassword: string,
  roleId?: number,
  warehouseId?: number
): Promise<ImportStats> {
  const stats: ImportStats = {
    total: 0,
    unique: 0,
    skipped: 0,
    existing: 0,
    created: 0,
    errors: [],
    failedNames: [],
  }

  // Read CSV file
 
  const content = fs.readFileSync(csvPath, 'utf-8')
  const records = parseCSV(content)
  
 
  stats.total = records.length

  // Extract unique user names
  const uniqueUserNames = extractUniqueUsers(records)
  stats.unique = uniqueUserNames.length
  
 

  // Hash the default password once
 
  const passwordHash = await bcrypt.hash(defaultPassword, 10)
 

  // Process each unique user
  for (const name of uniqueUserNames) {
    try {
      // Skip empty names
      if (!name || name.trim() === '') {
        stats.skipped++
        continue
      }

      // Check if user already exists
      const exists = await userExists(name, tenantId)
      
      if (exists) {
        stats.existing++
       
      } else {
        // Create new user
        await createUser(name, passwordHash, tenantId, roleId, warehouseId)
        stats.created++
        
        // Get the username that was created
        const created = await db
          .select()
          .from(users)
          .where(and(eq(users.name, name), eq(users.tenant_id, tenantId)))
          .limit(1)
        
        const username = created[0]?.user_name || 'unknown'
       
      }
    } catch (error) {
      stats.errors.push({
        name,
        error: error instanceof Error ? error.message : String(error),
      })
      stats.failedNames.push(name)
      console.error(`❌ Error processing user "${name}": ${error}`)
    }
  }

  return stats
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length < 4) {
    console.error('❌ Error: Missing required arguments')
   
   
   
   
   
    process.exit(1)
  }

  const csvPath = path.resolve(args[0])
  const tenantId = parseInt(args[1], 10)
  const roleId = parseInt(args[2], 10)
  const warehouseId = parseInt(args[3], 10)
  const defaultPassword = args[4] || 'password'

  // Validate arguments
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: File not found: ${csvPath}`)
    process.exit(1)
  }

  if (isNaN(tenantId) || isNaN(roleId) || isNaN(warehouseId)) {
    console.error('❌ Error: tenant-id, role-id, and warehouse-id must be valid numbers')
    process.exit(1)
  }

 
 
 
 
 
 
 

  const startTime = Date.now()

  try {
    const stats = await importUsers(csvPath, tenantId, defaultPassword, roleId, warehouseId)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

   
   
   
   
   
   
   
   
   
   

    if (stats.errors.length > 0) {
     
      stats.errors.slice(0, 10).forEach((err, idx) => {
       
      })

      if (stats.errors.length > 10) {
       
      }

      // Save error details to JSON
      const errorJsonPath = path.join(path.dirname(csvPath), 'user-import-errors.json')
      fs.writeFileSync(errorJsonPath, JSON.stringify(stats.errors, null, 2))
     

      // Save failed names to text file
      const failedNamesPath = path.join(path.dirname(csvPath), 'user-import-failed-names.txt')
      fs.writeFileSync(failedNamesPath, stats.failedNames.join('\n'))
     
     
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
