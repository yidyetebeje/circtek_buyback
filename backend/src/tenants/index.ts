import Elysia from 'elysia'
import { db } from '../db'
import { TenantsRepository } from './repository'
import { TenantsController } from './controller'
import { TenantCreate, TenantListQuery, TenantUpdate } from './types'
import { requireRole } from '../auth'

const repo = new TenantsRepository(db)
const controller = new TenantsController(repo)

export const tenant_routes = new Elysia({ prefix: '/tenants' })
	.use(requireRole(['super_admin']))
	.get('/', ({ query }) => controller.list(query as any), { query: TenantListQuery, detail: { tags: ['Tenants'], summary: 'List tenants (super_admin only)' } })
	.post('/', ({ body }) => controller.create(body as any), { body: TenantCreate, detail: { tags: ['Tenants'], summary: 'Create tenant (super_admin only)' } })
	.patch('/:id', ({ params, body }) => controller.update(Number(params.id), body as any), { body: TenantUpdate, detail: { tags: ['Tenants'], summary: 'Update tenant (super_admin only)' } })
	.delete('/:id', ({ params }) => controller.remove(Number(params.id)), { detail: { tags: ['Tenants'], summary: 'Delete tenant (super_admin only)' } })
