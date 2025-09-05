import bcrypt from 'bcryptjs'
import type { response } from '../types/response'
import { UsersRepository } from '../users/repository'
import { AuthRepository } from './repository'
import type { LoginBodyInput, RegisterBodyInput } from './types'

export class AuthController {
	constructor(
		private readonly usersRepo: UsersRepository,
		private readonly authRepo: AuthRepository
	) {}

	async register(payload: RegisterBodyInput): Promise<response<any>> {
		try {
			const existing = await this.authRepo.findUserByIdentifier(payload.user_name)
		if (existing) return { data: null as any, message: 'Username already taken', status: 409 }
		const existingEmail = await this.authRepo.findUserByIdentifier(payload.email)
		if (existingEmail) return { data: null as any, message: 'Email already registered', status: 409 }
		const hash = await bcrypt.hash(payload.password, 10)

		const created = await this.usersRepo.createUser({ ...payload, status: true, password: hash })

		return { data: created, message: 'Registered', status: 201 }
		} catch (error) {
			console.log(error);
			return { data: null as any, message: 'Failed to register', status: 500, error: (error as Error).message }
		}
	}

	async login(payload: LoginBodyInput, signJwt: (data: any) => Promise<string>): Promise<response<any>> {
		const user = await this.authRepo.findUserByIdentifier(payload.identifier)
		if (!user) return { data: null as any, message: 'Invalid credentials', status: 401 }
		if (!user.status) return { data: null as any, message: 'User inactive', status: 403 }
		const match = await bcrypt.compare(payload.password, (user as any).password)
		if (!match) return { data: null as any, message: 'Invalid credentials', status: 401 }
		delete (user as any).password
		const roleName = await this.authRepo.getRoleName(user.role_id ?? null)
		const token = await signJwt({ sub: user.id, role: roleName, tenant_id: user.tenant_id })
		return { data: { token, user }, message: 'OK', status: 200 }
	}

	async me(userId: number): Promise<response<any>> {
		const user = await this.authRepo.findUserPublicById(userId)
		if (!user) return { data: null as any, message: 'Not found', status: 404 }
		return { data: user, message: 'OK', status: 200 }
	}
}


