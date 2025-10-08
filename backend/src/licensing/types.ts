import { t } from 'elysia'

// License Type
export interface LicenseType {
	id: number
	name: string
	product_category: string
	test_type: string
	price: string
	description?: string
	status: boolean
	created_at: Date
	updated_at: Date
}

// License Ledger Entry
export interface LicenseLedgerEntry {
	id: number
	tenant_id: number
	license_type_id: number
	amount: number
	transaction_type: 'purchase' | 'usage' | 'refund' | 'adjustment'
	reference_type?: string
	reference_id?: number
	device_identifier?: string
	notes?: string
	created_by?: number
	created_at: Date
}

// Device License (30-day retest window)
export interface DeviceLicense {
	id: number
	device_identifier: string
	license_type_id: number
	tenant_id: number
	license_activated_at: Date
	retest_valid_until: Date
	ledger_entry_id?: number
	created_at: Date
	updated_at: Date
}

// Authorization Request
export const AuthorizeTestBody = t.Object({
	device_identifier: t.String(),
	license_type_id: t.Optional(t.Number()),
	product_category: t.Optional(t.String()),
	test_type: t.Optional(t.String()),
})

export type AuthorizeTestInput = {
	device_identifier: string
	license_type_id?: number
	product_category?: string
	test_type?: string
}

// Authorization Response
export interface AuthorizationResult {
	authorized: boolean
	reason: 'free_retest' | 'license_consumed' | 'insufficient_licenses' | 'invalid_license_type'
	license_type?: LicenseType
	device_license?: DeviceLicense
	ledger_entry?: LicenseLedgerEntry
	balance_remaining?: number
}

// License Balance
export interface LicenseBalance {
	license_type_id: number
	license_type_name: string
	product_category: string
	test_type: string
	balance: number
	price: string
}

// Usage Report
export interface UsageReportEntry {
	tenant_id: number
	tenant_name: string
	license_type_id: number
	license_type_name: string
	product_category: string
	test_type: string
	quantity_used: number
	unit_price: string
	total_price: string
}

// Manual Adjustment
export const ManualAdjustmentBody = t.Object({
	tenant_id: t.Number(),
	license_type_id: t.Number(),
	amount: t.Number(),
	notes: t.String(),
})

export type ManualAdjustmentInput = {
	tenant_id: number
	license_type_id: number
	amount: number
	notes: string
}

// License Type Creation
export const CreateLicenseTypeBody = t.Object({
	name: t.String(),
	product_category: t.String(),
	test_type: t.String(),
	price: t.Number(),
	description: t.Optional(t.String()),
})

export type CreateLicenseTypeInput = {
	name: string
	product_category: string
	test_type: string
	price: number
	description?: string
}

// Usage Report Query
export const UsageReportQuery = t.Object({
	start_date: t.String(),
	end_date: t.String(),
	tenant_id: t.Optional(t.Number()),
})

export type UsageReportQueryInput = {
	start_date: string
	end_date: string
	tenant_id?: number
}

// License Request
export interface LicenseRequestItem {
	license_type_id: number
	quantity: number
	justification: string
}

export interface LicenseRequest {
	id: number
	tenant_id: number
	tenant_name?: string
	requested_by: number
	requested_by_name?: string
	status: 'pending' | 'approved' | 'rejected'
	items: LicenseRequestItem[]
	notes?: string
	reviewed_by?: number
	reviewed_by_name?: string
	reviewed_at?: Date
	rejection_reason?: string
	created_at: Date
	updated_at: Date
}

export const CreateLicenseRequestBody = t.Object({
	items: t.Array(t.Object({
		license_type_id: t.Number(),
		quantity: t.Number(),
		justification: t.String(),
	})),
	notes: t.Optional(t.String()),
})

export type CreateLicenseRequestInput = {
	items: LicenseRequestItem[]
	notes?: string
}

export const ReviewLicenseRequestBody = t.Object({
	action: t.Union([t.Literal('approve'), t.Literal('reject')]),
	rejection_reason: t.Optional(t.String()),
})

export type ReviewLicenseRequestInput = {
	action: 'approve' | 'reject'
	rejection_reason?: string
}

// Quick Grant
export const QuickGrantBody = t.Object({
	tenant_id: t.Number(),
	grants: t.Array(t.Object({
		license_type_id: t.Number(),
		quantity: t.Number(),
	})),
	notes: t.String(),
})

export type QuickGrantInput = {
	tenant_id: number
	grants: Array<{
		license_type_id: number
		quantity: number
	}>
	notes: string
}
