import Elysia from 'elysia'
import { db } from '../../db'
import { requireRole } from '../../auth'
import { OtaUpdateCreate, OtaUpdateUpdate, VersionCheckRequest } from './types'
import { OtaUpdatesController } from './controller'
import { OtaUpdatesRepository } from './repository'

const repo = new OtaUpdatesRepository(db)
const controller = new OtaUpdatesController(repo)

export const ota_updates_routes = new Elysia({ prefix: '/ota-updates' })
    .use(requireRole([]))
    .get('/', async (ctx) => {
        const { currentRole, currentTenantId, query } = ctx as any
        const tenantParam = query?.tenant_id
        const queryTenantId = tenantParam !== undefined ? Number(tenantParam) : undefined
        const page = query?.page ? Number(query.page) : 1
        const limit = query?.limit ? Number(query.limit) : 10
        const search = query?.search || undefined
        const sortField = query?.sort || undefined
        const sortOrder = (query?.order === 'asc' || query?.order === 'desc') ? query.order : 'desc'
        return controller.list(queryTenantId, currentRole, Number(currentTenantId), page, limit, search, sortField, sortOrder)
    }, { detail: { tags: ['Configuration'], summary: 'List OTA updates (tenant-scoped)' } })
    .post('/', async (ctx) => {
        const { body, currentTenantId } = ctx as any
        return controller.create(body as any, Number(currentTenantId))
    }, { body: OtaUpdateCreate, detail: { tags: ['Configuration'], summary: 'Create OTA update' } })
    .get('/:id', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        return controller.get(Number(params.id), Number(tenantId))
    }, { detail: { tags: ['Configuration'], summary: 'Get OTA update by id (tenant-scoped)' } })
    .patch('/:id', async (ctx) => {
        const { params, body, currentTenantId } = ctx as any
        return controller.update(Number(params.id), body as any, Number(currentTenantId))
    }, { body: OtaUpdateUpdate, detail: { tags: ['Configuration'], summary: 'Update OTA update (tenant-scoped)' } })
    .delete('/:id', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        const response = await controller.delete(Number(params.id), Number(currentTenantId))
        ctx.set.status = response.status
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Delete OTA update (tenant-scoped)' } })
    .post('/:id/assign/:userId', async (ctx) => {
        const { params, currentTenantId, currentUserId, currentRole } = ctx as any
        return controller.assignToUser(Number(params.id), Number(params.userId), Number(currentTenantId), Number(currentUserId), currentRole)
    }, { detail: { tags: ['Configuration'], summary: 'Assign OTA update to tester (tenant-guarded)' } })
    .post('/:id/unassign/:userId', async (ctx) => {
        const { params, currentTenantId, currentUserId, currentRole } = ctx as any
        return controller.unassignFromUser(Number(params.id), Number(params.userId), Number(currentTenantId), Number(currentUserId), currentRole)
    }, { detail: { tags: ['Configuration'], summary: 'Unassign OTA update from tester (tenant-guarded)' } })
    .get('/:id/testers', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        return controller.listTesters(Number(params.id), Number(tenantId))
    }, { detail: { tags: ['Configuration'], summary: 'List testers assigned to an OTA update (tenant-scoped)' } })
    .get('/tester/:testerId', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        return controller.getByTesterId(Number(params.testerId), Number(tenantId))
    }, { detail: { tags: ['Configuration'], summary: 'Get OTA update assigned to a tester (tenant-scoped)' } })
    .post('/check-update', async (ctx) => {
        const { body, currentUserId, currentTenantId } = ctx as any
       
       
       
        return controller.checkForUpdate(Number(currentUserId), Number(currentTenantId), body as any)
    }, { 
        body: VersionCheckRequest, 
        detail: { 
            tags: ['Configuration'], 
            summary: 'Check for available updates by comparing current version with assigned OTA update' 
        } 
    })
