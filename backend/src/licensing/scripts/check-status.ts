/**
 * Script: Check Licensing System Status
 * 
 * This script checks the current state of the licensing system.
 * Useful for verifying setup and monitoring.
 * 
 * Usage:
 *   bun run backend/src/licensing/scripts/check-status.ts [tenant_id]
 */

import { db } from '../../db'
import { license_types, license_ledger, device_licenses, tenants } from '../../db/circtek.schema'
import { eq, sql, and, gte } from 'drizzle-orm'

async function checkSystemStatus(tenantId?: number) {
	console.log('\n📊 Licensing System Status Check\n')
	console.log('='.repeat(60))

	try {
		// Check license types
		const licenseTypesList = await db
			.select()
			.from(license_types)
			.where(eq(license_types.status, true))

		console.log(`\n📋 License Types: ${licenseTypesList.length} active`)
		licenseTypesList.forEach(lt => {
			console.log(`   • ${lt.name} (${lt.product_category}/${lt.test_type}) - $${lt.price}`)
		})

		// Check tenants
		if (tenantId) {
			const [tenant] = await db
				.select()
				.from(tenants)
				.where(eq(tenants.id, tenantId))

			if (!tenant) {
				console.error(`\n❌ Tenant ${tenantId} not found`)
				process.exit(1)
			}

			console.log(`\n👤 Tenant: ${tenant.name}`)
			console.log(`   Account Type: ${tenant.account_type}`)
			console.log(`   Status: ${tenant.status ? 'Active' : 'Inactive'}`)

			// Get balances
			const balances = await db
				.select({
					license_type_id: license_types.id,
					license_type_name: license_types.name,
					product_category: license_types.product_category,
					test_type: license_types.test_type,
					price: license_types.price,
					balance: sql<number>`COALESCE(SUM(${license_ledger.amount}), 0)`,
				})
				.from(license_types)
				.leftJoin(
					license_ledger,
					and(
						eq(license_ledger.license_type_id, license_types.id),
						eq(license_ledger.tenant_id, tenantId)
					)
				)
				.where(eq(license_types.status, true))
				.groupBy(
					license_types.id,
					license_types.name,
					license_types.product_category,
					license_types.test_type,
					license_types.price
				)

			console.log(`\n💰 License Balances:`)
			let totalValue = 0
			balances.forEach(b => {
				const balance = Number(b.balance)
				const value = balance * Number(b.price)
				totalValue += value
				const status = balance > 0 ? '✓' : (balance === 0 ? '⚠' : '✗')
				console.log(`   ${status} ${b.license_type_name}: ${balance} ($${value.toFixed(2)})`)
			})
			console.log(`   Total Value: $${totalValue.toFixed(2)}`)

			// Get recent transactions
			const recentTransactions = await db
				.select({
					id: license_ledger.id,
					license_type_name: license_types.name,
					amount: license_ledger.amount,
					transaction_type: license_ledger.transaction_type,
					device_identifier: license_ledger.device_identifier,
					created_at: license_ledger.created_at,
				})
				.from(license_ledger)
				.innerJoin(license_types, eq(license_ledger.license_type_id, license_types.id))
				.where(eq(license_ledger.tenant_id, tenantId))
				.orderBy(sql`${license_ledger.created_at} DESC`)
				.limit(10)

			console.log(`\n📝 Recent Transactions (last 10):`)
			if (recentTransactions.length === 0) {
				console.log('   No transactions found')
			} else {
				recentTransactions.forEach(t => {
					const sign = t.amount > 0 ? '+' : ''
					const device = t.device_identifier ? ` [${t.device_identifier}]` : ''
					console.log(`   ${t.created_at?.toISOString().split('T')[0]} | ${t.transaction_type.padEnd(10)} | ${sign}${t.amount} | ${t.license_type_name}${device}`)
				})
			}

			// Get active retest windows
			const now = new Date()
			const activeWindows = await db
				.select({
					device_identifier: device_licenses.device_identifier,
					license_type_name: license_types.name,
					activated_at: device_licenses.license_activated_at,
					valid_until: device_licenses.retest_valid_until,
				})
				.from(device_licenses)
				.innerJoin(license_types, eq(device_licenses.license_type_id, license_types.id))
				.where(
					and(
						eq(device_licenses.tenant_id, tenantId),
						gte(device_licenses.retest_valid_until, now)
					)
				)
				.orderBy(sql`${device_licenses.retest_valid_until} DESC`)
				.limit(10)

			console.log(`\n🔄 Active Retest Windows (last 10):`)
			if (activeWindows.length === 0) {
				console.log('   No active retest windows')
			} else {
				activeWindows.forEach(w => {
					const daysLeft = Math.ceil((w.valid_until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
					console.log(`   ${w.device_identifier} | ${w.license_type_name} | ${daysLeft} days left`)
				})
			}
		} else {
			// Show all tenants summary
			const allTenants = await db
				.select({
					id: tenants.id,
					name: tenants.name,
					account_type: tenants.account_type,
					status: tenants.status,
				})
				.from(tenants)
				.where(eq(tenants.status, true))

			console.log(`\n👥 Active Tenants: ${allTenants.length}`)
			
			for (const tenant of allTenants) {
				const [balanceInfo] = await db
					.select({
						total_balance: sql<number>`SUM(${license_ledger.amount})`,
						transaction_count: sql<number>`COUNT(*)`,
					})
					.from(license_ledger)
					.where(eq(license_ledger.tenant_id, tenant.id))

				const balance = Number(balanceInfo?.total_balance ?? 0)
				const txCount = Number(balanceInfo?.transaction_count ?? 0)
				
				console.log(`   • ${tenant.name} (${tenant.account_type})`)
				console.log(`     Balance: ${balance} licenses | Transactions: ${txCount}`)
			}
		}

		// System-wide statistics
		console.log(`\n📈 System-Wide Statistics:`)
		
		const [totalStats] = await db
			.select({
				total_licenses_granted: sql<number>`SUM(CASE WHEN ${license_ledger.amount} > 0 THEN ${license_ledger.amount} ELSE 0 END)`,
				total_licenses_used: sql<number>`ABS(SUM(CASE WHEN ${license_ledger.amount} < 0 THEN ${license_ledger.amount} ELSE 0 END))`,
				total_transactions: sql<number>`COUNT(*)`,
			})
			.from(license_ledger)

		const granted = Number(totalStats?.total_licenses_granted ?? 0)
		const used = Number(totalStats?.total_licenses_used ?? 0)
		const remaining = granted - used

		console.log(`   Total Licenses Granted: ${granted}`)
		console.log(`   Total Licenses Used: ${used}`)
		console.log(`   Remaining Balance: ${remaining}`)
		console.log(`   Total Transactions: ${Number(totalStats?.total_transactions ?? 0)}`)

		const [windowStats] = await db
			.select({
				total_windows: sql<number>`COUNT(*)`,
				active_windows: sql<number>`SUM(CASE WHEN ${device_licenses.retest_valid_until} >= NOW() THEN 1 ELSE 0 END)`,
				unique_devices: sql<number>`COUNT(DISTINCT ${device_licenses.device_identifier})`,
			})
			.from(device_licenses)

		console.log(`   Total Retest Windows: ${Number(windowStats?.total_windows ?? 0)}`)
		console.log(`   Active Retest Windows: ${Number(windowStats?.active_windows ?? 0)}`)
		console.log(`   Unique Devices Tested: ${Number(windowStats?.unique_devices ?? 0)}`)

		console.log('\n' + '='.repeat(60))
		console.log('✅ Status check complete!\n')
	} catch (error) {
		console.error('❌ Error checking status:', error)
		throw error
	} finally {
		process.exit(0)
	}
}

// Parse command line arguments
const args = process.argv.slice(2)
const tenantId = args[0] ? parseInt(args[0]) : undefined

if (tenantId && isNaN(tenantId)) {
	console.error('❌ Invalid tenant ID. Must be a number.')
	process.exit(1)
}

checkSystemStatus(tenantId)
