import Elysia from 'elysia'
import { db } from '../db'
import { TenantsRepository } from './repository'
import { TenantsController } from './controller'
import { TenantCreate, TenantListQuery, TenantUpdate } from './types'
import { requireRole } from '../auth'

const repo = new TenantsRepository(db)
const controller = new TenantsController(repo)

export const tenant_routes = new Elysia({ prefix: '/tenants' })
	// Allow authenticated users to get their own tenant
	.use(requireRole([]))
	.get('/:id', ({ params, currentUserId, currentTenantId, currentRole, set }) => {
		const tenantId = Number(params.id)
		
		
		// Super admin can access any tenant
		if (currentRole === 'super_admin') {
			return controller.getById(tenantId)
		}
		
		// Other users can only access their own tenant
		if (currentTenantId !== tenantId) {
			set.status = 403
			return { data: null, message: 'Access denied. You can only access your own tenant information.', status: 403 }
		}
		
		return controller.getById(tenantId)
	}, { detail: { tags: ['Tenants'], summary: 'Get tenant by id (own tenant or super_admin)' } })
	
	// Allow authenticated users to update their own tenant
	.patch('/:id', ({ params, body, currentUserId, currentTenantId, currentRole, set }) => {
		const tenantId = Number(params.id)
		const isAdmin = currentRole === 'super_admin'
		console.log('isAdmin', isAdmin)
		console.log('currentTenantId', currentTenantId)
		console.log('tenantId', tenantId)
		
		// Super admin can update any tenant
		if (isAdmin) {
			return controller.update(tenantId, body as any, true)
		}
		
		// Other users can only update their own tenant
		if (currentTenantId !== tenantId) {
			set.status = 403
			return { data: null, message: 'Access denied. You can only update your own tenant information.', status: 403 }
		}
		
		return controller.update(tenantId, body as any, false)
	}, { body: TenantUpdate, detail: { tags: ['Tenants'], summary: 'Update tenant (own tenant or super_admin)' } })
	
	// Super admin only routes
	
	.get('/', ({ query, currentRole }) => controller.list(query as any, currentRole as string), { query: TenantListQuery, detail: { tags: ['Tenants'], summary: 'List tenants (super_admin only)' } })
	.post('/', ({ body, currentRole }) => controller.create(body as any, currentRole as string), { body: TenantCreate, detail: { tags: ['Tenants'], summary: 'Create tenant (super_admin only)' } })
	.delete('/:id', ({ params, currentRole }) => controller.remove(Number(params.id), currentRole as string), { detail: { tags: ['Tenants'], summary: 'Delete tenant (super_admin only)' } })
