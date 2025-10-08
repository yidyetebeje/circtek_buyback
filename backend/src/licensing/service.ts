import { LicensingRepository } from './repository'
import type {
	AuthorizeTestInput,
	AuthorizationResult,
	CreateLicenseTypeInput,
	ManualAdjustmentInput,
	LicenseRequest,
} from './types'

export class LicensingService {
	constructor(private readonly repo: LicensingRepository) {}

	/**
	 * Core authorization logic for test requests
	 * Returns authorization decision based on:
	 * 1. Check for active 30-day retest window
	 * 2. Check customer type (prepaid/credit)
	 * 3. Check balance for prepaid customers
	 */
	async authorizeTest(
		tenantId: number,
		input: AuthorizeTestInput,
		userId?: number
	): Promise<AuthorizationResult> {
		// Step 1: Determine license type
		let licenseType
		if (input.license_type_id) {
			licenseType = await this.repo.findLicenseTypeById(input.license_type_id)
		} else if (input.product_category && input.test_type) {
			licenseType = await this.repo.findLicenseTypeByCategory(
				input.product_category,
				input.test_type
			)
		}

		if (!licenseType) {
			return {
				authorized: false,
				reason: 'invalid_license_type',
			}
		}

		// Step 2: Check for active device license (30-day retest window)
		const existingDeviceLicense = await this.repo.findActiveDeviceLicense(
			input.device_identifier,
			licenseType.id,
			tenantId
		)

		if (existingDeviceLicense) {
			// Free retest within 30-day window
			return {
				authorized: true,
				reason: 'free_retest',
				license_type: licenseType,
				device_license: existingDeviceLicense,
			}
		}

		// Step 3: This is a chargeable test - check customer type
		const accountType = await this.repo.getTenantAccountType(tenantId)

		if (accountType === 'credit') {
			// Credit customers: consume license (can go negative)
			const ledgerEntry = await this.repo.createLedgerEntry({
				tenant_id: tenantId,
				license_type_id: licenseType.id,
				amount: -1,
				transaction_type: 'usage',
				reference_type: 'test_request',
				device_identifier: input.device_identifier,
				notes: `Test authorized for ${input.device_identifier}`,
				created_by: userId,
			})

			// Create 30-day retest window
			const now = new Date()
			const retestValidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

			const deviceLicense = await this.repo.createDeviceLicense({
				device_identifier: input.device_identifier,
				license_type_id: licenseType.id,
				tenant_id: tenantId,
				license_activated_at: now,
				retest_valid_until: retestValidUntil,
				ledger_entry_id: ledgerEntry.id,
			})

			const balance = await this.repo.getTenantLicenseBalance(
				tenantId,
				licenseType.id
			)

			return {
				authorized: true,
				reason: 'license_consumed',
				license_type: licenseType,
				device_license: deviceLicense,
				ledger_entry: ledgerEntry,
				balance_remaining: balance,
			}
		}

		// Prepaid customers: check balance
		const balance = await this.repo.getTenantLicenseBalance(
			tenantId,
			licenseType.id
		)

		if (balance <= 0) {
			return {
				authorized: false,
				reason: 'insufficient_licenses',
				license_type: licenseType,
				balance_remaining: balance,
			}
		}

		// Consume license for prepaid customer
		const ledgerEntry = await this.repo.createLedgerEntry({
			tenant_id: tenantId,
			license_type_id: licenseType.id,
			amount: -1,
			transaction_type: 'usage',
			reference_type: 'test_request',
			device_identifier: input.device_identifier,
			notes: `Test authorized for ${input.device_identifier}`,
			created_by: userId,
		})

		// Create 30-day retest window
		const now = new Date()
		const retestValidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

		const deviceLicense = await this.repo.createDeviceLicense({
			device_identifier: input.device_identifier,
			license_type_id: licenseType.id,
			tenant_id: tenantId,
			license_activated_at: now,
			retest_valid_until: retestValidUntil,
			ledger_entry_id: ledgerEntry.id,
		})

		const newBalance = await this.repo.getTenantLicenseBalance(
			tenantId,
			licenseType.id
		)

		return {
			authorized: true,
			reason: 'license_consumed',
			license_type: licenseType,
			device_license: deviceLicense,
			ledger_entry: ledgerEntry,
			balance_remaining: newBalance,
		}
	}

	/**
	 * Create a new license type (superadmin only)
	 */
	async createLicenseType(input: CreateLicenseTypeInput) {
		return this.repo.createLicenseType({
			name: input.name,
			product_category: input.product_category,
			test_type: input.test_type,
			price: input.price.toFixed(2),
			description: input.description,
		})
	}

	/**
	 * Manual license adjustment (superadmin only)
	 */
	async manualAdjustment(input: ManualAdjustmentInput, userId: number) {
		return this.repo.createLedgerEntry({
			tenant_id: input.tenant_id,
			license_type_id: input.license_type_id,
			amount: input.amount,
			transaction_type: 'adjustment',
			reference_type: 'manual',
			notes: input.notes,
			created_by: userId,
		})
	}

	/**
	 * Get all license balances for a tenant
	 */
	async getTenantBalances(tenantId: number, search?: string) {
		return this.repo.getTenantAllBalances(tenantId, search)
	}

	/**
	 * Get usage report for credit customers
	 */
	async getUsageReport(startDate: string, endDate: string, tenantId?: number) {
		const start = new Date(startDate)
		const end = new Date(endDate)
		return this.repo.getUsageReport(start, end, tenantId)
	}

	/**
	 * Get ledger history for a tenant
	 */
	async getLedgerHistory(
		tenantId: number,
		licenseTypeId?: number,
		transactionType?: string,
		search?: string
	) {
		return this.repo.getTenantLedgerHistory(tenantId, licenseTypeId, transactionType, search)
	}

	/**
	 * List all available license types
	 */
	async listLicenseTypes(search?: string) {
		return this.repo.listLicenseTypes(search)
	}

	/**
	 * Create a license request
	 */
	async createLicenseRequest(
		tenantId: number,
		userId: number,
		input: { items: Array<{ license_type_id: number; quantity: number; justification: string }>; notes?: string }
	) {
		// Validate all license types exist
		for (const item of input.items) {
			const licenseType = await this.repo.findLicenseTypeById(item.license_type_id)
			if (!licenseType) {
				throw new Error(`License type ${item.license_type_id} not found`)
			}
		}

		return this.repo.createLicenseRequest({
			tenant_id: tenantId,
			requested_by: userId,
			items: input.items,
			notes: input.notes,
		})
	}

	/**
	 * List license requests (filtered by role)
	 */
	async listLicenseRequests(filters: {
		tenant_id?: number
		status?: 'pending' | 'approved' | 'rejected'
		requested_by?: number
		search?: string
	}) {
		return this.repo.listLicenseRequests(filters)
	}

	/**
	 * Get a single license request
	 */
	async getLicenseRequest(id: number) {
		const request = await this.repo.findLicenseRequestById(id)
		if (!request) {
			throw new Error('License request not found')
		}
		return request
	}

	/**
	 * Approve a license request
	 */
	async approveLicenseRequest(requestId: number, reviewerId: number): Promise<LicenseRequest> {
		const request = await this.repo.findLicenseRequestById(requestId)
		if (!request) {
			throw new Error('License request not found')
		}

		if (request.status !== 'pending') {
			throw new Error('Request has already been reviewed')
		}

		// Create ledger entries for each item
		for (const item of request.items) {
			await this.repo.createLedgerEntry({
				tenant_id: request.tenant_id,
				license_type_id: item.license_type_id,
				amount: item.quantity,
				transaction_type: 'purchase',
				reference_type: 'license_request',
				reference_id: requestId,
				notes: `Approved request: ${item.justification}`,
				created_by: reviewerId,
			})
		}

		// Update request status
		await this.repo.updateLicenseRequestStatus(requestId, 'approved', reviewerId)

		const updated = await this.repo.findLicenseRequestById(requestId)
		if (!updated) {
			throw new Error('Failed to retrieve updated request')
		}
		return updated
	}

	/**
	 * Reject a license request
	 */
	async rejectLicenseRequest(requestId: number, reviewerId: number, rejectionReason: string): Promise<LicenseRequest> {
		const request = await this.repo.findLicenseRequestById(requestId)
		if (!request) {
			throw new Error('License request not found')
		}

		if (request.status !== 'pending') {
			throw new Error('Request has already been reviewed')
		}

		await this.repo.updateLicenseRequestStatus(requestId, 'rejected', reviewerId, rejectionReason)

		const updated = await this.repo.findLicenseRequestById(requestId)
		if (!updated) {
			throw new Error('Failed to retrieve updated request')
		}
		return updated
	}

	/**
	 * Quick grant licenses to a tenant
	 */
	async quickGrant(
		input: {
			tenant_id: number
			grants: Array<{ license_type_id: number; quantity: number }>
			notes: string
		},
		grantedBy: number
	) {
		// Validate all license types exist
		for (const grant of input.grants) {
			const licenseType = await this.repo.findLicenseTypeById(grant.license_type_id)
			if (!licenseType) {
				throw new Error(`License type ${grant.license_type_id} not found`)
			}
		}

		// Create ledger entries for each grant
		const entries = []
		for (const grant of input.grants) {
			const entry = await this.repo.createLedgerEntry({
				tenant_id: input.tenant_id,
				license_type_id: grant.license_type_id,
				amount: grant.quantity,
				transaction_type: 'purchase',
				reference_type: 'quick_grant',
				notes: input.notes,
				created_by: grantedBy,
			})
			entries.push(entry)
		}

		return entries
	}
}
