import Elysia from 'elysia'
import { db } from '../db'
import { RolesRepository } from './repository'
import { RolesController } from './controller'
import { RoleCreate, RoleListQuery, RoleUpdate } from './types'
import { requireRole } from '../auth'

const repo = new RolesRepository(db)
const controller = new RolesController(repo)

export const role_routes = new Elysia({ prefix: '/roles' })
	// Allow any authenticated role to read roles
	.use(requireRole([]))
	.get('/', ({ query }) => controller.list(query as any), { query: RoleListQuery, detail: { tags: ['Roles'], summary: 'List roles' } })
	.get('/:id', ({ params }) => controller.getOne(Number(params.id)), { detail: { tags: ['Roles'], summary: 'Get role by id' } })
	// Restrict write operations to super_admin
	.use(requireRole(['super_admin']))
	.post('/', ({ body }) => controller.create(body as any), { body: RoleCreate, detail: { tags: ['Roles'], summary: 'Create role' } })
	.patch('/:id', ({ params, body }) => controller.update(Number(params.id), body as any), { body: RoleUpdate, detail: { tags: ['Roles'], summary: 'Update role' } })
	.delete('/:id', ({ params }) => controller.remove(Number(params.id)), { detail: { tags: ['Roles'], summary: 'Delete role' } })


