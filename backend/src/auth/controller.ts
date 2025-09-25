import bcrypt from 'bcryptjs'
import type { response } from '../types/response'
import { UsersRepository } from '../users/repository'
import { AuthRepository } from './repository'
import type { LoginBodyInput, RegisterBodyInput, ShopLoginBodyInput } from './types'

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
		const token = await signJwt({ sub: user.id, role: roleName, tenant_id: user.tenant_id, warehouse_id: user.warehouse_id, managed_shop_id: user.managed_shop_id })
		return { data: { token, user }, message: 'OK', status: 200 }
	}

	async me(userId: number): Promise<response<any>> {
		const user = await this.authRepo.findUserPublicById(userId)
		if (!user) return { data: null as any, message: 'Not found', status: 404 }
		return { data: user, message: 'OK', status: 200 }
	}

	async testerLogin(payload: LoginBodyInput, signJwt: (data: any) => Promise<string>): Promise<response<any>> {
		const user = await this.authRepo.findUserByIdentifier(payload.identifier)
		if (!user) return { data: null as any, message: 'Invalid credentials', status: 401 }
		if (!user.status) return { data: null as any, message: 'User inactive', status: 403 }
		
		// Check if user has tester role
		const roleName = await this.authRepo.getRoleName(user.role_id ?? null)
		if (roleName !== 'tester') {
			return { data: null as any, message: 'Access denied. Only tester role allowed', status: 403 }
		}
		const match = await bcrypt.compare(payload.password, (user as any).password)
		if (!match) return { data: null as any, message: 'Invalid credentials', status: 401 }
		
		delete (user as any).password
		const token = await signJwt({ sub: user.id, role: roleName, tenant_id: user.tenant_id, warehouse_id: user.warehouse_id, managed_shop_id: user.managed_shop_id })
		return { data: { token, user }, message: 'Tester login successful', status: 200 }
	}

	async loginToShop(payload: ShopLoginBodyInput, signJwt: (data: any) => Promise<string>): Promise<response<any>> {
		try {
			// Find user by identifier
			const user = await this.authRepo.findUserByIdentifier(payload.identifier)
			if (!user) {
				return { data: null as any, message: 'Invalid credentials', status: 401 }
			}

			if (!user.status) {
				return { data: null as any, message: 'User inactive', status: 403 }
			}

			if (!user.password) {
				return { data: null as any, message: 'User record is missing password hash', status: 500 }
			}

			// Verify password
			const isPasswordMatch = await bcrypt.compare(payload.password, user.password)
			if (!isPasswordMatch) {
				return { data: null as any, message: 'Invalid credentials', status: 401 }
			}

			// Find shop
			const shop = await this.authRepo.findShopById(payload.shopId)
			if (!shop) {
				return { data: null as any, message: 'Shop not found', status: 404 }
			}

			if (!shop.active) {
				return { data: null as any, message: 'Shop is inactive', status: 403 }
			}

			// Get user role details
			const userRoleDetails = await this.authRepo.getUserRoleDetails(user.role_id ?? null)
			if (!userRoleDetails) {
				console.error(`User ${user.id} has an invalid roleId: ${user.role_id}`)
				return { data: null as any, message: 'User role configuration error', status: 500 }
			}

			// Check authorization
			const isShopManager = userRoleDetails.slug === 'shop_manager'
			let authorizedForShop = false

			// Check for explicit access
			const access = await this.authRepo.getUserShopAccess(user.id, payload.shopId)
			const hasExplicitAccess = !!access

			if (isShopManager) {
				if (hasExplicitAccess || (user.managed_shop_id && user.managed_shop_id === shop.id)) {
					authorizedForShop = true
				}
				if (!user.managed_shop_id && !hasExplicitAccess) {
					console.warn(`Shop manager (user_id: ${user.id}) doesn't have a managed_shop_id set and no explicit access to shop_id: ${shop.id}`)
				}
			} else {
				const isOwner = user.id === shop.owner_id
				const isTenantMatch = user.tenant_id !== null && user.tenant_id === shop.tenant_id
				if (isOwner || isTenantMatch || hasExplicitAccess) {
					authorizedForShop = true
				}
			}

			if (!authorizedForShop) {
				const message = isShopManager 
					? 'Shop Manager can only access their managed shop or shops with explicit permission'
					: 'User not authorized for this shop'
				return { data: null as any, message, status: 403 }
			}

			// Create JWT token with shop context
			const token = await signJwt({
				sub: user.id,
				role: userRoleDetails.title,
				tenant_id: user.tenant_id,
				warehouse_id: user.warehouse_id,
				managed_shop_id: user.managed_shop_id,
				shop_id: shop.id
			})

			// Prepare user response (excluding password)
			const userResponse = {
				id: user.id,
				name: user.name,
				user_name: user.user_name,
				roleName: userRoleDetails.title,
				roleSlug: userRoleDetails.slug,
				shopId: shop.id,
				shopName: shop.name,
				managed_shop_id: user.managed_shop_id,
				tenant_id: user.tenant_id
			}

			return {
				data: { token, user: userResponse },
				message: 'Shop login successful',
				status: 200
			}

		} catch (error) {
			console.error('Shop login error:', error)
			return {
				data: null as any,
				message: 'Failed to login to shop',
				status: 500,
				error: (error as Error).message
			}
		}
	}
}


