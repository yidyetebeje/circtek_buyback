import { t, type Static } from 'elysia'

export type RoleFilters = {
	name?: string
	status?: boolean
	page?: number
	limit?: number
}

export const RoleCreate = t.Object({
	name: t.String(),
	description: t.String(),
	status: t.Optional(t.Boolean()),
})

export const RoleUpdate = t.Object({
	name: t.Optional(t.String()),
	description: t.Optional(t.String()),
	status: t.Optional(t.Boolean()),
})

export const RoleListQuery = t.Object({
	name: t.Optional(t.String()),
	status: t.Optional(t.Boolean()),
	page: t.Optional(t.Number({ default: 1 })),
	limit: t.Optional(t.Number({ default: 10 })),
})

export type RoleCreateInput = Static<typeof RoleCreate>
export type RoleUpdateInput = Static<typeof RoleUpdate>
export type RoleListQueryInput = Static<typeof RoleListQuery>

export type RolePublic = {
	id: number
	name: string
	description: string
	status: boolean | null
}

export type RoleListResult = {
	rows: RolePublic[]
	total: number
	page: number
	limit: number
}


