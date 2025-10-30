import { migrateOldData, migrateOldDataBatch } from './migrate-old-data'

/**
 * Migration script for old database records
 * 
 * Run with: bun run src/diagnostics/run-migration.ts
 * 
 * IMPORTANT: Update testerId, tenantId, and warehouseId before running!
 */

// Your old data array
const oldData = [
	// Paste your old database records here or import from a JSON file
	// Example:
	// {
	//   "make": "apple",
	//   "modelNo": "NGJD3",
	//   "modelName": "iPhone 12",
	//   ...
	// }
]

async function runMigration() {
	if (oldData.length === 0) {
		console.error('❌ No data to migrate. Please add your old data to the oldData array.')
		process.exit(1)
	}

	console.log('🚀 Starting migration...')
	console.log(`📊 Total records to migrate: ${oldData.length}`)
	console.log('⏳ This may take a while...\n')

	const startTime = Date.now()

	// Choose migration method:
	// - migrateOldData: Detailed logging, slower (good for debugging)
	// - migrateOldDataBatch: Faster, less verbose (good for large datasets)
	
	const result = await migrateOldData(oldData, {
		testerId: 52,    // Replace with actual tester ID from your data
		tenantId: 15,    // Replace with actual tenant ID from your data
		warehouseId: 10, // Replace with actual warehouse ID from your data
	})

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
		result.errors.forEach((err, idx) => {
			const identifier = err.record.imei || err.record.serial || err.record.lpn || 'unknown'
			console.log(`  ${idx + 1}. ${identifier}: ${err.error}`)
		})
		
		// Optionally save errors to file
		// const fs = require('fs')
		// fs.writeFileSync('migration-errors.json', JSON.stringify(result.errors, null, 2))
		// console.log('\n💾 Errors saved to migration-errors.json')
	}

	console.log('\n✨ Migration process finished!')
}

// Run the migration
runMigration().catch((error) => {
	console.error('\n💥 Fatal error during migration:')
	console.error(error)
	process.exit(1)
})
