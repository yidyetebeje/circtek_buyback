import { t, type Static } from 'elysia'

export type DiagnosticFilters = {
	identifier?: string
	device_type?: string
	warehouse_id?: number
	tester_id?: number
	tenant_id?: number
	page?: number
	limit?: number
	/** Column to sort by (server-side) */
	sort_by?:
        | 'id'
        | 'created_at'
        | 'lpn'
        | 'serial_number'
        | 'imei'
        | 'make'
        | 'model_name'
        | 'status'
    /** Sort direction */
    sort_dir?: 'asc' | 'desc'
}

export const DiagnosticListQuery = t.Object({
	identifier: t.Optional(t.String()),
	device_type: t.Optional(t.String()),
	warehouse_id: t.Optional(t.Number()),
	tester_id: t.Optional(t.Number()),
	tenant_id: t.Optional(t.Number()),
	page: t.Optional(t.Number({ default: 1 })),
	limit: t.Optional(t.Number({ default: 10 })),
    sort_by: t.Optional(
      t.Union([
        t.Literal('id'),
        t.Literal('created_at'),
        t.Literal('lpn'),
        t.Literal('serial_number'),
        t.Literal('imei'),
        t.Literal('make'),
        t.Literal('model_name'),
        t.Literal('status'),
      ])
    ),
    sort_dir: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')]))
})

export type DiagnosticListQueryInput = Static<typeof DiagnosticListQuery>

export type DiagnosticPublic = {
	id: number
	created_at: Date | null
	updated_at: Date | null
	tenant_id: number
	/** Optional tenant name to brand public reports */
	tenant_name?: string | null
	/** Optional tenant logo URL to brand public reports */
	tenant_logo_url?: string | null
	warehouse_id: number
	tester_id: number
	device_id: number
	lpn: string | null
	serial_number: string | null
	imei: string | null
	passed_components: string | null
	failed_components: string | null
	pending_components: string | null
	oem_status: string | null
	battery_info: any | null
	oem_info: any | null
	label_printed: boolean | null
	status: boolean | null
	os_version: string | null
	device_lock: string | null
	carrier_lock: any | null
	sim_lock: any | null
	ESN: string | null
	iCloud: any | null
	eSIM: boolean | null
	eSIM_erasure: boolean | null
	make: string | null
	model_no: string | null
	model_name: string | null
	device_type: string | null
	device_serial: string | null
	device_imei: string | null
	device_lpn: string | null
	device_sku: string | null
	device_imei2: string | null
	device_guid: string | null
	device_description: string | null
	device_storage: string | null
	device_memory: string | null
	device_color: string | null
	device_created_at: Date | null
	device_status: boolean | null
	warehouse_name: string | null
	tester_username: string | null
	answers?: Array<{
		id: number
		question_text: string
		answer_text: string
		created_at: Date | null
	}>
	rooted: boolean | null
	erased: boolean | null
	grade: string | null
}

export type DiagnosticListResult = {
	rows: DiagnosticPublic[]
	total: number
	page: number
	limit: number
}

export const DiagnosticUploadBody = t.Object({
	// Device info
	device: t.Object({
		make: t.String(),
		model_no: t.String(),
		model_name: t.String(),
		device_type: t.String(),
		serial: t.String(),
		imei: t.Optional(t.String()),
		imei2: t.Optional(t.String()),
		lpn: t.Optional(t.String()),
		sku: t.Optional(t.String()),
		storage: t.Optional(t.String()),
		memory: t.Optional(t.String()),
		color: t.Optional(t.String()),
		description: t.Optional(t.String()),
		guid: t.Optional(t.String()),
	}),
	// Test result info
	test: t.Object({
		battery_info: t.Optional(t.Any()),
		passed_components: t.Optional(t.String()),
		failed_components: t.Optional(t.String()),
		pending_components: t.Optional(t.String()),
		oem_status: t.Optional(t.String()),
		oem_info: t.Optional(t.Any()),
		lpn: t.Optional(t.String()),
		os_version: t.Optional(t.String()),
		device_lock: t.Optional(t.String()),
		carrier_lock: t.Optional(t.Any()),
		sim_lock: t.Optional(t.Any()),
		ESN: t.Optional(t.String()),
		iCloud: t.Optional(t.Any()),
		eSIM: t.Optional(t.Boolean()),
		eSIM_erasure: t.Optional(t.Boolean()),
		serial_number: t.Optional(t.String()),
		imei: t.Optional(t.String()),
		rooted: t.Optional(t.Boolean()),
		erased: t.Optional(t.Boolean()),
		grade: t.Optional(t.String()),
	}),
	// Question answers (optional)
	answers: t.Optional(t.Array(t.Object({
		question_text: t.String(),
		answer_text: t.String(),
	}))),
	customTimestamps: t.Optional(t.Object({
		created_at: t.Optional(t.String()),
		updated_at: t.Optional(t.String()),
	}))
})

export type DiagnosticUploadInput = Static<typeof DiagnosticUploadBody>



