/**
 * Seed Script: Initialize License Types
 * 
 * This script creates the default license types for the system.
 * Run this after the database migration to set up initial license types.
 * 
 * Usage:
 *   bun run backend/src/licensing/scripts/seed-license-types.ts
 */

import { db } from '../../db'
import { license_types } from '../../db/circtek.schema'

const defaultLicenseTypes = [
	{
		name: 'iPhone Diagnostic License',
		product_category: 'iPhone',
		test_type: 'Diagnostic',
		price: '2.50',
		description: 'License for iPhone diagnostic testing - includes all iPhone models',
	},
	{
		name: 'iPhone Erasure License',
		product_category: 'iPhone',
		test_type: 'Erasure',
		price: '1.50',
		description: 'License for iPhone data erasure and factory reset',
	},
	{
		name: 'MacBook Diagnostic License',
		product_category: 'Macbook',
		test_type: 'Diagnostic',
		price: '3.00',
		description: 'License for MacBook diagnostic testing - includes all MacBook models',
	},
	{
		name: 'MacBook Erasure License',
		product_category: 'Macbook',
		test_type: 'Erasure',
		price: '2.00',
		description: 'License for MacBook data erasure and factory reset',
	},
	{
		name: 'AirPods Diagnostic License',
		product_category: 'Airpods',
		test_type: 'Diagnostic',
		price: '1.00',
		description: 'License for AirPods diagnostic testing - includes all AirPods models',
	},
	{
		name: 'Android Diagnostic License',
		product_category: 'Android',
		test_type: 'Diagnostic',
		price: '2.00',
		description: 'License for Android device diagnostic testing',
	},
	{
		name: 'Android Erasure License',
		product_category: 'Android',
		test_type: 'Erasure',
		price: '1.50',
		description: 'License for Android device data erasure and factory reset',
	},
]

async function seedLicenseTypes() {
	console.log('🌱 Seeding license types...')

	try {
		// Check if license types already exist
		const existing = await db.select().from(license_types).limit(1)

		if (existing.length > 0) {
			console.log('⚠️  License types already exist. Skipping seed.')
			console.log('   To re-seed, first delete existing license types.')
			return
		}

		// Insert default license types
		for (const licenseType of defaultLicenseTypes) {
			await db.insert(license_types).values(licenseType as any)
			console.log(`✓ Created: ${licenseType.name} ($${licenseType.price})`)
		}

		console.log(`\n✅ Successfully seeded ${defaultLicenseTypes.length} license types!`)
		console.log('\nNext steps:')
		console.log('1. Set tenant account types (prepaid/credit)')
		console.log('2. Grant initial licenses to prepaid customers')
		console.log('3. Configure license types as needed')
	} catch (error) {
		console.error('❌ Error seeding license types:', error)
		throw error
	} finally {
		process.exit(0)
	}
}

// Run the seed function
seedLicenseTypes()
