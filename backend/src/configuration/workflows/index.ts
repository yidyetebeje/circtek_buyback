import Elysia from 'elysia'
import { db } from '../../db'
import { requireRole } from '../../auth'
import { WorkflowCreate, WorkflowUpdate } from './types'
import { WorkflowsController } from './controller'
import { WorkflowsRepository } from './repository'

const repo = new WorkflowsRepository(db)
const controller = new WorkflowsController(repo)

export const workflows_routes = new Elysia({ prefix: '/workflows' })
    .use(requireRole([]))
    .get('/', async (ctx) => {
        const { currentRole, currentTenantId, query } = ctx as any
        const tenantParam = query?.tenant_id
        const queryTenantId = tenantParam !== undefined ? Number(tenantParam) : undefined
        return controller.list(queryTenantId, currentRole, Number(currentTenantId))
    }, { detail: { tags: ['Configuration'], summary: 'List workflows (tenant-scoped)' } })
    .post('/', async (ctx) => {
        const { body, currentTenantId } = ctx as any
        return controller.create(body as any, Number(currentTenantId))
    }, { body: WorkflowCreate, detail: { tags: ['Configuration'], summary: 'Create workflow' } })
    .get('/:id', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        return controller.get(Number(params.id), Number(tenantId))
    }, { detail: { tags: ['Configuration'], summary: 'Get workflow by id (tenant-scoped)' } })
    .patch('/:id', async (ctx) => {
        const { params, body, currentTenantId } = ctx as any
        return controller.update(Number(params.id), body as any, Number(currentTenantId))
    }, { body: WorkflowUpdate, detail: { tags: ['Configuration'], summary: 'Update workflow (tenant-scoped)' } })
    .delete('/:id', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        return controller.delete(Number(params.id), Number(currentTenantId))
    }, { detail: { tags: ['Configuration'], summary: 'Delete workflow (tenant-scoped)' } })
    .post('/:id/assign/:userId', async (ctx) => {
        const { params, currentTenantId, currentUserId } = ctx as any
        return controller.assignToUser(Number(params.id), Number(params.userId), Number(currentTenantId), Number(currentUserId))
    }, { detail: { tags: ['Configuration'], summary: 'Assign workflow to tester (tenant-guarded)' } })
    .post('/:id/unassign/:userId', async (ctx) => {
        const { params, currentTenantId, currentUserId } = ctx as any
        return controller.unassignFromUser(Number(params.id), Number(params.userId), Number(currentTenantId), Number(currentUserId))
    }, { detail: { tags: ['Configuration'], summary: 'Unassign workflow from tester (tenant-guarded)' } })
    .get('/:id/testers', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        return controller.listTesters(Number(params.id), Number(tenantId))
    }, { detail: { tags: ['Configuration'], summary: 'List testers assigned to a workflow (tenant-scoped)' } })


