/**
 * Script: Grant Initial Licenses to Tenants
 * 
 * This script grants initial licenses to prepaid tenants.
 * Useful for onboarding new customers or migration.
 * 
 * Usage:
 *   bun run backend/src/licensing/scripts/grant-initial-licenses.ts <tenant_id> <license_type_id> <amount>
 * 
 * Example:
 *   bun run backend/src/licensing/scripts/grant-initial-licenses.ts 1 1 100
 */

import { db } from '../../db'
import { license_ledger, license_types, tenants } from '../../db/circtek.schema'
import { eq } from 'drizzle-orm'

async function grantLicenses(tenantId: number, licenseTypeId: number, amount: number) {
	console.log(`\n📦 Granting ${amount} licenses to tenant ${tenantId}...`)

	try {
		// Verify tenant exists
		const [tenant] = await db
			.select({ id: tenants.id, name: tenants.name, account_type: tenants.account_type })
			.from(tenants)
			.where(eq(tenants.id, tenantId))

		if (!tenant) {
			console.error(`❌ Tenant ${tenantId} not found`)
			process.exit(1)
		}

		console.log(`   Tenant: ${tenant.name} (${tenant.account_type})`)

		// Verify license type exists
		const [licenseType] = await db
			.select()
			.from(license_types)
			.where(eq(license_types.id, licenseTypeId))

		if (!licenseType) {
			console.error(`❌ License type ${licenseTypeId} not found`)
			process.exit(1)
		}

		console.log(`   License: ${licenseType.name} ($${licenseType.price})`)

		// Create ledger entry
		await db.insert(license_ledger).values({
			tenant_id: tenantId,
			license_type_id: licenseTypeId,
			amount: amount,
			transaction_type: 'purchase',
			reference_type: 'manual',
			notes: 'Initial license grant via script',
			created_by: null,
		} as any)

		console.log(`\n✅ Successfully granted ${amount} licenses!`)
		console.log(`   Total value: $${(Number(licenseType.price) * amount).toFixed(2)}`)
	} catch (error) {
		console.error('❌ Error granting licenses:', error)
		throw error
	} finally {
		process.exit(0)
	}
}

async function grantAllLicenseTypes(tenantId: number, amountPerType: number) {
	console.log(`\n📦 Granting ${amountPerType} of each license type to tenant ${tenantId}...`)

	try {
		// Verify tenant exists
		const [tenant] = await db
			.select({ id: tenants.id, name: tenants.name, account_type: tenants.account_type })
			.from(tenants)
			.where(eq(tenants.id, tenantId))

		if (!tenant) {
			console.error(`❌ Tenant ${tenantId} not found`)
			process.exit(1)
		}

		console.log(`   Tenant: ${tenant.name} (${tenant.account_type})`)

		// Get all active license types
		const licenseTypesList = await db
			.select()
			.from(license_types)
			.where(eq(license_types.status, true))

		console.log(`\n   Found ${licenseTypesList.length} active license types`)

		let totalValue = 0

		for (const licenseType of licenseTypesList) {
			await db.insert(license_ledger).values({
				tenant_id: tenantId,
				license_type_id: licenseType.id,
				amount: amountPerType,
				transaction_type: 'purchase',
				reference_type: 'manual',
				notes: 'Initial license grant via script',
				created_by: null,
			} as any)

			const value = Number(licenseType.price) * amountPerType
			totalValue += value
			console.log(`   ✓ ${licenseType.name}: ${amountPerType} licenses ($${value.toFixed(2)})`)
		}

		console.log(`\n✅ Successfully granted licenses!`)
		console.log(`   Total licenses: ${amountPerType * licenseTypesList.length}`)
		console.log(`   Total value: $${totalValue.toFixed(2)}`)
	} catch (error) {
		console.error('❌ Error granting licenses:', error)
		throw error
	} finally {
		process.exit(0)
	}
}

// Parse command line arguments
const args = process.argv.slice(2)

if (args.length === 0) {
	console.log(`
Usage:
  Grant specific license type:
    bun run backend/src/licensing/scripts/grant-initial-licenses.ts <tenant_id> <license_type_id> <amount>

  Grant all license types:
    bun run backend/src/licensing/scripts/grant-initial-licenses.ts <tenant_id> all <amount_per_type>

Examples:
  bun run backend/src/licensing/scripts/grant-initial-licenses.ts 1 1 100
  bun run backend/src/licensing/scripts/grant-initial-licenses.ts 1 all 50
	`)
	process.exit(1)
}

const tenantId = parseInt(args[0])
const licenseTypeIdOrAll = args[1]
const amount = parseInt(args[2])

if (isNaN(tenantId) || isNaN(amount)) {
	console.error('❌ Invalid arguments. Tenant ID and amount must be numbers.')
	process.exit(1)
}

if (licenseTypeIdOrAll === 'all') {
	grantAllLicenseTypes(tenantId, amount)
} else {
	const licenseTypeId = parseInt(licenseTypeIdOrAll)
	if (isNaN(licenseTypeId)) {
		console.error('❌ Invalid license type ID. Must be a number or "all".')
		process.exit(1)
	}
	grantLicenses(tenantId, licenseTypeId, amount)
}
