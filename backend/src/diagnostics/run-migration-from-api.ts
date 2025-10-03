import { migrateOldData, migrateOldDataBatch } from './migrate-old-data'

/**
 * Migration script for SAVED API response data
 * 
 * Run with: bun run src/diagnostics/run-migration-from-api.ts
 * 
 * This script handles the API response format with nested data structure.
 * Use this when you have already saved the API response.
 * 
 * For LIVE API fetching, use: run-migration-from-live-api.ts
 */

// Paste your API response here
const apiResponse = {
	"status": true,
	"message": "data fetched successfully",
	"data": {
		"data": [
			// Your data array goes here
			// Or import from a JSON file:
			// ...require('./api-response.json').data.data
		]
	}
}

async function runMigrationFromAPI() {
	// Extract the actual data array from the API response
	const oldData = apiResponse?.data?.data || []

	if (!Array.isArray(oldData) || oldData.length === 0) {
		console.error('❌ No data to migrate. Please paste your API response in the apiResponse variable.')
		console.log('\nExpected format:')
		console.log('{')
		console.log('  "status": true,')
		console.log('  "message": "data fetched successfully",')
		console.log('  "data": {')
		console.log('    "data": [ /* your records here */ ]')
		console.log('  }')
		console.log('}')
		process.exit(1)
	}

	console.log('🚀 Starting migration from API response...')
	console.log(`📊 Total records to migrate: ${oldData.length}`)
	console.log('⏳ This may take a while...\n')

	const startTime = Date.now()

	// Configuration - extracted from the data
	const firstRecord = oldData[0]
	const config = {
		testerId: firstRecord.testerId || 52,
		tenantId: firstRecord.clientId || 15,
		warehouseId: firstRecord.warehouseId || 10,
	}

	console.log('📋 Configuration (auto-detected from data):')
	console.log(`   Tester ID: ${config.testerId}`)
	console.log(`   Tenant ID: ${config.tenantId}`)
	console.log(`   Warehouse ID: ${config.warehouseId}\n`)

	// Choose migration method based on data size
	const useBatch = oldData.length > 50
	console.log(`📦 Using ${useBatch ? 'batch' : 'detailed'} migration method\n`)

	const result = useBatch
		? await migrateOldDataBatch(oldData, config)
		: await migrateOldData(oldData, config)

	const duration = ((Date.now() - startTime) / 1000).toFixed(2)

	console.log('\n' + '='.repeat(50))
	console.log('📈 Migration Complete')
	console.log('='.repeat(50))
	console.log(`✅ Success: ${result.success}`)
	console.log(`❌ Failed: ${result.failed}`)
	console.log(`⏱️  Duration: ${duration}s`)
	console.log(`📊 Success Rate: ${((result.success / oldData.length) * 100).toFixed(1)}%`)

	if (result.errors.length > 0) {
		console.log('\n❌ Errors:')
		result.errors.slice(0, 10).forEach((err, idx) => {
			const identifier = err.record.imei || err.record.serial || err.record.lpn || 'unknown'
			console.log(`  ${idx + 1}. ${identifier}: ${err.error}`)
		})
		
		if (result.errors.length > 10) {
			console.log(`  ... and ${result.errors.length - 10} more errors`)
		}
	}

	console.log('\n✨ Migration process finished!')
}

// Run the migration
runMigrationFromAPI().catch((error) => {
	console.error('\n💥 Fatal error during migration:')
	console.error(error)
	process.exit(1)
})
