import Elysia from 'elysia'
import { db } from '../../db'
import { requireRole } from '../../auth'
import { CurrencySymbolCreate, CurrencySymbolUpdate, CurrencyPreferenceUpdate } from './types'
import { CurrencySymbolsController } from './controller'
import { CurrencySymbolsRepository } from './repository'

const repo = new CurrencySymbolsRepository(db)
const controller = new CurrencySymbolsController(repo)

export const currency_symbols_routes = new Elysia({ prefix: '/currency-symbols' })
    .use(requireRole([]))
    // Currency Symbols CRUD
    .get('/', async (ctx) => {
        const { currentRole, currentTenantId, query } = ctx as any
        const tenantParam = query?.tenant_id
        const queryTenantId = tenantParam !== undefined ? Number(tenantParam) : undefined
        return controller.list(queryTenantId, currentRole, Number(currentTenantId))
    }, { detail: { tags: ['Currency Symbols'], summary: 'List currency symbols (tenant-scoped or all for super_admin)' } })
    .post('/', async (ctx) => {
        const { body, currentTenantId, currentUserId } = ctx as any
        return controller.create(body as any, Number(currentTenantId), Number(currentUserId))
    }, { body: CurrencySymbolCreate, detail: { tags: ['Currency Symbols'], summary: 'Create currency symbol' } })
    .get('/:id', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        return controller.get(Number(params.id), Number(currentTenantId))
    }, { detail: { tags: ['Currency Symbols'], summary: 'Get currency symbol by id (tenant-scoped)' } })
    .put('/:id', async (ctx) => {
        const { params, body, currentTenantId, currentUserId } = ctx as any
        return controller.update(Number(params.id), body as any, Number(currentTenantId), Number(currentUserId))
    }, { body: CurrencySymbolUpdate, detail: { tags: ['Currency Symbols'], summary: 'Update currency symbol (tenant-scoped)' } })
    .delete('/:id', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        const response = await controller.delete(Number(params.id), Number(currentTenantId))
        ctx.set.status = response.status
        return response
    }, { detail: { tags: ['Currency Symbols'], summary: 'Delete currency symbol (tenant-scoped)' } })

export const currency_preference_routes = new Elysia({ prefix: '/currency-preference' })
    .use(requireRole([]))
    // User Currency Preference
    .get('/', async (ctx) => {
        const { currentTenantId, currentUserId } = ctx as any
        return controller.getTenantPreference(Number(currentTenantId))
    }, { detail: { tags: ['Currency Preference'], summary: 'Get current user currency preference' } })
    .put('/', async (ctx) => {
        const { body, currentTenantId, currentUserId } = ctx as any
        console.log('Currency preference PUT route - raw data:', {
            body,
            bodyType: typeof body,
            bodyKeys: body ? Object.keys(body) : null,
            currentTenantId,
            currentUserId
        });
        
        if (!body) {
            return {
                data: null,
                message: 'Request body is required',
                status: 400
            };
        }
        
        return controller.setUserPreference(body as any, Number(currentTenantId), Number(currentUserId))
    }, { body: CurrencyPreferenceUpdate, detail: { tags: ['Currency Preference'], summary: 'Set user currency preference' } })

// Export both route groups and types for external use
export { CurrencySymbolsRepository, CurrencySymbolsController }
export * from './types'