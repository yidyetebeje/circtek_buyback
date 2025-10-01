import Elysia from 'elysia'
import { db } from '../../db'
import { requireRole } from '../../auth'
import { LabelTemplateCreate, LabelTemplateUpdate } from './types'
import { LabelTemplatesController } from './controller'
import { LabelTemplatesRepository } from './repository'

const repo = new LabelTemplatesRepository(db)
const controller = new LabelTemplatesController(repo)

export const label_templates_routes = new Elysia({ prefix: '/label-templates' })
    .use(requireRole([]))
    .get('/', async (ctx) => {
        const { currentRole, currentTenantId, query } = ctx as any
        const filters = {
            tenant_id: query?.tenant_id ? Number(query.tenant_id) : undefined,
            page: query?.page ? Number(query.page) : undefined,
            limit: query?.limit ? Number(query.limit) : undefined,
            sort: query?.sort,
            order: query?.order,
            search: query?.search   
        }
        return controller.list(filters, currentRole, Number(currentTenantId))
    }, { detail: { tags: ['Configuration'], summary: 'List label templates (tenant-scoped)' } })
    .post('/', async (ctx) => {
        const { body, currentTenantId } = ctx as any
        return controller.create(body as any, Number(currentTenantId))
    }, { body: LabelTemplateCreate, detail: { tags: ['Configuration'], summary: 'Create label template' } })
    .get('/:id', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        return controller.get(Number(params.id), Number(tenantId))
    }, { detail: { tags: ['Configuration'], summary: 'Get label template by id (tenant-scoped)' } })
    .patch('/:id', async (ctx) => {
        const { params, body, currentTenantId } = ctx as any
        return controller.update(Number(params.id), body as any, Number(currentTenantId))
    }, { body: LabelTemplateUpdate, detail: { tags: ['Configuration'], summary: 'Update label template (tenant-scoped)' } })
    .delete('/:id', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        const response = await controller.delete(Number(params.id), Number(currentTenantId))
        ctx.set.status = response.status
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Delete label template (tenant-scoped)' } })
    .post('/:id/assign/:userId', async (ctx) => {
        const { params, currentTenantId, currentUserId, currentRole } = ctx as any
        return controller.assignToUser(Number(params.id), Number(params.userId), Number(currentTenantId), Number(currentUserId), currentRole)
    }, { detail: { tags: ['Configuration'], summary: 'Assign label template to tester (tenant-guarded)' } })
    .post('/:id/unassign/:userId', async (ctx) => {
        const { params, currentTenantId, currentUserId, currentRole } = ctx as any
        return controller.unassignFromUser(Number(params.id), Number(params.userId), Number(currentTenantId), Number(currentUserId), currentRole)
    }, { detail: { tags: ['Configuration'], summary: 'Unassign label template from tester (tenant-guarded)' } })
    .get('/:id/testers', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        return controller.listTesters(Number(params.id), Number(tenantId))
    }, { detail: { tags: ['Configuration'], summary: 'List testers assigned to a label template (tenant-scoped)' } })
    .get('/tester/:testerId', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        return controller.getByTesterId(Number(params.testerId), Number(tenantId))
    }, { detail: { tags: ['Configuration'], summary: 'Get label template assigned to a tester (tenant-scoped)' } })


