import type { response } from '../types/response'
import { WarehousesRepository } from './repository'
import { WarehouseCreateInput, WarehouseListQueryInput, WarehousePublic, WarehouseUpdateInput } from './types'

export class WarehousesController {
	constructor(private readonly repo: WarehousesRepository) {}

	async create(payload: WarehouseCreateInput): Promise<response<WarehousePublic | null>> {
		const created = await this.repo.createWarehouse(payload)
		return { data: created ?? null, message: 'Warehouse created', status: 201 }
	}

	async list(query: WarehouseListQueryInput): Promise<response<WarehousePublic[]>> {
		const { rows, total, page, limit } = await this.repo.findAll(query)
		return { data: rows, message: 'OK', status: 200, meta: { total, page, limit } }
	}

	async getOne(id: number, requiredTenantId?: string): Promise<response<WarehousePublic | null>> {
		const found = await this.repo.findOne(id)
		if (!found) return { data: null, message: 'Warehouse not found', status: 404 }
		if (requiredTenantId && found.tenant_id !== requiredTenantId)
			return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
		return { data: found, message: 'OK', status: 200 }
	}

	async update(id: number, payload: WarehouseUpdateInput, requiredTenantId?: string): Promise<response<WarehousePublic | null>> {
		if (requiredTenantId) {
			const existing = await this.repo.findOne(id)
			if (!existing) return { data: null, message: 'Warehouse not found', status: 404 }
			if (existing.tenant_id !== requiredTenantId)
				return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
		}
		const updated = await this.repo.updateWarehouse(id, payload)
		if (!updated) return { data: null, message: 'Warehouse not found', status: 404 }
		return { data: updated, message: 'Warehouse updated', status: 200 }
	}

	async remove(id: number, requiredTenantId?: string): Promise<response<{ id: number } | null>> {
		if (requiredTenantId) {
			const existing = await this.repo.findOne(id)
			if (!existing) return { data: null, message: 'Warehouse not found', status: 404 }
			if (existing.tenant_id !== requiredTenantId)
				return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
		}
		await this.repo.deleteWarehouse(id)
		return { data: { id }, message: 'Warehouse deleted', status: 200 }
	}
}


