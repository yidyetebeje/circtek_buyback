import { migrateOldData, migrateOldDataBatch } from './migrate-old-data'

/**
 * Migration script that fetches data from the old API and migrates it
 * 
 * Run with: bun run src/diagnostics/run-migration-from-live-api.ts
 * 
 * This script:
 * 1. Fetches all data from the old API (paginated)
 * 2. Transforms and migrates it to the new system
 * 3. Tracks progress and errors
 */

// Configuration
const API_CONFIG = {
	baseUrl: 'https://stg-rest.circtek.io/v1/user/getCloudDbDevices',
	clientId: 0,
	pageSize: 10, // Fetch 500 records per page
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
				"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjgsImZOYW1lIjoiWWlkbmVrYWNoZXciLCJsTmFtZSI6IlRlYmVqZSIsIndhcmVob3VzZUlkIjowLCJjbGllbnRJZCI6MCwidXNlck5hbWUiOiJZaWRuZWthY2hldyIsImVtYWlsIjoieWlkbmVrYWNoZXd0ZWJlamVAZ21haWwuY29tIiwicm9sZUlkIjoxLCJyb2xlTmFtZSI6IkFkbWluIiwicm9sZVNsdWciOiJhZG1pbiIsImlhdCI6MTc1OTQ4MzU2OSwiZXhwIjoxNzY4MTIzNTY5fQ.0fNaq1wLEXj0ABHUyvMuUhcOJZbwOcqtoNx4THeeQnA"
			}
		})
		
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
 * Fetch all pages from the API
 */
async function fetchAllData(): Promise<any[]> {
	const allData: any[] = []
	let currentPage = 0
	let totalPages = 1

	console.log('🌐 Starting data fetch from API...')
	console.log(`📍 Endpoint: ${API_CONFIG.baseUrl}`)
	console.log(`📦 Page Size: ${API_CONFIG.pageSize}\n`)

	while (currentPage < totalPages) {
		const response = await fetchPage(currentPage)

		if (!response) {
			console.error(`❌ Failed to fetch page ${currentPage}. Stopping.`)
			break
		}


		const pageData = response.data.data || []
		allData.push(...pageData)

		// totalPages = response.data.totalPages
		const totalItems = response.data.totalItems

		console.log(`✅ Page ${currentPage + 1}/${totalPages} - Fetched ${pageData.length} records (Total so far: ${allData.length}/${totalItems})`)

		currentPage++

		// Add a small delay to avoid overwhelming the API
		if (currentPage < totalPages) {
			await new Promise(resolve => setTimeout(resolve, 100))
		}
	}

	console.log(`\n✅ Fetch complete! Total records: ${allData.length}\n`)
	return allData
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

	// Step 1: Fetch all data from API
	const oldData = await fetchAllData()
	// save this file in json format in oldata.json

	const fs = require('fs')
	fs.writeFileSync('oldata.json', JSON.stringify(oldData, null, 2))

	if (oldData.length === 0) {
		console.error('❌ No data fetched from API. Exiting.')
		process.exit(1)
	}

	
	const firstRecord = oldData[0]
	const config = {
		testerId: firstRecord.testerId || MIGRATION_CONFIG.testerId,
		tenantId: firstRecord.clientId || MIGRATION_CONFIG.tenantId,
		warehouseId: firstRecord.warehouseId || MIGRATION_CONFIG.warehouseId,
	}

	// console.log('📋 Migration Configuration:')
	// console.log(`   Tester ID: ${config.testerId}`)
	// console.log(`   Tenant ID: ${config.tenantId}`)
	// console.log(`   Warehouse ID: ${config.warehouseId}`)
	// console.log()

	// // Step 3: Migrate data
	// console.log('🔄 Starting migration process...')
	// console.log(`📊 Total records to migrate: ${oldData.length}`)
	// console.log('⏳ This may take a while...\n')

	// // Choose migration method based on data size
	// const useBatch = oldData.length > 50
	// console.log(`📦 Using ${useBatch ? 'batch' : 'detailed'} migration method\n`)

	// const migrationStartTime = Date.now()

	// const result = useBatch
	// 	? await migrateOldDataBatch(oldData, config)
	// 	: await migrateOldData(oldData, config)

	// const migrationDuration = ((Date.now() - migrationStartTime) / 1000).toFixed(2)
	// const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2)

	// // Step 4: Display results
	// console.log('\n' + '='.repeat(60))
	// console.log('📈 MIGRATION COMPLETE')
	// console.log('='.repeat(60))
	// console.log(`✅ Success: ${result.success}`)
	// console.log(`❌ Failed: ${result.failed}`)
	// console.log(`📊 Success Rate: ${((result.success / oldData.length) * 100).toFixed(1)}%`)
	// console.log(`⏱️  Fetch Duration: ${((migrationStartTime - startTime) / 1000).toFixed(2)}s`)
	// console.log(`⏱️  Migration Duration: ${migrationDuration}s`)
	// console.log(`⏱️  Total Duration: ${totalDuration}s`)

	// if (result.errors.length > 0) {
	// 	console.log('\n❌ Errors:')
	// 	result.errors.slice(0, 10).forEach((err, idx) => {
	// 		const identifier = err.record.imei || err.record.serial || err.record.lpn || 'unknown'
	// 		console.log(`  ${idx + 1}. ${identifier}: ${err.error}`)
	// 	})
		
	// 	if (result.errors.length > 10) {
	// 		console.log(`  ... and ${result.errors.length - 10} more errors`)
	// 	}

	// 	// Save errors to file
	// 	try {
	// 		await Bun.write(
	// 			'migration-errors.json',
	// 			JSON.stringify(result.errors, null, 2)
	// 		)
	// 		console.log('\n💾 All errors saved to: migration-errors.json')
	// 	} catch (error) {
	// 		console.error('Failed to save errors to file:', error)
	// 	}
	// }

	// console.log('\n✨ Migration process finished!')
	// console.log('='.repeat(60))
}

// Run the migration
runMigrationFromLiveAPI().catch((error) => {
	console.error('\n💥 Fatal error during migration:')
	console.error(error)
	process.exit(1)
})
