import { db } from '../db'
import { users } from '../db/circtek.schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Reset user passwords from CSV file
 * 
 * This script:
 * 1. Reads usernames from a CSV file
 * 2. Generates random 8-character passwords (alphanumeric + special characters)
 * 3. Updates passwords in the database
 * 4. Exports username -> new password mapping to a CSV file
 * 
 * Usage:
 *   bun run src/scripts/reset-passwords-from-csv.ts <path-to-csv-file> <output-file>
 * 
 * Example:
 *   bun run src/scripts/reset-passwords-from-csv.ts ./users-list.csv ./new-passwords.csv
 */

interface UserRecord {
  id: string
  name: string
  user_name: string
  role_name: string
}

interface PasswordResetResult {
  name: string
  username: string
  newPassword: string
  status: 'success' | 'not_found' | 'error'
  error?: string
}

interface ResetStats {
  total: number
  successful: number
  notFound: number
  errors: number
}

/**
 * Parse CSV line handling quoted fields
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
 * Parse CSV file into user records
 */
function parseCSV(content: string): UserRecord[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  const headers = parseCSVLine(lines[0])
  const records: UserRecord[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const record: any = {}
    
    headers.forEach((header, index) => {
      record[header] = values[index] || ''
    })
    
    records.push(record as UserRecord)
  }
  
  return records
}

/**
 * Generate a random 8-character password with alphanumeric and special characters
 * Format: Includes uppercase, lowercase, numbers, and special characters
 */
function generateSecurePassword(length: number = 8): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*'
  
  const allChars = uppercase + lowercase + numbers + special
  
  // Ensure at least one character from each category
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Fill remaining characters randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password to randomize character positions
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Find user by username
 */
async function findUserByUsername(username: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.user_name, username))
    .limit(1)
  
  return user
}

/**
 * Update user password
 */
async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
  await db
    .update(users)
    .set({ password: passwordHash })
    .where(eq(users.id, userId))
}

/**
 * Reset passwords for users in CSV
 */
async function resetPasswords(csvPath: string): Promise<PasswordResetResult[]> {
 
  const content = fs.readFileSync(csvPath, 'utf-8')
  const records = parseCSV(content)
  
 
  
  const results: PasswordResetResult[] = []
  
  for (const record of records) {
    const username = record.user_name?.trim()
    const name = record.name?.trim() || ''
    
    if (!username) {
     
      continue
    }
    
    try {
      // Find user in database
      const user = await findUserByUsername(username)
      
      if (!user) {
       
        results.push({
          name,
          username,
          newPassword: '',
          status: 'not_found',
          error: 'User not found in database'
        })
        continue
      }
      
      // Generate new password
      const newPassword = generateSecurePassword(8)
      
      // Hash password
      const passwordHash = await bcrypt.hash(newPassword, 10)
      
      // Update password in database
      await updateUserPassword(user.id, passwordHash)
      
     
      results.push({
        name,
        username,
        newPassword,
        status: 'success'
      })
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`❌ Error resetting password for ${username}: ${errorMsg}`)
      results.push({
        name,
        username,
        newPassword: '',
        status: 'error',
        error: errorMsg
      })
    }
  }
  
  return results
}

/**
 * Export results to CSV
 */
function exportResultsToCSV(results: PasswordResetResult[], outputPath: string): void {
  const lines: string[] = ['name,username,new_password,status,error']
  
  for (const result of results) {
    const name = result.name ? `"${result.name.replace(/"/g, '""')}"` : ''
    const error = result.error ? `"${result.error.replace(/"/g, '""')}"` : ''
    lines.push(`${name},${result.username},${result.newPassword},${result.status},${error}`)
  }
  
  fs.writeFileSync(outputPath, lines.join('\n'))
 
}

/**
 * Calculate statistics
 */
function calculateStats(results: PasswordResetResult[]): ResetStats {
  return {
    total: results.length,
    successful: results.filter(r => r.status === 'success').length,
    notFound: results.filter(r => r.status === 'not_found').length,
    errors: results.filter(r => r.status === 'error').length
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length < 1) {
    console.error('❌ Error: Missing required arguments')
   
   
   
   
   
    process.exit(1)
  }

  const csvPath = path.resolve(args[0])
  const outputPath = args[1] 
    ? path.resolve(args[1]) 
    : path.join(path.dirname(csvPath), 'password-reset-results.csv')

  // Validate CSV file exists
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: File not found: ${csvPath}`)
    process.exit(1)
  }

 
 
 
 

  const startTime = Date.now()

  try {
    // Reset passwords
    const results = await resetPasswords(csvPath)
    
    // Export results
    exportResultsToCSV(results, outputPath)
    
    // Calculate statistics
    const stats = calculateStats(results)
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

   
   
   
   
   
   
   
   

   
   
   
   
   
   
   
    
    process.exit(0)
  } catch (error) {
    console.error('\n💥 Fatal error during password reset:')
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()
