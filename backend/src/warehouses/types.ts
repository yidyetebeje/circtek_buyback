import { t, type Static } from 'elysia'

export type WarehouseFilters = {
	tenant_id?: number
	shop_id?: number
	search?: string
	page?: number
	limit?: number
	sort?: string
	order?: 'asc' | 'desc'
}

export const WarehouseCreate = t.Object({
	name: t.String(),
	description: t.String(),
	status: t.Optional(t.Boolean()),
	tenant_id: t.Number(),
	shop_id: t.Optional(t.Number()),
})

export const WarehouseUpdate = t.Object({
	name: t.Optional(t.String()),
	description: t.Optional(t.String()),
	status: t.Optional(t.Boolean()),
	tenant_id: t.Optional(t.Number()),
})

export const WarehouseListQuery = t.Object({
	tenant_id: t.Optional(t.Number()),
	shop_id: t.Optional(t.Number()),
	search: t.Optional(t.String()),
	page: t.Optional(t.Number({ default: 1 })),
	limit: t.Optional(t.Number({ default: 10 })),
	sort: t.Optional(t.String()),
	order: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
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
	shop_id: number | null
	tenant_name?: string | null
	created_at: Date | null
}

export type WarehouseListResult = {
	rows: WarehousePublic[]
	total: number
	page: number
	limit: number
}


