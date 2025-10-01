import type { response } from '../../types/response'
import { GradesRepository } from './repository'
import type { GradeCreateInput, GradePublic, GradeUpdateInput } from './types'

export class GradesController {
    constructor(private readonly repo: GradesRepository) {}

    async list(
        queryTenantId: number | null | undefined,
        currentRole: string | undefined,
        currentTenantId: number,
        search?: string,
        page?: number,
        limit?: number,
        sort?: string,
        order?: 'asc' | 'desc'
    ): Promise<response<GradePublic[]>> {
        const hasValidQueryTenant = typeof queryTenantId === 'number' && Number.isFinite(queryTenantId)
        const resolvedTenantId = currentRole === 'super_admin' ? (hasValidQueryTenant ? queryTenantId! : null) : currentTenantId
        const result = await this.repo.list(resolvedTenantId, search, page, limit, sort, order)
        return {
            data: result.data,
            message: 'OK',
            status: 200,
            meta: {
                total: result.total,
                page: page ?? 1,
                limit: limit ?? 10,
                totalPages: Math.ceil(result.total / (limit ?? 10))
            }
        }
    }

    async create(payload: GradeCreateInput, tenantId: number): Promise<response<GradePublic | null>> {
        const created = await this.repo.create({ ...payload, tenant_id: tenantId })
        return { data: created ?? null, message: 'Grade created', status: 201 }
    }

    async get(id: number, tenantId: number, currentRole: string, queryTenantId?: number): Promise<response<GradePublic | null>> {
        const resolvedTenantId = currentRole === 'super_admin' ? (queryTenantId ?? tenantId) : tenantId
        const found = await this.repo.get(id, resolvedTenantId)
        if (!found) return { data: null, message: 'Not found', status: 404 }
        return { data: found, message: 'OK', status: 200 }
    }

    async update(id: number, payload: GradeUpdateInput, tenantId: number): Promise<response<GradePublic | null>> {
        const updated = await this.repo.update(id, payload, tenantId)
        if (!updated) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: updated, message: 'Updated', status: 200 }
    }

    async delete(id: number, tenantId: number): Promise<response<{ id: number } | null>> {
        const result = await this.repo.delete(id, tenantId)
        if (!result.success) {
            return { data: null, message: result.error || 'Failed to delete', status: 400 }
        }
        return { data: { id }, message: 'Deleted', status: 200 }
    }
}


