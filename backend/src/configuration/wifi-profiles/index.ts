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
        const { body, currentTenantId, currentRole } = ctx as any
        // Super admin can specify tenant_id in body, others use their own tenant
        const tenantId = currentRole === 'super_admin' && body.tenant_id ? Number(body.tenant_id) : Number(currentTenantId)
       
        const response = await controller.create(body as any, tenantId)
        ctx.set.status = response.status as any
        return response
    }, { body: WiFiProfileCreate, detail: { tags: ['Configuration'], summary: 'Create WiFi profile' } })
    .get('/:id', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        const response = await controller.get(Number(params.id), Number(tenantId))
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Get WiFi profile by id (tenant-scoped)' } })
    .patch('/:id', async (ctx) => {
        const { params, body, currentTenantId } = ctx as any
        const response = await controller.update(Number(params.id), body as any, Number(currentTenantId))
        ctx.set.status = response.status as any
        return response
    }, { body: WiFiProfileUpdate, detail: { tags: ['Configuration'], summary: 'Update WiFi profile (tenant-scoped)' } })
    .delete('/:id', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        const response = await controller.delete(Number(params.id), Number(currentTenantId))
        console.log("response", response)
        
        ctx.set.status = response.status
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Delete WiFi profile (tenant-scoped)' } })
    .post('/:id/assign/:userId', async (ctx) => {
        const { params, currentTenantId, currentUserId, currentRole } = ctx as any
        const response = await controller.assignToUser(Number(params.id), Number(params.userId), Number(currentTenantId), Number(currentUserId), currentRole)
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Assign WiFi profile to tester (tenant-guarded)' } })
    .post('/:id/unassign/:userId', async (ctx) => {
        const { params, currentTenantId, currentUserId, currentRole } = ctx as any
        const response = await controller.unassignFromUser(Number(params.id), Number(params.userId), Number(currentTenantId), Number(currentUserId), currentRole)
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Unassign WiFi profile from tester (tenant-guarded)' } })
    .get('/:id/testers', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        const response = await controller.listTesters(Number(params.id), Number(tenantId))
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Configuration'], summary: 'List testers assigned to a WiFi profile (tenant-scoped)' } })
    .get('/tester/:testerId', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        const response = await controller.getByTesterId(Number(params.testerId), Number(tenantId))
        ctx.set.status = response.status as any
        return response    
    }, { detail: { tags: ['Configuration'], summary: 'Get WiFi profile assigned to a tester (tenant-scoped)' } })


