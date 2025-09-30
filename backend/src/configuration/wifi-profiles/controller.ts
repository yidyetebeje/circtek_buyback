import type { response } from '../../types/response'
import { WiFiProfilesRepository } from './repository'
import type { WiFiProfileCreateInput, WiFiProfilePublic, WiFiProfileUpdateInput } from './types'

export class WiFiProfilesController {
    constructor(private readonly repo: WiFiProfilesRepository) {}

    async list(queryTenantId: number | null | undefined, currentRole: string | undefined, currentTenantId: number): Promise<response<WiFiProfilePublic[]>> {
        const hasValidQueryTenant = typeof queryTenantId === 'number' && Number.isFinite(queryTenantId)
        const resolvedTenantId = currentRole === 'super_admin' ? (hasValidQueryTenant ? queryTenantId! : null) : currentTenantId
        const rows = await this.repo.list(resolvedTenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async create(payload: WiFiProfileCreateInput, tenantId: number): Promise<response<WiFiProfilePublic | null>> {
        const created = await this.repo.create({ ...payload, tenant_id: tenantId })
        return { data: created ?? null, message: 'WiFi Profile created', status: 201 }
    }

    async get(id: number, tenantId: number): Promise<response<WiFiProfilePublic | null>> {
        const found = await this.repo.get(id, tenantId)
        if (!found) return { data: null, message: 'Not found', status: 404 }
        return { data: found, message: 'OK', status: 200 }
    }

    async update(id: number, payload: WiFiProfileUpdateInput, tenantId: number): Promise<response<WiFiProfilePublic | null>> {
        const updated = await this.repo.update(id, payload, tenantId)
        if (!updated) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: updated, message: 'Updated', status: 200 }
    }

    async delete(id: number, tenantId: number): Promise<response<{ id: number } | null>> {
        const ok = await this.repo.delete(id, tenantId)
        if (!ok) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: { id }, message: 'Deleted', status: 200 }
    }

    async assignToUser(wifiProfileId: number, userId: number, tenantId: number, actorId: number, currentRole?: string): Promise<response<{ user_id: number; wifi_profile_id: number } | null>> {
        if (currentRole === 'super_admin') {
            await this.repo.setUserWiFiProfile(userId, wifiProfileId)
            return { data: { user_id: userId, wifi_profile_id: wifiProfileId }, message: 'Assigned', status: 200 }
        }
        const allowed = await this.repo.ensureSameTenantForUserAndWiFi(userId, wifiProfileId, tenantId)
        if (!allowed) return { data: null, message: 'Forbidden: tenants mismatch', status: 403 }
        await this.repo.setUserWiFiProfile(userId, wifiProfileId)
        return { data: { user_id: userId, wifi_profile_id: wifiProfileId }, message: 'Assigned', status: 200 }
    }

    async unassignFromUser(wifiProfileId: number, userId: number, tenantId: number, actorId: number, currentRole?: string): Promise<response<{ user_id: number; wifi_profile_id: null } | null>> {
        if (currentRole === 'super_admin') {
            await this.repo.setUserWiFiProfile(userId, null)
            return { data: { user_id: userId, wifi_profile_id: null }, message: 'Unassigned', status: 200 }
        }
        const allowed = await this.repo.ensureSameTenantForUserAndWiFi(userId, wifiProfileId, tenantId)
        if (!allowed) return { data: null, message: 'Forbidden: tenants mismatch', status: 403 }
        await this.repo.setUserWiFiProfile(userId, null)
        return { data: { user_id: userId, wifi_profile_id: null }, message: 'Unassigned', status: 200 }
    }

    async listTesters(wifiProfileId: number, tenantId: number): Promise<response<any[]>> {
        const rows = await this.repo.listTesters(wifiProfileId, tenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async getByTesterId(testerId: number, tenantId: number): Promise<response<WiFiProfilePublic | null>> {
        const wifiProfile = await this.repo.getByTesterId(testerId, tenantId)
        if (!wifiProfile) return { data: null, message: 'No WiFi profile assigned to this tester', status: 404 }
        return { data: wifiProfile, message: 'OK', status: 200 }
    }
}


