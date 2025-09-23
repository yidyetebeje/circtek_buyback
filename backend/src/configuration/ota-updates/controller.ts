import type { response } from '../../types/response'
import { OtaUpdatesRepository } from './repository'
import type { OtaUpdateCreateInput, OtaUpdatePublic, OtaUpdateUpdateInput, VersionCheckRequestInput, VersionCheckResponse } from './types'

export class OtaUpdatesController {
    constructor(private readonly repo: OtaUpdatesRepository) {}

    async list(queryTenantId: number | null | undefined, currentRole: string | undefined, currentTenantId: number): Promise<response<OtaUpdatePublic[]>> {
        const hasValidQueryTenant = typeof queryTenantId === 'number' && Number.isFinite(queryTenantId)
        const resolvedTenantId = currentRole === 'super_admin' ? (hasValidQueryTenant ? queryTenantId! : null) : currentTenantId
        const rows = await this.repo.list(resolvedTenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async create(payload: OtaUpdateCreateInput, tenantId: number): Promise<response<OtaUpdatePublic | null>> {
        const created = await this.repo.create({ ...payload, tenant_id: tenantId })
        return { data: created ?? null, message: 'OTA update created', status: 201 }
    }

    async get(id: number, tenantId: number): Promise<response<OtaUpdatePublic | null>> {
        const found = await this.repo.get(id, tenantId)
        if (!found) return { data: null, message: 'Not found', status: 404 }
        return { data: found, message: 'OK', status: 200 }
    }

    async update(id: number, payload: OtaUpdateUpdateInput, tenantId: number): Promise<response<OtaUpdatePublic | null>> {
        const updated = await this.repo.update(id, payload, tenantId)
        if (!updated) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: updated, message: 'Updated', status: 200 }
    }

    async delete(id: number, tenantId: number): Promise<response<{ id: number } | null>> {
        const ok = await this.repo.delete(id, tenantId)
        if (!ok) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: { id }, message: 'Deleted', status: 200 }
    }

    async assignToUser(otaUpdateId: number, userId: number, tenantId: number, actorId: number): Promise<response<{ user_id: number; ota_update_id: number } | null>> {
        const allowed = await this.repo.ensureSameTenantForUserAndOta(userId, otaUpdateId, tenantId)
        if (!allowed) return { data: null, message: 'Forbidden: tenants mismatch', status: 403 }
        await this.repo.setUserOtaUpdate(userId, otaUpdateId)
        return { data: { user_id: userId, ota_update_id: otaUpdateId }, message: 'Assigned', status: 200 }
    }

    async unassignFromUser(otaUpdateId: number, userId: number, tenantId: number, actorId: number): Promise<response<{ user_id: number; ota_update_id: null } | null>> {
        const allowed = await this.repo.ensureSameTenantForUserAndOta(userId, otaUpdateId, tenantId)
        if (!allowed) return { data: null, message: 'Forbidden: tenants mismatch', status: 403 }
        await this.repo.setUserOtaUpdate(userId, null)
        return { data: { user_id: userId, ota_update_id: null }, message: 'Unassigned', status: 200 }
    }

    async listTesters(otaUpdateId: number, tenantId: number): Promise<response<any[]>> {
        const rows = await this.repo.listTesters(otaUpdateId, tenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async getByTesterId(testerId: number, tenantId: number): Promise<response<OtaUpdatePublic | null>> {
        const otaUpdate = await this.repo.getByTesterId(testerId, tenantId)
        if (!otaUpdate) return { data: null, message: 'No OTA update assigned to this tester', status: 404 }
        return { data: otaUpdate, message: 'OK', status: 200 }
    }

    async checkForUpdate(testerId: number, tenantId: number, payload: VersionCheckRequestInput): Promise<response<VersionCheckResponse>> {
        const { current_version, target_os, target_architecture } = payload
        
        try {
            const availableUpdate = await this.repo.checkForUpdate(
                testerId, 
                tenantId, 
                current_version, 
                target_os, 
                target_architecture
            )
            
            if (availableUpdate) {
                const response: VersionCheckResponse = {
                    update_available: true,
                    current_version,
                    latest_version: availableUpdate.version,
                    download_url: availableUpdate.url,
                    message: `Update available: ${availableUpdate.version} for ${target_os} (${target_architecture})`
                }
                return { data: response, message: 'Update available', status: 200 }
            } else {
                const response: VersionCheckResponse = {
                    update_available: false,
                    current_version,
                    message: `No updates available for ${target_os} (${target_architecture}). You are running the latest version or no update is assigned.`
                }
                return { data: response, message: 'No update available', status: 200 }
            }
        } catch (error) {
            const response: VersionCheckResponse = {
                update_available: false,
                current_version,
                message: 'Error checking for updates. Please try again later.'
            }
            return { data: response, message: 'Error checking for updates', status: 500 }
        }
    }
}
