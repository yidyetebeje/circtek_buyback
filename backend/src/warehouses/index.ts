import Elysia from 'elysia'
import { db } from '../db'
import { WarehousesRepository } from './repository'
import { WarehousesController } from './controller'
import { WarehouseCreate, WarehouseListQuery, WarehouseUpdate } from './types'
import { requireRole } from '../auth'

const repo = new WarehousesRepository(db)
const controller = new WarehousesController(repo)

export const warehouse_routes = new Elysia({ prefix: '/warehouses' })
	.use(requireRole([]))
	.get('/', (ctx) => {
		const { query, currentRole, currentTenantId } = ctx as any
		const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
		return controller.list({ ...(query as any), tenant_id: tenantScoped } as any)
	}, { query: WarehouseListQuery, detail: { tags: ['Warehouses'], summary: 'List warehouses' } })
	.get('/:id', (ctx) => {
		const { params, currentRole, currentTenantId } = ctx as any
		return controller.getOne(Number(params.id), currentRole === 'super_admin' ? undefined : (currentTenantId as string))
	}, { detail: { tags: ['Warehouses'], summary: 'Get warehouse by id' } })
	.post('/', ({ body }) => controller.create(body as any), { body: WarehouseCreate, detail: { tags: ['Warehouses'], summary: 'Create warehouse' } })
	.patch('/:id', (ctx) => {
		const { params, body, currentRole, currentTenantId } = ctx as any
		return controller.update(Number(params.id), body as any, currentRole === 'super_admin' ? undefined : (currentTenantId as string))
	}, { body: WarehouseUpdate, detail: { tags: ['Warehouses'], summary: 'Update warehouse' } })
	.delete('/:id', (ctx) => {
		const { params, currentRole, currentTenantId } = ctx as any
		return controller.remove(Number(params.id), currentRole === 'super_admin' ? undefined : (currentTenantId as string))
	}, { detail: { tags: ['Warehouses'], summary: 'Delete warehouse' } })



