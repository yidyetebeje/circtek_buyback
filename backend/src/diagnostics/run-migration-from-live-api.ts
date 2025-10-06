import { migrateOldData, migrateOldDataBatch } from './migrate-old-data'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Migration script that fetches data from the old API and migrates it
 * 
 * Run with: bun run src/diagnostics/run-migration-from-live-api.ts
 * 
 * This script:
 * 1. Fetches all data from the old API (paginated)
 * 2. Appends each page of data to response.json as it's fetched
 * 3. Transforms and migrates it to the new system
 * 4. Tracks progress and errors
 * 
 * Note: Data is saved incrementally to response.json to avoid memory issues
 * with large datasets and to provide progress persistence.
 */

// Configuration
const API_CONFIG = {
	baseUrl: 'http://localhost:3000/v1/user/getCloudDbDevices',
	clientId: 0,
	pageSize: 100, // Fetch 500 records per page
	searchText: '',
	searchType: 'imei',
}

// Migration Configuration
const MIGRATION_CONFIG = {
	testerId: 9,    // Update if needed
	tenantId: 10,    // Update if needed
	warehouseId: 1, // Update if needed
}

interface ApiResponse {
	status: boolean
	message: string
	data: {
		data: any[]
		totalPages: number
		totalItems: number
		currentPage: number
	}
}

/**
 * Initialize the response.json file with an empty array
 */
function initializeResponseFile(): void {
	const filePath = 'response.json'
	try {
		fs.writeFileSync(filePath, '[]')
		console.log('📄 Initialized response.json file')
	} catch (error) {
		console.error('❌ Failed to initialize response.json:', error)
	}
}

/**
 * Append data to the response.json file
 */
function appendToResponseFile(data: any[]): void {
	const filePath = 'response.json'
	try {
		// Read existing data
		let existingData: any[] = []
		if (fs.existsSync(filePath)) {
			const fileContent = fs.readFileSync(filePath, 'utf8')
			existingData = JSON.parse(fileContent)
		}
		
		// Append new data
		existingData.push(...data)
		
		// Write back to file
		fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2))
		console.log(`💾 Appended ${data.length} records to response.json (Total: ${existingData.length})`)
	} catch (error) {
		console.error('❌ Failed to append to response.json:', error)
	}
}

/**
 * Fetch a single page of data from the API
 */
async function fetchPage(page: number): Promise<ApiResponse | null> {
	const url = new URL(API_CONFIG.baseUrl)
	url.searchParams.set('clientId', API_CONFIG.clientId.toString())
	url.searchParams.set('page', page.toString())
	url.searchParams.set('size', API_CONFIG.pageSize.toString())
	url.searchParams.set('searchText', API_CONFIG.searchText)
	url.searchParams.set('searchType', API_CONFIG.searchType)
	

	try {
		console.log(`📥 Fetching page ${page}...`)
		const response = await fetch(url.toString(), {
			headers: {
				"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjgsImZOYW1lIjoiWWlkbmVrYWNoZXciLCJsTmFtZSI6IlRlYmVqZSIsIndhcmVob3VzZUlkIjowLCJjbGllbnRJZCI6MCwidXNlck5hbWUiOiJZaWRuZWthY2hldyIsImVtYWlsIjoieWlkbmVrYWNoZXd0ZWJlamVAZ21haWwuY29tIiwicm9sZUlkIjoxLCJyb2xlTmFtZSI6IkFkbWluIiwicm9sZVNsdWciOiJhZG1pbiIsImlhdCI6MTc1OTQ4MzU2OSwiZXhwIjoxNzY4MTIzNTY5fQ.0fNaq1wLEXj0ABHUyvMuUhcOJZbwOcqtoNx4THeeQnA",
				"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjgsImZOYW1lIjoiWWlkbmVrYWNoZXciLCJsTmFtZSI6IlRlYmVqZSIsIndhcmVob3VzZUlkIjowLCJjbGllbnRJZCI6MCwidXNlck5hbWUiOiJZaWRuZWthY2hldyIsImVtYWlsIjoieWlkbmVrYWNoZXd0ZWJlamVAZ21haWwuY29tIiwicm9sZUlkIjoxLCJyb2xlTmFtZSI6IkFkbWluIiwicm9sZVNsdWciOiJhZG1pbiIsImlhdCI6MTc1OTQ5MTM1MSwiZXhwIjoxNzY4MTMxMzUxfQ.EvVRJ2Vo7U2gYTS0c2-ha1Iub-KEvMiIwTsL_C47ZzE"
			}
		})
		console.log(response, "response")
		
		if (!response.ok) {
			console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`)
			return null
		}

		const data: ApiResponse = await response.json()
		
		if (!data.status) {
			console.error(`❌ API Error: ${data.message}`)
			return null
		}

		return data
	} catch (error) {
		console.error(`❌ Fetch Error:`, error)
		return null
	}
}

/**
 * Fetch all pages from the API and append to response.json
 */
async function fetchAllData(): Promise<number> {
	let currentPage = 0
	let totalPages = 1
	let totalRecords = 0

	console.log('🌐 Starting data fetch from API...')
	console.log(`📍 Endpoint: ${API_CONFIG.baseUrl}`)
	console.log(`📦 Page Size: ${API_CONFIG.pageSize}\n`)

	// Initialize the response file
	initializeResponseFile()

	while (currentPage < totalPages) {
		const response = await fetchPage(currentPage)
		if (!response) {
			console.error(`❌ Failed to fetch page ${currentPage}. Stopping.`)
			break
		}
		const pageData = response.data.data || []
		totalPages = response.data.totalPages
		totalRecords += pageData.length
		
		// Append data to file immediately
		appendToResponseFile(pageData)
		
		const totalItems = response.data.totalItems
		console.log(`✅ Page ${currentPage + 1}/${totalPages} - Fetched ${pageData.length} records (Total so far: ${totalRecords}/${totalItems})`)
		currentPage++
		
		// Add a small delay to avoid overwhelming the API
		if (currentPage < totalPages) {
			await new Promise(resolve => setTimeout(resolve, 1000))
		}
	}
	console.log(`\n✅ Fetch complete! Total records: ${totalRecords}\n`)
	return totalRecords
}

/**
 * Main migration function
 */
async function runMigrationFromLiveAPI() {
	console.log('=' .repeat(60))
	console.log('🚀 MIGRATION FROM LIVE API')
	console.log('='.repeat(60))
	console.log()

	const startTime = Date.now()

	// Step 1: Fetch all data from API and save to response.json
	const totalRecords = await fetchAllData()

	if (totalRecords === 0) {
		console.error('❌ No data fetched from API. Exiting.')
		process.exit(1)
	}

	// Read the data from response.json for migration
	let oldData: any[] = []
	try {
		const fileContent = fs.readFileSync('response.json', 'utf8')
		oldData = JSON.parse(fileContent)
		console.log(`📖 Loaded ${oldData.length} records from response.json`)
	} catch (error) {
		console.error('❌ Failed to read response.json:', error)
		process.exit(1)
	}

	
	const firstRecord = oldData[0]
	const config = {
		testerId: firstRecord.testerId || MIGRATION_CONFIG.testerId,
		tenantId: firstRecord.clientId || MIGRATION_CONFIG.tenantId,
		warehouseId: firstRecord.warehouseId || MIGRATION_CONFIG.warehouseId,
	}

	console.log('📋 Migration Configuration:')
	console.log(`   Tester ID: ${config.testerId}`)
	console.log(`   Tenant ID: ${config.tenantId}`)
	console.log(`   Warehouse ID: ${config.warehouseId}`)
	console.log()

	// Step 3: Migrate data
	console.log('🔄 Starting migration process...')
	console.log(`📊 Total records to migrate: ${oldData.length}`)
	console.log('⏳ This may take a while...\n')

	// Choose migration method based on data size
	const useBatch = oldData.length > 50
	console.log(`📦 Using ${useBatch ? 'batch' : 'detailed'} migration method\n`)

	const migrationStartTime = Date.now()

	const result = useBatch
		? await migrateOldDataBatch(oldData, config)
		: await migrateOldData(oldData, config)

	const migrationDuration = ((Date.now() - migrationStartTime) / 1000).toFixed(2)
	const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2)

	// Step 4: Display results
	console.log('\n' + '='.repeat(60))
	console.log('📈 MIGRATION COMPLETE')
	console.log('='.repeat(60))
	console.log(`✅ Success: ${result.success}`)
	console.log(`❌ Failed: ${result.failed}`)
	console.log(`📊 Success Rate: ${((result.success / oldData.length) * 100).toFixed(1)}%`)
	console.log(`⏱️  Fetch Duration: ${((migrationStartTime - startTime) / 1000).toFixed(2)}s`)
	console.log(`⏱️  Migration Duration: ${migrationDuration}s`)
	console.log(`⏱️  Total Duration: ${totalDuration}s`)

	if (result.errors.length > 0) {
		console.log('\n❌ Errors:')
		result.errors.slice(0, 10).forEach((err, idx) => {
			const identifier = err.record.imei || err.record.serial || err.record.lpn || 'unknown'
			console.log(`  ${idx + 1}. ${identifier}: ${err.error}`)
		})
		
		if (result.errors.length > 10) {
			console.log(`  ... and ${result.errors.length - 10} more errors`)
		}

		// Save errors to file
		try {
			await Bun.write(
				'migration-errors.json',
				JSON.stringify(result.errors, null, 2)
			)
			console.log('\n💾 All errors saved to: migration-errors.json')
		} catch (error) {
			console.error('Failed to save errors to file:', error)
		}
	}

	console.log('\n✨ Migration process finished!')
	console.log('='.repeat(60))
}

// Run the migration
runMigrationFromLiveAPI().catch((error) => {
	console.error('\n💥 Fatal error during migration:')
	console.error(error)
	process.exit(1)
})
