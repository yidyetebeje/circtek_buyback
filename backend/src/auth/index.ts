import Elysia from 'elysia'
import { db } from '../db'
import { UsersRepository } from '../users/repository'
import { AuthRepository } from './repository'
import { AuthController } from './controller'
import { LoginBody, RegisterBody } from './types'

const usersRepo = new UsersRepository(db)
const authRepo = new AuthRepository(db)
const controller = new AuthController(usersRepo, authRepo)

export const auth_routes = new Elysia({ prefix: '/auth' })
	.post('/register', async ({ body }) => controller.register(body as any), { body: RegisterBody, detail: { tags: ['Auth'], summary: 'Register new user' } })
	.post('/login', async (ctx) => {
		const { body, jwt } = ctx as any
		return controller.login(body, (payload) => jwt.sign(payload))
	}, { body: LoginBody, detail: { tags: ['Auth'], summary: 'Login and get JWT' } })
	.get('/me', async (ctx) => {
		const token = (ctx as any).bearer as string | undefined
		if (!token) return { data: null, message: 'Access Denied', status: 401 }
		const payload = await (ctx as any).jwt.verify(token)
		if (!payload) return { data: null, message: 'Invalid Token', status: 403 }
		return controller.me(Number((payload as any).sub))
	}, { detail: { tags: ['Auth'], summary: 'Get current user profile' } })

export const requireRole = (roles: string[]) =>
	(app: Elysia) =>
		app
			.derive(async (ctx) => {
				// Skip authentication for OPTIONS requests (CORS preflight)
				if ((ctx as any).request.method === 'OPTIONS') {
					return { currentUserId: null, currentTenantId: null, currentRole: null }
				}
				const token = (ctx as any).bearer as string | undefined
				if (!token) return { authError: { status: 401, message: 'Access Denied' } }
				const payload = await (ctx as any).jwt.verify(token)
				if (!payload) return { authError: { status: 403, message: 'Invalid Token' } }
				const role = (payload as any).role as string | undefined
				if (roles.length && (!role || !roles.includes(role))) return { authError: { status: 403, message: 'Forbidden' } }
				return { currentUserId: Number((payload as any).sub), currentTenantId: (payload as any).tenant_id, currentRole: role, warehouseId: (payload as any).warehouse_id }
			})
			.onBeforeHandle(({ authError, set, request }) => {
				// Skip authentication for OPTIONS requests (CORS preflight)
				if (request.method === 'OPTIONS') {
					return
				}
				if (authError) {
					set.status = authError.status as any
					return { data: null, message: authError.message, status: set.status as any }
				}
			})


