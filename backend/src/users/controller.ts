import bcrypt from 'bcryptjs'
import { UsersRepository } from './repository'
import { UserCreateInput, UserListQueryInput, UserPublic, UserUpdateInput } from './types'
import type { response } from '../types/response'

export class UsersController {
	constructor(private readonly repo: UsersRepository) {}

	async create(payload: UserCreateInput): Promise<response<UserPublic | null>> {
		try {
			// uniqueness checks
			const existingUsername = await this.repo.findByUsername(payload.user_name)
			if (existingUsername)
				return { data: null as any, message: 'Username already taken', status: 409 }

			const passwordHash = await bcrypt.hash(payload.password, 10)
			const created = await this.repo.createUser({ ...payload, password: passwordHash })
			return { data: created ?? null, message: 'User created', status: 201 }
		} catch (error) {
			return { data: null as any, message: 'Failed to create user', status: 500, error: (error as Error).message }
		}
	}

	async getOne(id: number, requiredTenantId?: number): Promise<response<UserPublic | null>> {
		try {
			const found = await this.repo.findOne(id)
			if (!found) return { data: null, message: 'User not found', status: 404 }
			if (typeof requiredTenantId === 'number' && found.tenant_id !== requiredTenantId) {
				return { data: null as any, message: 'Forbidden: cross-tenant access denied', status: 403 }
			}
			return { data: found, message: 'OK', status: 200 }
		} catch (error) {
			return { data: null, message: 'Failed to fetch user', status: 500, error: (error as Error).message }
		}
	}

	async list(query: UserListQueryInput): Promise<response<UserPublic[]>> {
		try {
			const { rows, total, page, limit } = await this.repo.findAll(query)
			return {
				data: rows,
				message: 'OK',
				status: 200,
				meta: { total, page, limit },
			}
		} catch (error) {
			return { data: [], message: 'Failed to fetch users', status: 500, error: (error as Error).message }
		}
	}

	async update(id: number, payload: UserUpdateInput, requiredTenantId?: number): Promise<response<UserPublic | null>> {
		try {
			// tenant guard
			if (typeof requiredTenantId === 'number') {
				const existing = await this.repo.findOne(id)
				if (!existing) return { data: null as any, message: 'User not found', status: 404 }
				if (existing.tenant_id !== requiredTenantId)
					return { data: null, message: 'Forbidden: cross-tenant access denied', status: 403 }
			}
			// If changing username, ensure uniqueness
			if (payload.user_name) {
				const existingUsername = await this.repo.findByUsername(payload.user_name)
				if (existingUsername && existingUsername.id !== id)
					return { data: null, message: 'Username already taken', status: 409 }
			}

			const body: UserUpdateInput = { ...payload }
			if (payload.password) body.password = await bcrypt.hash(payload.password, 10)
			const updated = await this.repo.updateUser(id, body)
			if (!updated) return { data: null, message: 'User not found', status: 404 }
			return { data: updated, message: 'User updated', status: 200 }
		} catch (error) {
			return { data: null, message: 'Failed to update user', status: 500, error: (error as Error).message }
		}
	}

	async remove(id: number): Promise<response<{ id: number } | null>> {
		try {
			const found = await this.repo.findOne(id)
			if (!found) return { data: null, message: 'User not found', status: 404 }
			await this.repo.deleteUser(id)
			return { data: { id }, message: 'User deleted', status: 200 }
		} catch (error) {
			return { data: null, message: 'Failed to delete user', status: 500, error: (error as Error).message }
		}
	}
}


