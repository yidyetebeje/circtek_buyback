import { t, type Static } from 'elysia'

export type WarehouseFilters = {
	tenant_id?: number
	search?: string
	page?: number
	limit?: number
}

export const WarehouseCreate = t.Object({
	name: t.String(),
	description: t.String(),
	status: t.Optional(t.Boolean()),
	tenant_id: t.Number(),
})

export const WarehouseUpdate = t.Object({
	name: t.Optional(t.String()),
	description: t.Optional(t.String()),
	status: t.Optional(t.Boolean()),
	tenant_id: t.Optional(t.Number()),
})

export const WarehouseListQuery = t.Object({
	tenant_id: t.Optional(t.Number()),
	search: t.Optional(t.String()),
	page: t.Optional(t.Number({ default: 1 })),
	limit: t.Optional(t.Number({ default: 10 })),
})

export type WarehouseCreateInput = Static<typeof WarehouseCreate>
export type WarehouseUpdateInput = Static<typeof WarehouseUpdate>
export type WarehouseListQueryInput = Static<typeof WarehouseListQuery>

export type WarehousePublic = {
	id: number
	name: string
	description: string
	status: boolean | null
	tenant_id: number
	tenant_name?: string | null
	created_at: Date | null
}

export type WarehouseListResult = {
	rows: WarehousePublic[]
	total: number
	page: number
	limit: number
}


