import Elysia from 'elysia'
import { db } from '../db'
import { LicensingRepository } from './repository'
import { LicensingService } from './service'
import { LicensingController } from './controller'
import {
	AuthorizeTestBody,
	CreateLicenseTypeBody,
	ManualAdjustmentBody,
	UsageReportQuery,
	CreateLicenseRequestBody,
	ReviewLicenseRequestBody,
	QuickGrantBody,
} from './types'
import { requireRole } from '../auth'

const repo = new LicensingRepository(db)
const service = new LicensingService(repo)
const controller = new LicensingController(service)

export const licensing_routes = new Elysia({ prefix: '/licensing' })
	.use(requireRole([]))
	
	// Core authorization endpoint - used by testing software
	.post(
		'/authorize-test',
		async (ctx) => {
			const { body, currentTenantId, currentUserId } = ctx as any
			return controller.authorizeTest(body, Number(currentTenantId), Number(currentUserId))
		},
		{
			body: AuthorizeTestBody,
			detail: {
				tags: ['Licensing'],
				summary: 'Authorize a test and consume license if needed',
				description: 'Checks for 30-day retest window, customer type, and balance before authorizing test',
			},
		}
	)

	// Get license balances for current tenant
	.get(
		'/balances',
		async (ctx) => {
			const { query, currentTenantId } = ctx as any
			const search = query.search as string | undefined
			return controller.getBalances(Number(currentTenantId), search)
		},
		{
			detail: {
				tags: ['Licensing'],
				summary: 'Get license balances for current tenant',
			},
		}
	)

	// Get ledger history for current tenant
	.get(
		'/ledger',
		async (ctx) => {
			const { query, currentTenantId } = ctx as any
			const licenseTypeId = query.license_type_id ? Number(query.license_type_id) : undefined
			const transactionType = query.transaction_type as string | undefined
			const search = query.search as string | undefined
			return controller.getLedgerHistory(Number(currentTenantId), licenseTypeId, transactionType, search)
		},
		{
			detail: {
				tags: ['Licensing'],
				summary: 'Get ledger transaction history',
			},
		}
	)

	// List all license types
	.get(
		'/license-types',
		async (ctx) => {
			const { query } = ctx as any
			const search = query.search as string | undefined
			return controller.listLicenseTypes(search)
		},
		{
			detail: {
				tags: ['Licensing'],
				summary: 'List all available license types',
			},
		}
	)

	// Create new license type (superadmin only)
	.post(
		'/license-types',
		async (ctx) => {
			const { body, currentRole } = ctx as any
			return controller.createLicenseType(body, currentRole)
		},
		{
			body: CreateLicenseTypeBody,
			detail: {
				tags: ['Licensing'],
				summary: 'Create new license type (superadmin only)',
			},
		}
	)

	// Manual license adjustment (superadmin only)
	.post(
		'/adjustments',
		async (ctx) => {
			const { body, currentUserId, currentRole } = ctx as any
			return controller.manualAdjustment(body, Number(currentUserId), currentRole)
		},
		{
			body: ManualAdjustmentBody,
			detail: {
				tags: ['Licensing'],
				summary: 'Manual license adjustment (superadmin only)',
			},
		}
	)

	// Usage report (superadmin only)
	.get(
		'/reports/usage',
		async (ctx) => {
			const { query, currentRole } = ctx as any
			return controller.getUsageReport(query, currentRole)
		},
		{
			query: UsageReportQuery,
			detail: {
				tags: ['Licensing'],
				summary: 'Generate usage report for credit customers (superadmin only)',
			},
		}
	)

	// Export usage report as CSV (superadmin only)
	.get(
		'/reports/usage/export',
		async (ctx) => {
			const { query, set, currentRole } = ctx as any
			const res = await controller.exportUsageReport(query, currentRole)
			set.headers = { ...(set.headers ?? {}), ...res.headers } as any
			set.status = res.status as any
			return res.body
		},
		{
			query: UsageReportQuery,
			detail: {
				tags: ['Licensing'],
				summary: 'Export usage report as CSV (superadmin only)',
			},
		}
	)

	// License Request Routes
	
	// Create license request
	.post(
		'/requests',
		async (ctx) => {
			const { body, currentTenantId, currentUserId } = ctx as any
			return controller.createLicenseRequest(body, Number(currentTenantId), Number(currentUserId))
		},
		{
			body: CreateLicenseRequestBody,
			detail: {
				tags: ['Licensing'],
				summary: 'Create a license request',
			},
		}
	)

	// List license requests
	.get(
		'/requests',
		async (ctx) => {
			const { query, currentTenantId, currentUserId, currentRole } = ctx as any
			const isSuperAdmin = currentRole === 'super_admin'
			const status = query.status as 'pending' | 'approved' | 'rejected' | undefined
			const search = query.search as string | undefined
			return controller.listLicenseRequests(Number(currentTenantId), Number(currentUserId), isSuperAdmin, status, search)
		},
		{
			detail: {
				tags: ['Licensing'],
				summary: 'List license requests',
			},
		}
	)

	// Get single license request
	.get(
		'/requests/:id',
		async (ctx) => {
			const { params } = ctx as any
			return controller.getLicenseRequest(Number(params.id))
		},
		{
			detail: {
				tags: ['Licensing'],
				summary: 'Get a single license request',
			},
		}
	)

	// Review license request (approve/reject)
	.post(
		'/requests/:id/review',
		async (ctx) => {
			const { params, body, currentUserId, currentRole } = ctx as any
			
			// Only superadmin can review
			if (currentRole !== 'super_admin') {
				return {
					data: null,
					message: 'Only superadmins can review license requests',
					status: 403,
				}
			}
			
			return controller.reviewLicenseRequest(Number(params.id), body, Number(currentUserId))
		},
		{
			body: ReviewLicenseRequestBody,
			detail: {
				tags: ['Licensing'],
				summary: 'Review (approve/reject) a license request (superadmin only)',
			},
		}
	)

	// Quick grant licenses
	.post(
		'/quick-grant',
		async (ctx) => {
			const { body, currentUserId, currentRole } = ctx as any
			
			// Only superadmin can quick grant
			if (currentRole !== 'super_admin') {
				return {
					data: null,
					message: 'Only superadmins can quick grant licenses',
					status: 403,
				}
			}
			
			return controller.quickGrant(body, Number(currentUserId))
		},
		{
			body: QuickGrantBody,
			detail: {
				tags: ['Licensing'],
				summary: 'Quick grant licenses to a tenant (superadmin only)',
			},
		}
	)

// Export service for use in other modules
export { service as licensingService }
