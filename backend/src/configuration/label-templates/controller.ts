import type { response } from '../../types/response'
import { LabelTemplatesRepository } from './repository'
import type { LabelTemplateCreateInput, LabelTemplateListQueryInput, LabelTemplatePublic, LabelTemplateUpdateInput } from './types'

export class LabelTemplatesController {
    constructor(private readonly repo: LabelTemplatesRepository) {}

    async list(filters: LabelTemplateListQueryInput, currentRole: string | undefined, currentTenantId: number): Promise<response<LabelTemplatePublic[]>> {
        const hasValidQueryTenant = typeof filters.tenant_id === 'number' && Number.isFinite(filters.tenant_id)
        const resolvedTenantId = currentRole === 'super_admin' ? (hasValidQueryTenant ? filters.tenant_id! : undefined) : currentTenantId
        
        const queryFilters: LabelTemplateListQueryInput = {
            ...filters,
            tenant_id: resolvedTenantId
        }
        
        const result = await this.repo.list(queryFilters)
        return { 
            data: result.rows, 
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit
            },
            message: 'OK', 
            status: 200 
        }
    }

    async create(payload: LabelTemplateCreateInput, tenantId: number): Promise<response<LabelTemplatePublic | null>> {
        const created = await this.repo.create({ ...payload, tenant_id: tenantId })
        return { data: created ?? null, message: 'Label template created', status: 201 }
    }

    async get(id: number, tenantId: number): Promise<response<LabelTemplatePublic | null>> {
        const found = await this.repo.get(id, tenantId)
        if (!found) return { data: null, message: 'Not found', status: 404 }
        return { data: found, message: 'OK', status: 200 }
    }

    async update(id: number, payload: LabelTemplateUpdateInput, tenantId: number): Promise<response<LabelTemplatePublic | null>> {
        const updated = await this.repo.update(id, payload, tenantId)
        if (!updated) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: updated, message: 'Updated', status: 200 }
    }

    async delete(id: number, tenantId: number): Promise<response<{ id: number } | null>> {
        const ok = await this.repo.delete(id, tenantId)
        if (!ok) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: { id }, message: 'Deleted', status: 200 }
    }

    async assignToUser(labelTemplateId: number, userId: number, tenantId: number, actorId: number): Promise<response<{ user_id: number; label_template_id: number } | null>> {
        const allowed = await this.repo.ensureSameTenantForUserAndLabel(userId, labelTemplateId, tenantId)
        if (!allowed) return { data: null, message: 'Forbidden: tenants mismatch', status: 403 }
        await this.repo.setUserLabelTemplate(userId, labelTemplateId)
        return { data: { user_id: userId, label_template_id: labelTemplateId }, message: 'Assigned', status: 200 }
    }

    async unassignFromUser(labelTemplateId: number, userId: number, tenantId: number, actorId: number): Promise<response<{ user_id: number; label_template_id: null } | null>> {
        const allowed = await this.repo.ensureSameTenantForUserAndLabel(userId, labelTemplateId, tenantId)
        if (!allowed) return { data: null, message: 'Forbidden: tenants mismatch', status: 403 }
        await this.repo.setUserLabelTemplate(userId, null)
        return { data: { user_id: userId, label_template_id: null }, message: 'Unassigned', status: 200 }
    }

    async listTesters(labelTemplateId: number, tenantId: number): Promise<response<any[]>> {
        const rows = await this.repo.listTesters(labelTemplateId, tenantId)
        return { data: rows, message: 'OK', status: 200 }
    }
}


