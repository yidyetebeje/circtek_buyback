import type { response } from '../../types/response'
import { GradesRepository } from './repository'
import type { GradeCreateInput, GradePublic, GradeUpdateInput } from './types'

export class GradesController {
    constructor(private readonly repo: GradesRepository) {}

    async list(tenantId?: number | null): Promise<response<GradePublic[]>> {
        const rows = await this.repo.list(tenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async create(payload: GradeCreateInput, tenantId: number): Promise<response<GradePublic | null>> {
        const created = await this.repo.create({ ...payload, tenant_id: tenantId })
        return { data: created ?? null, message: 'Grade created', status: 201 }
    }

    async get(id: number, tenantId: number): Promise<response<GradePublic | null>> {
        const found = await this.repo.get(id, tenantId)
        if (!found) return { data: null, message: 'Not found', status: 404 }
        return { data: found, message: 'OK', status: 200 }
    }

    async update(id: number, payload: GradeUpdateInput, tenantId: number): Promise<response<GradePublic | null>> {
        const updated = await this.repo.update(id, payload, tenantId)
        if (!updated) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: updated, message: 'Updated', status: 200 }
    }

    async delete(id: number, tenantId: number): Promise<response<{ id: number } | null>> {
        const ok = await this.repo.delete(id, tenantId)
        if (!ok) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: { id }, message: 'Deleted', status: 200 }
    }
}


