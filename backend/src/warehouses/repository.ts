import { and, count, eq, like, SQL } from 'drizzle-orm'
import { tenants, warehouses } from '../db/circtek.schema'
import { db } from '../db'
import { WarehouseCreateInput, WarehouseFilters, WarehouseListResult, WarehousePublic, WarehouseUpdateInput } from './types'

const warehousePublicSelection = {
	id: warehouses.id,
	name: warehouses.name,
	description: warehouses.description,
	status: warehouses.status,
	tenant_id: warehouses.tenant_id,
	tenant_name: tenants.name,
	created_at: warehouses.created_at,
}

export class WarehousesRepository {
	constructor(private readonly database: typeof db) {}

	async createWarehouse(payload: WarehouseCreateInput): Promise<WarehousePublic | undefined> {
		await this.database.insert(warehouses).values(payload)
		const [created] = await this.database
			.select(warehousePublicSelection)
			.from(warehouses)
			.leftJoin(tenants, eq(warehouses.tenant_id, tenants.id))
			.where(eq(warehouses.name, payload.name))
		return created
	}

	async findOne(id: number): Promise<WarehousePublic | undefined> {
		const [row] = await this.database
			.select(warehousePublicSelection)
			.from(warehouses)
			.leftJoin(tenants, eq(warehouses.tenant_id, tenants.id))
			.where(eq(warehouses.id, id))
		return row
	}

	async findAll(filters: WarehouseFilters): Promise<WarehouseListResult> {
		const conditions: SQL<unknown>[] = []
		if (typeof filters.tenant_id === 'number') conditions.push(eq(warehouses.tenant_id, filters.tenant_id))
		if (filters.search) conditions.push(like(warehouses.name, `%${filters.search}%`))

		const page = Math.max(1, filters.page ?? 1)
		const limit = Math.max(1, Math.min(100, filters.limit ?? 10))
		const offset = (page - 1) * limit

		const whereCond = conditions.length ? and(...conditions) : undefined
		const [totalRow] = await (whereCond
			? this.database.select({ total: count() }).from(warehouses).where(whereCond)
			: this.database.select({ total: count() }).from(warehouses))

		const rows = await (whereCond
			? this.database
				.select(warehousePublicSelection)
				.from(warehouses)
				.leftJoin(tenants, eq(warehouses.tenant_id, tenants.id))
				.where(whereCond)
				.limit(limit)
				.offset(offset)
			: this.database
				.select(warehousePublicSelection)
				.from(warehouses)
				.leftJoin(tenants, eq(warehouses.tenant_id, tenants.id))
				.limit(limit)
				.offset(offset))

		return { rows, total: totalRow?.total ?? 0, page, limit }
	}

	async updateWarehouse(id: number, payload: WarehouseUpdateInput): Promise<WarehousePublic | undefined> {
		await this.database.update(warehouses).set(payload).where(eq(warehouses.id, id))
		return this.findOne(id)
	}

	async deleteWarehouse(id: number): Promise<{ id: number }> {
		await this.database.delete(warehouses).where(eq(warehouses.id, id))
		return { id }
	}
}


