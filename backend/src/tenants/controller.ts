import type { response } from '../types/response'
import { TenantsRepository } from './repository'
import { TenantCreateInput, TenantListQueryInput, TenantPublic, TenantUpdateInput } from './types'

export class TenantsController {
	constructor(private readonly repo: TenantsRepository) {}

	async create(payload: TenantCreateInput): Promise<response<TenantPublic | null>> {
		const exists = await this.repo.findByName(payload.name)
		if (exists) return { data: null, message: 'Tenant name already exists', status: 409 }
		const created = await this.repo.createTenant(payload)
		return { data: created ?? null, message: 'Tenant created', status: 201 }
	}

	async update(id: number, payload: TenantUpdateInput): Promise<response<TenantPublic | null>> {
		const updated = await this.repo.updateTenant(id, payload)
		if (!updated) return { data: null, message: 'Tenant not found', status: 404 }
		return { data: updated, message: 'Tenant updated', status: 200 }
	}

	async remove(id: number): Promise<response<{ id: number } | null>> {
		const found = await this.repo.findOne(id)
		if (!found) return { data: null, message: 'Tenant not found', status: 404 }
		await this.repo.deleteTenant(id)
		return { data: { id }, message: 'Tenant deleted', status: 200 }
	}

	async getById(id: number): Promise<response<TenantPublic | null>> {
		const tenant = await this.repo.findOne(id)
		if (!tenant) return { data: null, message: 'Tenant not found', status: 404 }
		console.log('Tenant', { tenant })
		return { data: tenant, message: 'OK', status: 200 }
	}

	async list(query: TenantListQueryInput): Promise<response<TenantPublic[]>> {
		try {
			const { rows, total, page, limit } = await this.repo.findAll(query)
			return { data: rows, message: 'OK', status: 200, meta: { total, page, limit } }
		} catch (error) {
			return { data: [], message: 'Failed to fetch tenants', status: 500, error: (error as Error).message }
		}
	}
}




