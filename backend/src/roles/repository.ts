import { and, count, eq, like, SQL } from 'drizzle-orm'
import { roles } from '../db/circtek.schema'
import { db } from '../db'
import { RoleCreateInput, RoleFilters, RoleListResult, RolePublic, RoleUpdateInput } from './types'

const rolePublicSelection = {
	id: roles.id,
	name: roles.name,
	description: roles.description,
	status: roles.status,
}

export class RolesRepository {
	constructor(private readonly database: typeof db) {}

	async createRole(role: RoleCreateInput): Promise<RolePublic | undefined> {
		await this.database.insert(roles).values(role)
		const [created] = await this.database.select(rolePublicSelection).from(roles).where(eq(roles.name, role.name))
		return created
	}

	async findOne(id: number): Promise<RolePublic | undefined> {
		const [row] = await this.database.select(rolePublicSelection).from(roles).where(eq(roles.id, id))
		return row
	}

	async findByName(name: string): Promise<RolePublic | undefined> {
		const [row] = await this.database.select(rolePublicSelection).from(roles).where(eq(roles.name, name))
		return row
	}

	async findAll(filters: RoleFilters): Promise<RoleListResult> {
		const conditions: SQL<unknown>[] = []
		if (filters.name) conditions.push(like(roles.name, `%${filters.name}%`))
		if (typeof filters.status === 'boolean') conditions.push(eq(roles.status, filters.status))

		const page = Math.max(1, filters.page ?? 1)
		const limit = Math.max(1, Math.min(100, filters.limit ?? 10))
		const offset = (page - 1) * limit

		const whereCond = conditions.length ? and(...conditions) : undefined
		const [totalRow] = await (whereCond
			? this.database.select({ total: count() }).from(roles).where(whereCond)
			: this.database.select({ total: count() }).from(roles))

		const rows = await (whereCond
			? this.database.select(rolePublicSelection).from(roles).where(whereCond).limit(limit).offset(offset)
			: this.database.select(rolePublicSelection).from(roles).limit(limit).offset(offset))

		return { rows, total: totalRow?.total ?? 0, page, limit }
	}

	async updateRole(id: number, role: RoleUpdateInput): Promise<RolePublic | undefined> {
		await this.database.update(roles).set(role).where(eq(roles.id, id))
		return this.findOne(id)
	}

	async deleteRole(id: number): Promise<{ id: number }> {
		await this.database.delete(roles).where(eq(roles.id, id))
		return { id }
	}
}


