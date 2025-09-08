import { t, type Static } from "elysia"

export type UserFilters = {
	tenant_id?: number;
	role_id?: number;
	is_active?: boolean;
	search?: string;
	page?: number;
	limit?: number;
	sort?: string;
	order?: 'asc' | 'desc';
}

export const UserCreate = t.Object({
	name: t.String(),
	user_name: t.String(),
	password: t.String(),
	email: t.String(),
	role_id: t.Number(),
	tenant_id: t.Number(),
	warehouse_id: t.Optional(t.Number()),
	status: t.Optional(t.Boolean()),
})

export const UserUpdate = t.Object({
	name: t.Optional(t.String()),
	user_name: t.Optional(t.String()),
	password: t.Optional(t.String()),
	email: t.Optional(t.String()),
	role_id: t.Optional(t.Number()),
	tenant_id: t.Optional(t.Optional(t.Number())),
	warehouse_id: t.Optional(t.Optional(t.Number())),
	status: t.Optional(t.Boolean()),
})

export const UserListQuery = t.Object({
	tenant_id: t.Optional(t.Number()),
	role_id: t.Optional(t.Number()),
	warehouse_id: t.Optional(t.Number()),
	is_active: t.Optional(t.Boolean()),
	search: t.Optional(t.String()),
	page: t.Optional(t.Number({ default: 1 })),
	limit: t.Optional(t.Number({ default: 10 })),
	sort: t.Optional(t.String()),
	order: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
})

export type UserCreateInput = Static<typeof UserCreate>;
export type UserUpdateInput = Static<typeof UserUpdate>;
export type UserListQueryInput = Static<typeof UserListQuery>;

export type UserPublic = {
	id: number
	name: string
	user_name: string
	email: string
	created_at: Date | null
	status: boolean | null
	role_id: number | null
	role_name?: string | null
	tenant_id: number
	tenant_name?: string | null
	warehouse_id?: number | null
}

export type UserListResult = {
	rows: UserPublic[]
	total: number
	page: number
	limit: number
}