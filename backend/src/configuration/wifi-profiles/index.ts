import Elysia from 'elysia'
import { db } from '../../db'
import { requireRole } from '../../auth'
import { WiFiProfileCreate, WiFiProfileUpdate } from './types'
import { WiFiProfilesController } from './controller'
import { WiFiProfilesRepository } from './repository'

const repo = new WiFiProfilesRepository(db)
const controller = new WiFiProfilesController(repo)

export const wifi_profiles_routes = new Elysia({ prefix: '/wifi-profiles' })
    .use(requireRole([]))
    .get('/', async (ctx) => {
        const { currentRole, currentTenantId, query } = ctx as any
        const tenantParam = query?.tenant_id
        const queryTenantId = tenantParam !== undefined ? Number(tenantParam) : undefined
        return controller.list(queryTenantId, currentRole, Number(currentTenantId))
    }, { detail: { tags: ['Configuration'], summary: 'List WiFi profiles (tenant-scoped)' } })
    .post('/', async (ctx) => {
        const { body, currentTenantId } = ctx as any
        return controller.create(body as any, Number(currentTenantId))
    }, { body: WiFiProfileCreate, detail: { tags: ['Configuration'], summary: 'Create WiFi profile' } })
    .get('/:id', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        return controller.get(Number(params.id), Number(tenantId))
    }, { detail: { tags: ['Configuration'], summary: 'Get WiFi profile by id (tenant-scoped)' } })
    .patch('/:id', async (ctx) => {
        const { params, body, currentTenantId } = ctx as any
        return controller.update(Number(params.id), body as any, Number(currentTenantId))
    }, { body: WiFiProfileUpdate, detail: { tags: ['Configuration'], summary: 'Update WiFi profile (tenant-scoped)' } })
    .delete('/:id', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        return controller.delete(Number(params.id), Number(currentTenantId))
    }, { detail: { tags: ['Configuration'], summary: 'Delete WiFi profile (tenant-scoped)' } })
    .post('/:id/assign/:userId', async (ctx) => {
        const { params, currentTenantId, currentUserId, currentRole } = ctx as any
        return controller.assignToUser(Number(params.id), Number(params.userId), Number(currentTenantId), Number(currentUserId), currentRole)
    }, { detail: { tags: ['Configuration'], summary: 'Assign WiFi profile to tester (tenant-guarded)' } })
    .post('/:id/unassign/:userId', async (ctx) => {
        const { params, currentTenantId, currentUserId, currentRole } = ctx as any
        return controller.unassignFromUser(Number(params.id), Number(params.userId), Number(currentTenantId), Number(currentUserId), currentRole)
    }, { detail: { tags: ['Configuration'], summary: 'Unassign WiFi profile from tester (tenant-guarded)' } })
    .get('/:id/testers', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        return controller.listTesters(Number(params.id), Number(tenantId))
    }, { detail: { tags: ['Configuration'], summary: 'List testers assigned to a WiFi profile (tenant-scoped)' } })
    .get('/tester/:testerId', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        return controller.getByTesterId(Number(params.testerId), Number(tenantId))
    }, { detail: { tags: ['Configuration'], summary: 'Get WiFi profile assigned to a tester (tenant-scoped)' } })


