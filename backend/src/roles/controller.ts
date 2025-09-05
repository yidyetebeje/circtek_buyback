import type { response } from '../types/response'
import { RolesRepository } from './repository'
import { RoleCreateInput, RoleListQueryInput, RolePublic, RoleUpdateInput } from './types'

export class RolesController {
	constructor(private readonly repo: RolesRepository) {}

	async create(payload: RoleCreateInput): Promise<response<RolePublic | null>> {
		const existing = await this.repo.findByName(payload.name)
		if (existing) return { data: null, message: 'Role name already exists', status: 409 }
		const created = await this.repo.createRole(payload)
		return { data: created ?? null, message: 'Role created', status: 201 }
	}

	async list(query: RoleListQueryInput): Promise<response<RolePublic[]>> {
		const { rows, total, page, limit } = await this.repo.findAll(query)
		return { data: rows, message: 'OK', status: 200, meta: { total, page, limit } }
	}

	async getOne(id: number): Promise<response<RolePublic | null>> {
		const found = await this.repo.findOne(id)
		if (!found) return { data: null, message: 'Role not found', status: 404 }
		return { data: found, message: 'OK', status: 200 }
	}

	async update(id: number, payload: RoleUpdateInput): Promise<response<RolePublic | null>> {
		if (payload.name) {
			const existing = await this.repo.findByName(payload.name)
			if (existing && existing.id !== id) return { data: null, message: 'Role name already exists', status: 409 }
		}
		const updated = await this.repo.updateRole(id, payload)
		if (!updated) return { data: null, message: 'Role not found', status: 404 }
		return { data: updated, message: 'Role updated', status: 200 }
	}

	async remove(id: number): Promise<response<{ id: number } | null>> {
		const found = await this.repo.findOne(id)
		if (!found) return { data: null, message: 'Role not found', status: 404 }
		await this.repo.deleteRole(id)
		return { data: { id }, message: 'Role deleted', status: 200 }
	}
}


