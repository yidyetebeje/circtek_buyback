import { t, type Static } from 'elysia'

export const TenantCreate = t.Object({
	name: t.String(),
	description: t.String(),
	status: t.Optional(t.Boolean()),
	logo: t.Optional(t.String()),
})

export const TenantUpdate = t.Object({
	name: t.Optional(t.String()),
	description: t.Optional(t.String()),
	status: t.Optional(t.Boolean()),
	logo: t.Optional(t.String()),
})

export type TenantCreateInput = Static<typeof TenantCreate>
export type TenantUpdateInput = Static<typeof TenantUpdate>

export type TenantPublic = {
	id: number
	name: string
	description: string
	status: boolean | null
	logo: string | null
}

export const TenantListQuery = t.Object({
  name: t.Optional(t.String()),
  status: t.Optional(t.Boolean()),
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
  sort: t.Optional(t.String()),
  order: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
})

export type TenantListQueryInput = Static<typeof TenantListQuery>

export type TenantListResult = {
  rows: TenantPublic[]
  total: number
  page: number
  limit: number
}


