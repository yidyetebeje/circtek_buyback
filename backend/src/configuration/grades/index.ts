import Elysia from 'elysia'
import { db } from '../../db'
import { requireRole } from '../../auth'
import { GradeCreate, GradeUpdate } from './types'
import { GradesController } from './controller'
import { GradesRepository } from './repository'

const repo = new GradesRepository(db)
const controller = new GradesController(repo)

export const grades_routes = new Elysia({ prefix: '/grades' })
    .use(requireRole([]))
    .get('/', async (ctx) => {
        const { currentRole, currentTenantId, query } = ctx as any
        const tenantParam = query?.tenant_id
        const queryTenantId = tenantParam !== undefined ? Number(tenantParam) : undefined
        const search = query?.search
        const page = query?.page ? Number(query.page) : undefined
        const limit = query?.limit ? Number(query.limit) : undefined
        const sort = query?.sort
        const order = query?.order === 'desc' ? 'desc' : 'asc'
        return controller.list(queryTenantId, currentRole, Number(currentTenantId), search, page, limit, sort, order)
    }, { detail: { tags: ['Grades'], summary: 'List grades (tenant-scoped or all for super_admin)' } })
    .post('/', async (ctx) => {
        const { body, currentTenantId } = ctx as any
        return controller.create(body as any, Number(currentTenantId))
    }, { body: GradeCreate, detail: { tags: ['Grades'], summary: 'Create grade' } })
    .get('/:id', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        return controller.get(Number(params.id), Number(currentTenantId), currentRole, query?.tenant_id ? Number(query.tenant_id) : undefined)
    }, { detail: { tags: ['Grades'], summary: 'Get grade by id (tenant-scoped)' } })
    .patch('/:id', async (ctx) => {
        const { params, body, currentTenantId } = ctx as any
        return controller.update(Number(params.id), body as any, Number(currentTenantId))
    }, { body: GradeUpdate, detail: { tags: ['Grades'], summary: 'Update grade (tenant-scoped)' } })
    .delete('/:id', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        return controller.delete(Number(params.id), Number(currentTenantId))
    }, { detail: { tags: ['Grades'], summary: 'Delete grade (tenant-scoped)' } })


