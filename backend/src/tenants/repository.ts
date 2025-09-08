import { and, count, eq, like, SQL, asc, desc } from 'drizzle-orm'
import { tenants } from '../db/circtek.schema'
import { db } from '../db'
import { TenantCreateInput, TenantListQueryInput, TenantListResult, TenantPublic, TenantUpdateInput } from './types'

// Sortable fields mapping
const sortableFields = {
	id: tenants.id,
	name: tenants.name,
	description: tenants.description,
	status: tenants.status,
} as const

export class TenantsRepository {
	constructor(private readonly database: typeof db) {}

	async createTenant(payload: TenantCreateInput): Promise<TenantPublic | undefined> {
		await this.database.insert(tenants).values(payload)
		const [row] = await this.database.select().from(tenants).where(eq(tenants.name, payload.name))
		return row as TenantPublic | undefined
	}

	async findByName(name: string): Promise<TenantPublic | undefined> {
		const [row] = await this.database.select().from(tenants).where(eq(tenants.name, name))
		return row as TenantPublic | undefined
	}

	async findOne(id: number): Promise<TenantPublic | undefined> {
		const [row] = await this.database.select().from(tenants).where(eq(tenants.id, id))
		return row as TenantPublic | undefined
	}

	async findAll(filters: TenantListQueryInput): Promise<TenantListResult> {
		const conditions: SQL<unknown>[] = []
		if (filters.name) conditions.push(like(tenants.name, `%${filters.name}%`))
		if (typeof filters.status === 'boolean') conditions.push(eq(tenants.status, filters.status))

		const page = Math.max(1, filters.page ?? 1)
		const limit = Math.max(1, Math.min(100, filters.limit ?? 10))
		const offset = (page - 1) * limit

		// Handle sorting
		const sortField = filters.sort && sortableFields[filters.sort as keyof typeof sortableFields] 
			? sortableFields[filters.sort as keyof typeof sortableFields]
			: tenants.id // default sort by id
		const sortOrder = filters.order === 'desc' ? desc : asc

		const whereCond = conditions.length ? and(...conditions) : undefined
		const [totalRow] = await (whereCond
			? this.database.select({ total: count() }).from(tenants).where(whereCond)
			: this.database.select({ total: count() }).from(tenants))

		const rows = await (whereCond
			? this.database.select().from(tenants).where(whereCond).orderBy(sortOrder(sortField)).limit(limit).offset(offset)
			: this.database.select().from(tenants).orderBy(sortOrder(sortField)).limit(limit).offset(offset))

		return { rows: rows as any, total: totalRow?.total ?? 0, page, limit }
	}

	async updateTenant(id: number, payload: TenantUpdateInput): Promise<TenantPublic | undefined> {
		await this.database.update(tenants).set(payload).where(eq(tenants.id, id))
		return this.findOne(id)
	}

	async deleteTenant(id: number): Promise<{ id: number }> {
		await this.database.delete(tenants).where(eq(tenants.id, id))
		return { id }
	}
}




