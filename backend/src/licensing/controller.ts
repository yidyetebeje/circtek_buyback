import type { response } from '../types/response'
import { LicensingService } from './service'
import type {
	AuthorizeTestInput,
	AuthorizationResult,
	CreateLicenseTypeInput,
	ManualAdjustmentInput,
	UsageReportQueryInput,
	LicenseBalance,
	UsageReportEntry,
	LicenseType,
	LicenseLedgerEntry,
	CreateLicenseRequestInput,
	ReviewLicenseRequestInput,
	QuickGrantInput,
	LicenseRequest,
} from './types'

export class LicensingController {
	constructor(private readonly service: LicensingService) {}

	/**
	 * POST /api/v1/licensing/authorize-test
	 * Core endpoint for test authorization
	 */
	async authorizeTest(
		body: AuthorizeTestInput,
		tenantId: number,
		userId?: number
	): Promise<response<AuthorizationResult>> {
		try {
			const result = await this.service.authorizeTest(tenantId, body, userId)

			if (!result.authorized) {
				const statusCode = result.reason === 'insufficient_licenses' ? 402 : 400
				return {
					data: result,
					message:
						result.reason === 'insufficient_licenses'
							? 'Insufficient licenses'
							: 'Invalid license type',
					status: statusCode,
				}
			}

			return {
				data: result,
				message: result.reason === 'free_retest' ? 'Free retest authorized' : 'License consumed',
				status: 200,
			}
		} catch (error) {
			console.error('Error authorizing test:', error)
			return {
				data: {
					authorized: false,
					reason: 'invalid_license_type',
				} as AuthorizationResult,
				message: 'Failed to authorize test',
				status: 500,
			}
		}
	}

	/**
	 * GET /api/v1/licensing/balances
	 * Get license balances for current tenant
	 */
	async getBalances(tenantId: number, search?: string): Promise<response<LicenseBalance[]>> {
		try {
			const balances = await this.service.getTenantBalances(tenantId, search)
			return {
				data: balances,
				message: 'OK',
				status: 200,
			}
		} catch (error) {
			console.error('Error fetching balances:', error)
			return {
				data: [],
				message: 'Failed to fetch balances',
				status: 500,
			}
		}
	}

	/**
	 * GET /api/v1/licensing/reports/usage
	 * Generate usage report for credit customers (superadmin only)
	 */
	async getUsageReport(
		query: UsageReportQueryInput,
		role?: string
	): Promise<response<UsageReportEntry[]>> {
		if (role !== 'super_admin') {
			return {
				data: [],
				message: 'Unauthorized',
				status: 403,
			}
		}

		try {
			const report = await this.service.getUsageReport(
				query.start_date,
				query.end_date,
				query.tenant_id
			)
			return {
				data: report,
				message: 'OK',
				status: 200,
			}
		} catch (error) {
			console.error('Error generating usage report:', error)
			return {
				data: [],
				message: 'Failed to generate report',
				status: 500,
			}
		}
	}

	/**
	 * POST /api/v1/licensing/license-types
	 * Create new license type (superadmin only)
	 */
	async createLicenseType(
		body: CreateLicenseTypeInput,
		role?: string
	): Promise<response<LicenseType | null>> {
		if (role !== 'super_admin') {
			return {
				data: null,
				message: 'Unauthorized',
				status: 403,
			}
		}

		try {
			const licenseType = await this.service.createLicenseType(body)
			return {
				data: licenseType,
				message: 'License type created',
				status: 201,
			}
		} catch (error) {
			console.error('Error creating license type:', error)
			return {
				data: null,
				message: 'Failed to create license type',
				status: 500,
			}
		}
	}

	/**
	 * GET /api/v1/licensing/license-types
	 * List all license types
	 */
	async listLicenseTypes(search?: string): Promise<response<LicenseType[]>> {
		try {
			const types = await this.service.listLicenseTypes(search)
			return {
				data: types,
				message: 'OK',
				status: 200,
			}
		} catch (error) {
			console.error('Error listing license types:', error)
			return {
				data: [],
				message: 'Failed to list license types',
				status: 500,
			}
		}
	}

	/**
	 * POST /api/v1/licensing/adjustments
	 * Manual license adjustment (superadmin only)
	 */
	async manualAdjustment(
		body: ManualAdjustmentInput,
		userId: number,
		role?: string
	): Promise<response<LicenseLedgerEntry | null>> {
		if (role !== 'super_admin') {
			return {
				data: null,
				message: 'Unauthorized',
				status: 403,
			}
		}

		try {
			const entry = await this.service.manualAdjustment(body, userId)
			return {
				data: entry,
				message: 'License adjustment recorded',
				status: 201,
			}
		} catch (error) {
			console.error('Error creating adjustment:', error)
			return {
				data: null,
				message: 'Failed to create adjustment',
				status: 500,
			}
		}
	}

	/**
	 * GET /api/v1/licensing/ledger
	 * Get ledger history for current tenant
	 */
	async getLedgerHistory(
		tenantId: number,
		licenseTypeId?: number,
		transactionType?: string,
		search?: string
	): Promise<response<LicenseLedgerEntry[]>> {
		try {
			const history = await this.service.getLedgerHistory(tenantId, licenseTypeId, transactionType, search)
			return {
				data: history,
				message: 'OK',
				status: 200,
			}
		} catch (error) {
			console.error('Error fetching ledger history:', error)
			return {
				data: [],
				message: 'Failed to fetch ledger history',
				status: 500,
			}
		}
	}

	/**
	 * Export usage report as CSV (superadmin only)
	 */
	async exportUsageReport(
		query: UsageReportQueryInput,
		role?: string
	): Promise<{ headers: Record<string, string>; body: string; status: number }> {
		if (role !== 'super_admin') {
			return {
				headers: { 'Content-Type': 'text/plain' },
				body: 'Unauthorized',
				status: 403,
			}
		}

		try {
			const report = await this.service.getUsageReport(
				query.start_date,
				query.end_date,
				query.tenant_id
			)

			const header = [
				'Tenant ID',
				'Tenant Name',
				'License Type',
				'Product Category',
				'Test Type',
				'Quantity Used',
				'Unit Price',
				'Total Price',
			]

			const csv = [
				header.join(','),
				...report.map((r) =>
					[
						r.tenant_id,
						r.tenant_name,
						r.license_type_name,
						r.product_category,
						r.test_type,
						r.quantity_used,
						r.unit_price,
						r.total_price,
					]
						.map((v) =>
							typeof v === 'string' && v.includes(',')
								? `"${v.replace(/"/g, '""')}"`
								: String(v)
						)
						.join(',')
				),
			].join('\n')

			return {
				headers: {
					'Content-Type': 'text/csv; charset=utf-8',
					'Content-Disposition': `attachment; filename="license_usage_${query.start_date}_${query.end_date}.csv"`,
				},
				body: csv,
				status: 200,
			}
		} catch (error) {
			console.error('Error exporting usage report:', error)
			return {
				headers: { 'Content-Type': 'text/plain' },
				body: 'Failed to export report',
				status: 500,
			}
		}
	}

	/**
	 * POST /api/v1/licensing/requests
	 * Create a license request
	 */
	async createLicenseRequest(
		body: CreateLicenseRequestInput,
		tenantId: number,
		userId: number
	): Promise<response<LicenseRequest>> {
		try {
			const request = await this.service.createLicenseRequest(tenantId, userId, body)
			return {
				data: request,
				message: 'License request created successfully',
				status: 201,
			}
		} catch (error) {
			console.error('Error creating license request:', error)
			return {
				data: null as any,
				message: error instanceof Error ? error.message : 'Failed to create license request',
				status: 500,
			}
		}
	}

	/**
	 * GET /api/v1/licensing/requests
	 * List license requests (filtered by role)
	 */
	async listLicenseRequests(
		tenantId: number,
		userId: number,
		isSuperAdmin: boolean,
		status?: 'pending' | 'approved' | 'rejected',
		search?: string
	): Promise<response<LicenseRequest[]>> {
		try {
			const filters: any = {}
			
			// Super admins see all requests, regular users see only their tenant's
			if (!isSuperAdmin) {
				filters.tenant_id = tenantId
			}
			
			if (status) {
				filters.status = status
			}
			
			if (search) {
				filters.search = search
			}

			const requests = await this.service.listLicenseRequests(filters)
			return {
				data: requests,
				message: 'License requests retrieved successfully',
				status: 200,
			}
		} catch (error) {
			console.error('Error listing license requests:', error)
			return {
				data: [],
				message: 'Failed to retrieve license requests',
				status: 500,
			}
		}
	}

	/**
	 * GET /api/v1/licensing/requests/:id
	 * Get a single license request
	 */
	async getLicenseRequest(id: number): Promise<response<LicenseRequest>> {
		try {
			const request = await this.service.getLicenseRequest(id)
			return {
				data: request,
				message: 'License request retrieved successfully',
				status: 200,
			}
		} catch (error) {
			console.error('Error getting license request:', error)
			return {
				data: null as any,
				message: error instanceof Error ? error.message : 'Failed to retrieve license request',
				status: 404,
			}
		}
	}

	/**
	 * POST /api/v1/licensing/requests/:id/review
	 * Review (approve/reject) a license request
	 */
	async reviewLicenseRequest(
		id: number,
		body: ReviewLicenseRequestInput,
		reviewerId: number
	): Promise<response<LicenseRequest>> {
		try {
			let request: LicenseRequest

			if (body.action === 'approve') {
				request = await this.service.approveLicenseRequest(id, reviewerId)
			} else {
				if (!body.rejection_reason) {
					return {
						data: null as any,
						message: 'Rejection reason is required',
						status: 400,
					}
				}
				request = await this.service.rejectLicenseRequest(id, reviewerId, body.rejection_reason)
			}

			return {
				data: request,
				message: `License request ${body.action}d successfully`,
				status: 200,
			}
		} catch (error) {
			console.error('Error reviewing license request:', error)
			return {
				data: null as any,
				message: error instanceof Error ? error.message : 'Failed to review license request',
				status: 500,
			}
		}
	}

	/**
	 * POST /api/v1/licensing/quick-grant
	 * Quick grant licenses to a tenant (superadmin only)
	 */
	async quickGrant(
		body: QuickGrantInput,
		grantedBy: number
	): Promise<response<any>> {
		try {
			const entries = await this.service.quickGrant(body, grantedBy)
			return {
				data: entries,
				message: 'Licenses granted successfully',
				status: 200,
			}
		} catch (error) {
			console.error('Error granting licenses:', error)
			return {
				data: null,
				message: error instanceof Error ? error.message : 'Failed to grant licenses',
				status: 500,
			}
		}
	}
}
