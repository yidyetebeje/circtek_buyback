import { migrateOldData, migrateOldDataBatch } from './migrate-old-data'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Migration script that loads data from a JSON file
 * 
 * Usage:
 *   bun run src/diagnostics/run-migration-from-file.ts <path-to-json-file>
 * 
 * Example:
 *   bun run src/diagnostics/run-migration-from-file.ts ./old-data.json
 */

async function runMigrationFromFile() {
	const args = process.argv.slice(2)
	
	if (args.length === 0) {
		console.error('❌ Error: Please provide a path to the JSON file')
		console.log('\nUsage:')
		console.log('  bun run src/diagnostics/run-migration-from-file.ts <path-to-json-file>')
		console.log('\nExample:')
		console.log('  bun run src/diagnostics/run-migration-from-file.ts ./old-data.json')
		process.exit(1)
	}

	const filePath = path.resolve(args[0])

	// Check if file exists
	if (!fs.existsSync(filePath)) {
		console.error(`❌ Error: File not found: ${filePath}`)
		process.exit(1)
	}

	// Read and parse JSON file
	console.log(`📂 Loading data from: ${filePath}`)
	let oldData: any[]
	
	try {
		const fileContent = fs.readFileSync(filePath, 'utf-8')
		oldData = JSON.parse(fileContent)
		
		if (!Array.isArray(oldData)) {
			console.error('❌ Error: JSON file must contain an array of records')
			process.exit(1)
		}
	} catch (error) {
		console.error('❌ Error reading or parsing JSON file:')
		console.error(error)
		process.exit(1)
	}

	if (oldData.length === 0) {
		console.error('❌ No data to migrate. The JSON file is empty.')
		process.exit(1)
	}

	console.log(`✅ Loaded ${oldData.length} records`)
	console.log('🚀 Starting migration...')
	console.log('⏳ This may take a while...')
	console.log('📅 Timestamps will be preserved from original testing time\n')

	const startTime = Date.now()

	// Configuration - UPDATE THESE VALUES
	const config = {
		testerId: 4,    // Replace with actual tester ID
		tenantId: 16,    // Replace with actual tenant ID
		warehouseId: 18, // Replace with actual warehouse ID
		token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjQsInJvbGUiOiJ0ZXN0ZXIiLCJ0ZW5hbnRfaWQiOjE2LCJ3YXJlaG91c2VfaWQiOjE4LCJtYW5hZ2VkX3Nob3BfaWQiOm51bGwsImV4cCI6MTc2MjM2NDA2NywiaWF0IjoxNzU5NzcyMDY3fQ.7Xv7fUR2MmnsR27hmJ3vpCIC86_3ffd_0BsUiysDoNY'
	}

	console.log('📋 Configuration:')
	console.log(`   Tester ID: ${config.testerId}`)
	console.log(`   Tenant ID: ${config.tenantId}`)
	console.log(`   Warehouse ID: ${config.warehouseId}\n`)

	// Choose migration method based on data size
	const useBatch = oldData.length > 50
	console.log(`📦 Using ${useBatch ? 'batch' : 'detailed'} migration method\n`)

	const result = await migrateOldData(oldData, config)

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
		
		// Save errors to file
		const errorFilePath = path.join(path.dirname(filePath), 'migration-errors.json')
		fs.writeFileSync(errorFilePath, JSON.stringify(result.errors, null, 2))
		console.log(`\n💾 All errors saved to: ${errorFilePath}`)
	}

	console.log('\n✨ Migration process finished!')
}

// Run the migration
runMigrationFromFile().catch((error) => {
	console.error('\n💥 Fatal error during migration:')
	console.error(error)
	process.exit(1)
})
