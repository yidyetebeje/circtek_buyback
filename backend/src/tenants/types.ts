import { t, type Static } from 'elysia'

export const TenantCreate = t.Object({
	name: t.String(),
	description: t.String(),
	status: t.Optional(t.Boolean()),
})

export const TenantUpdate = t.Object({
	name: t.Optional(t.String()),
	description: t.Optional(t.String()),
	status: t.Optional(t.Boolean()),
})

export type TenantCreateInput = Static<typeof TenantCreate>
export type TenantUpdateInput = Static<typeof TenantUpdate>

export type TenantPublic = {
	id: number
	name: string
	description: string
	status: boolean | null
}

export const TenantListQuery = t.Object({
  name: t.Optional(t.String()),
  status: t.Optional(t.Boolean()),
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
})

export type TenantListQueryInput = Static<typeof TenantListQuery>

export type TenantListResult = {
  rows: TenantPublic[]
  total: number
  page: number
  limit: number
}


