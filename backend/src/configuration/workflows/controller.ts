import type { response } from '../../types/response'
import { WorkflowsRepository } from './repository'
import type { WorkflowCreateInput, WorkflowListQueryInput, WorkflowPublic, WorkflowUpdateInput } from './types'

export class WorkflowsController {
    constructor(private readonly repo: WorkflowsRepository) {}

    async list(filters: WorkflowListQueryInput, currentRole: string | undefined, currentTenantId: number): Promise<response<WorkflowPublic[]>> {
        const hasValidQueryTenant = typeof filters.tenant_id === 'number' && Number.isFinite(filters.tenant_id)
        const resolvedTenantId = currentRole === 'super_admin' ? (hasValidQueryTenant ? filters.tenant_id! : undefined) : currentTenantId
        
        const queryFilters: WorkflowListQueryInput = {
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

    async create(payload: WorkflowCreateInput, tenantId: number): Promise<response<WorkflowPublic | null>> {
        const created = await this.repo.create({ ...payload, tenant_id: tenantId })
        return { data: created ?? null, message: 'Workflow created', status: 201 }
    }

    async get(id: number, tenantId: number): Promise<response<WorkflowPublic | null>> {
        const found = await this.repo.get(id, tenantId)
        if (!found) return { data: null, message: 'Not found', status: 404 }
        return { data: found, message: 'OK', status: 200 }
    }

    async update(id: number, payload: WorkflowUpdateInput, tenantId: number): Promise<response<WorkflowPublic | null>> {
        const updated = await this.repo.update(id, payload, tenantId)
        if (!updated) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: updated, message: 'Updated', status: 200 }
    }

    async delete(id: number, tenantId: number): Promise<response<{ id: number } | null>> {
        const ok = await this.repo.delete(id, tenantId)
        if (!ok) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: { id }, message: 'Deleted', status: 200 }
    }

    async assignToUser(workflowId: number, userId: number, tenantId: number, actorId: number): Promise<response<{ user_id: number; workflow_id: number } | null>> {
        const allowed = await this.repo.ensureSameTenantForUserAndWorkflow(userId, workflowId, tenantId)
        if (!allowed) return { data: null, message: 'Forbidden: tenants mismatch', status: 403 }
        await this.repo.setUserWorkflow(userId, workflowId)
        return { data: { user_id: userId, workflow_id: workflowId }, message: 'Assigned', status: 200 }
    }

    async unassignFromUser(workflowId: number, userId: number, tenantId: number, actorId: number): Promise<response<{ user_id: number; workflow_id: null } | null>> {
        const allowed = await this.repo.ensureSameTenantForUserAndWorkflow(userId, workflowId, tenantId)
        if (!allowed) return { data: null, message: 'Forbidden: tenants mismatch', status: 403 }
        await this.repo.setUserWorkflow(userId, null)
        return { data: { user_id: userId, workflow_id: null }, message: 'Unassigned', status: 200 }
    }

    async listTesters(workflowId: number, tenantId: number): Promise<response<any[]>> {
        const rows = await this.repo.listTesters(workflowId, tenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async getByTesterId(testerId: number, tenantId: number): Promise<response<WorkflowPublic | null>> {
        const workflow = await this.repo.getByTesterId(testerId, tenantId)
        if (!workflow) return { data: null, message: 'No workflow assigned to this tester', status: 404 }
        return { data: workflow, message: 'OK', status: 200 }
    }
}


