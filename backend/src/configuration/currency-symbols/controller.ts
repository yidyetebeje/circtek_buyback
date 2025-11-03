import type { response } from '../../types/response'
import { CurrencySymbolsRepository } from './repository'
import type { 
    CurrencySymbolCreateInput, 
    CurrencySymbolPublic, 
    CurrencySymbolUpdateInput,
    CurrencyPreferenceUpdateInput,
    TenantCurrencyPreferencePublic
} from './types'

export class CurrencySymbolsController {
    constructor(private readonly repo: CurrencySymbolsRepository) {}

    // Currency Symbols management
    async list(
        queryTenantId: number | null | undefined,
        currentRole: string | undefined,
        currentTenantId: number
    ): Promise<response<CurrencySymbolPublic[]>> {
        const hasValidQueryTenant = typeof queryTenantId === 'number' && Number.isFinite(queryTenantId)
        const resolvedTenantId = currentRole === 'super_admin' ? (hasValidQueryTenant ? queryTenantId! : currentTenantId) : currentTenantId
        
        const symbols = await this.repo.listByTenant(resolvedTenantId)
        return {
            data: symbols,
            message: 'OK',
            status: 200
        }
    }

    async create(payload: CurrencySymbolCreateInput, tenantId: number, actorId?: number): Promise<response<CurrencySymbolPublic | null>> {
        try {
            // Check if currency code already exists for this tenant
            const existing = await this.repo.getByCode(tenantId, payload.code)
            if (existing) {
                return { 
                    data: null, 
                    message: `Currency symbol with code '${payload.code}' already exists for this tenant`, 
                    status: 409 
                }
            }

            const created = await this.repo.create({ ...payload, tenant_id: tenantId }, actorId)
            return { data: created, message: 'Currency symbol created', status: 201 }
        } catch (error: any) {
            console.error('Failed to create currency symbol:', error)
            return { 
                data: null, 
                message: error.message || 'Failed to create currency symbol', 
                status: 400 
            }
        }
    }

    async get(id: number, tenantId: number): Promise<response<CurrencySymbolPublic | null>> {
        const found = await this.repo.getById(tenantId, id)
        if (!found) return { data: null, message: 'Not found', status: 404 }
        return { data: found, message: 'OK', status: 200 }
    }

    async update(id: number, payload: CurrencySymbolUpdateInput, tenantId: number, actorId?: number): Promise<response<CurrencySymbolPublic | null>> {
        try {
            // Check if updating code to one that already exists
            if (payload.code) {
                const existing = await this.repo.getByCode(tenantId, payload.code)
                if (existing && existing.id !== id) {
                    return { 
                        data: null, 
                        message: `Currency symbol with code '${payload.code}' already exists for this tenant`, 
                        status: 409 
                    }
                }
            }

            const updated = await this.repo.update(tenantId, id, payload, actorId)
            if (!updated) return { data: null, message: 'Not found or forbidden', status: 404 }
            return { data: updated, message: 'Currency symbol updated', status: 200 }
        } catch (error: any) {
            console.error('Failed to update currency symbol:', error)
            return { 
                data: null, 
                message: error.message || 'Failed to update currency symbol', 
                status: 400 
            }
        }
    }

    async delete(id: number, tenantId: number): Promise<response<{ id: number } | null>> {
        const result = await this.repo.remove(tenantId, id)
        if (!result.success) {
            return { data: null, message: result.error || 'Failed to delete', status: 400 }
        }
        return { data: { id }, message: 'Currency symbol deleted', status: 200 }
    }

    // User Preferences
    async getTenantPreference(tenantId: number): Promise<response<TenantCurrencyPreferencePublic | null>> {
        try {
            const resolved = await this.repo.getTenantPreference(tenantId)
            return { data: resolved, message: 'OK', status: 200 }
        } catch (error: any) {
            console.error('Failed to get user currency preference:', error)
            // Fallback to system default
            return { 
                data: { code: 'EUR', updated_at: null, tenant_id: tenantId }, 
                message: 'OK', 
                status: 200 
            }
        }
    }

    async setUserPreference(
        payload: CurrencyPreferenceUpdateInput, 
        tenantId: number, 
        userId: number
    ): Promise<response<TenantCurrencyPreferencePublic | null>> {
        try {
            console.log('setUserPreference called with:', {
                payload,
                payloadType: typeof payload,
                payloadKeys: payload ? Object.keys(payload) : null,
                tenantId,
                userId,
                code: payload?.code
            });
            
            if (!payload || !payload.code) {
                throw new Error('Invalid payload: code is required');
            }
            
            await this.repo.upsertUserPreference(tenantId, userId, payload.code)
            const resolved = await this.repo.getTenantPreference(tenantId)
            return { data: resolved, message: 'Currency preference updated', status: 200 }
        } catch (error: any) {
            console.error('Failed to set user currency preference:', error)
            return { 
                data: null, 
                message: error.message || 'Failed to update currency preference', 
                status: 400 
            }
        }
    }
}