import { and, eq, gte, lte, sql, sum, desc, or, like } from 'drizzle-orm'
import { db } from '../db'
import {
	license_types,
	license_ledger,
	device_licenses,
	tenants,
	license_requests,
	users,
} from '../db/circtek.schema'
import type {
	LicenseType,
	LicenseLedgerEntry,
	DeviceLicense,
	LicenseBalance,
	UsageReportEntry,
	LicenseRequest,
	LicenseRequestItem,
} from './types'

export class LicensingRepository {
	constructor(private readonly database: typeof db) {}

	// License Types
	async findLicenseTypeById(id: number): Promise<LicenseType | undefined> {
		const [result] = await this.database
			.select()
			.from(license_types)
			.where(eq(license_types.id, id))
		return result as LicenseType | undefined
	}

	async findLicenseTypeByCategory(
		productCategory: string,
		testType: string
	): Promise<LicenseType | undefined> {
		const [result] = await this.database
			.select()
			.from(license_types)
			.where(
				and(
					eq(license_types.product_category, productCategory),
					eq(license_types.test_type, testType),
					eq(license_types.status, true)
				)
			)
		return result as LicenseType | undefined
	}

	async listLicenseTypes(search?: string): Promise<LicenseType[]> {
		const conditions = [eq(license_types.status, true)]
		
		if (search) {
			const searchPattern = `%${search}%`
			const searchCondition = or(
				like(license_types.name, searchPattern),
				like(license_types.product_category, searchPattern),
				like(license_types.test_type, searchPattern),
				like(license_types.description, searchPattern)
			)
			if (searchCondition) conditions.push(searchCondition)
		}
		
		const results = await this.database
			.select()
			.from(license_types)
			.where(and(...conditions))
			.orderBy(license_types.product_category, license_types.test_type)
		return results as LicenseType[]
	}

	async createLicenseType(data: {
		name: string
		product_category: string
		test_type: string
		price: string
		description?: string
	}): Promise<LicenseType> {
		const [result] = await this.database
			.insert(license_types)
			.values(data as any)
			.$returningId()
		
		return this.findLicenseTypeById(result.id) as Promise<LicenseType>
	}

	// Device Licenses (30-day retest window)
	async findActiveDeviceLicense(
		deviceIdentifier: string,
		licenseTypeId: number,
		tenantId: number
	): Promise<DeviceLicense | undefined> {
		const now = new Date()
		const [result] = await this.database
			.select()
			.from(device_licenses)
			.where(
				and(
					eq(device_licenses.device_identifier, deviceIdentifier),
					eq(device_licenses.license_type_id, licenseTypeId),
					eq(device_licenses.tenant_id, tenantId),
					gte(device_licenses.retest_valid_until, now)
				)
			)
			.orderBy(desc(device_licenses.retest_valid_until))
		return result as DeviceLicense | undefined
	}

	async createDeviceLicense(data: {
		device_identifier: string
		license_type_id: number
		tenant_id: number
		license_activated_at: Date
		retest_valid_until: Date
		ledger_entry_id?: number
	}): Promise<DeviceLicense> {
		const [result] = await this.database
			.insert(device_licenses)
			.values(data as any)
			.$returningId()

		const [created] = await this.database
			.select()
			.from(device_licenses)
			.where(eq(device_licenses.id, result.id))
		return created as DeviceLicense
	}

	// License Ledger
	async createLedgerEntry(data: {
		tenant_id: number
		license_type_id: number
		amount: number
		transaction_type: 'purchase' | 'usage' | 'refund' | 'adjustment'
		reference_type?: string
		reference_id?: number
		device_identifier?: string
		notes?: string
		created_by?: number
	}): Promise<LicenseLedgerEntry> {
		const [result] = await this.database
			.insert(license_ledger)
			.values(data as any)
			.$returningId()

		const [created] = await this.database
			.select()
			.from(license_ledger)
			.where(eq(license_ledger.id, result.id))
		return created as LicenseLedgerEntry
	}

	async getTenantLicenseBalance(
		tenantId: number,
		licenseTypeId: number
	): Promise<number> {
		const [result] = await this.database
			.select({ total: sum(license_ledger.amount) })
			.from(license_ledger)
			.where(
				and(
					eq(license_ledger.tenant_id, tenantId),
					eq(license_ledger.license_type_id, licenseTypeId)
				)
			)

		return Number(result?.total ?? 0)
	}

	async getTenantAllBalances(tenantId: number, search?: string): Promise<LicenseBalance[]> {
		const conditions = [eq(license_types.status, true)]
		
		if (search) {
			const searchPattern = `%${search}%`
			const searchCondition = or(
				like(license_types.name, searchPattern),
				like(license_types.product_category, searchPattern),
				like(license_types.test_type, searchPattern)
			)
			if (searchCondition) conditions.push(searchCondition)
		}
		
		const results = await this.database
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
			.where(and(...conditions))
			.groupBy(
				license_types.id,
				license_types.name,
				license_types.product_category,
				license_types.test_type,
				license_types.price
			)

		return results.map((r) => ({
			license_type_id: r.license_type_id,
			license_type_name: r.license_type_name,
			product_category: r.product_category,
			test_type: r.test_type,
			balance: Number(r.balance),
			price: r.price,
		}))
	}

	// Tenant Account Type
	async getTenantAccountType(
		tenantId: number
	): Promise<'prepaid' | 'credit' | undefined> {
		const [result] = await this.database
			.select({ account_type: tenants.account_type })
			.from(tenants)
			.where(eq(tenants.id, tenantId))
		return result?.account_type as 'prepaid' | 'credit' | undefined
	}

	// Usage Reporting
	async getUsageReport(
		startDate: Date,
		endDate: Date,
		tenantId?: number
	): Promise<UsageReportEntry[]> {
		const conditions = [
			eq(license_ledger.transaction_type, 'usage'),
			gte(license_ledger.created_at, startDate),
			lte(license_ledger.created_at, endDate),
		]

		if (tenantId) {
			conditions.push(eq(license_ledger.tenant_id, tenantId))
		}

		const results = await this.database
			.select({
				tenant_id: tenants.id,
				tenant_name: tenants.name,
				license_type_id: license_types.id,
				license_type_name: license_types.name,
				product_category: license_types.product_category,
				test_type: license_types.test_type,
				quantity_used: sql<number>`ABS(SUM(${license_ledger.amount}))`,
				unit_price: license_types.price,
			})
			.from(license_ledger)
			.innerJoin(tenants, eq(license_ledger.tenant_id, tenants.id))
			.innerJoin(
				license_types,
				eq(license_ledger.license_type_id, license_types.id)
			)
			.where(and(...conditions))
			.groupBy(
				tenants.id,
				tenants.name,
				license_types.id,
				license_types.name,
				license_types.product_category,
				license_types.test_type,
				license_types.price
			)

		return results.map((r) => ({
			tenant_id: r.tenant_id,
			tenant_name: r.tenant_name,
			license_type_id: r.license_type_id,
			license_type_name: r.license_type_name,
			product_category: r.product_category,
			test_type: r.test_type,
			quantity_used: Number(r.quantity_used),
			unit_price: r.unit_price,
			total_price: (Number(r.quantity_used) * Number(r.unit_price)).toFixed(2),
		}))
	}

	// Get ledger history for a tenant
	async getTenantLedgerHistory(
		tenantId: number,
		licenseTypeId?: number,
		transactionType?: string,
		search?: string
	): Promise<LicenseLedgerEntry[]> {
		const conditions = [eq(license_ledger.tenant_id, tenantId)]
		
		if (licenseTypeId) {
			conditions.push(eq(license_ledger.license_type_id, licenseTypeId))
		}
		
		if (transactionType) {
			conditions.push(eq(license_ledger.transaction_type, transactionType as any))
		}
		
		if (search) {
			const searchPattern = `%${search}%`
			const searchCondition = or(
				like(license_ledger.device_identifier, searchPattern),
				like(license_ledger.notes, searchPattern),
				like(license_ledger.reference_type, searchPattern)
			)
			if (searchCondition) conditions.push(searchCondition)
		}

		const results = await this.database
			.select()
			.from(license_ledger)
			.where(and(...conditions))
			.orderBy(desc(license_ledger.created_at))

		return results as LicenseLedgerEntry[]
	}

	// License Requests
	async createLicenseRequest(data: {
		tenant_id: number
		requested_by: number
		items: LicenseRequestItem[]
		notes?: string
	}): Promise<LicenseRequest> {
		const [result] = await this.database
			.insert(license_requests)
			.values({
				tenant_id: data.tenant_id,
				requested_by: data.requested_by,
				items: JSON.stringify(data.items),
				notes: data.notes,
				status: 'pending',
			} as any)
			.$returningId()

		return this.findLicenseRequestById(result.id) as Promise<LicenseRequest>
	}

	async findLicenseRequestById(id: number): Promise<LicenseRequest | undefined> {
		const [result] = await this.database
			.select({
				id: license_requests.id,
				tenant_id: license_requests.tenant_id,
				tenant_name: tenants.name,
				requested_by: license_requests.requested_by,
				requested_by_name: users.name,
				status: license_requests.status,
				items: license_requests.items,
				notes: license_requests.notes,
				reviewed_by: license_requests.reviewed_by,
				reviewed_at: license_requests.reviewed_at,
				rejection_reason: license_requests.rejection_reason,
				created_at: license_requests.created_at,
				updated_at: license_requests.updated_at,
			})
			.from(license_requests)
			.leftJoin(tenants, eq(license_requests.tenant_id, tenants.id))
			.leftJoin(users, eq(license_requests.requested_by, users.id))
			.where(eq(license_requests.id, id))

		if (!result) return undefined

		return {
			...result,
			items: JSON.parse(result.items as string),
		} as LicenseRequest
	}

	async listLicenseRequests(filters: {
		tenant_id?: number
		status?: 'pending' | 'approved' | 'rejected'
		requested_by?: number
		search?: string
	}): Promise<LicenseRequest[]> {
		const conditions = []

		if (filters.tenant_id) {
			conditions.push(eq(license_requests.tenant_id, filters.tenant_id))
		}
		if (filters.status) {
			conditions.push(eq(license_requests.status, filters.status))
		}
		if (filters.requested_by) {
			conditions.push(eq(license_requests.requested_by, filters.requested_by))
		}
		if (filters.search) {
			const searchPattern = `%${filters.search}%`
			const searchCondition = or(
				like(tenants.name, searchPattern),
				like(users.name, searchPattern),
				like(license_requests.notes, searchPattern)
			)
			if (searchCondition) conditions.push(searchCondition)
		}

		const results = await this.database
			.select({
				id: license_requests.id,
				tenant_id: license_requests.tenant_id,
				tenant_name: tenants.name,
				requested_by: license_requests.requested_by,
				requested_by_name: users.name,
				status: license_requests.status,
				items: license_requests.items,
				notes: license_requests.notes,
				reviewed_by: license_requests.reviewed_by,
				reviewed_at: license_requests.reviewed_at,
				rejection_reason: license_requests.rejection_reason,
				created_at: license_requests.created_at,
				updated_at: license_requests.updated_at,
			})
			.from(license_requests)
			.leftJoin(tenants, eq(license_requests.tenant_id, tenants.id))
			.leftJoin(users, eq(license_requests.requested_by, users.id))
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(desc(license_requests.created_at))

		return results.map(r => ({
			...r,
			items: JSON.parse(r.items as string),
		})) as LicenseRequest[]
	}

	async updateLicenseRequestStatus(
		id: number,
		status: 'approved' | 'rejected',
		reviewed_by: number,
		rejection_reason?: string
	): Promise<void> {
		await this.database
			.update(license_requests)
			.set({
				status,
				reviewed_by,
				reviewed_at: new Date(),
				rejection_reason,
			} as any)
			.where(eq(license_requests.id, id))
	}
}
