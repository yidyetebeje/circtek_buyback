import { and, asc, count, desc, eq, like, SQL } from 'drizzle-orm'
import { db } from '../../db'
import { users, workflows, tenants } from '../../db/circtek.schema'
import type { WorkflowCreateInput, WorkflowListQueryInput, WorkflowListResult, WorkflowPublic, WorkflowUpdateInput } from './types'

const sortableFields = {
    id: workflows.id,
    name: workflows.name,
    description: workflows.description,
    status: workflows.status,
    is_published: workflows.is_published,
    created_at: workflows.created_at,
    updated_at: workflows.updated_at,
} as const

const workflowSelection = {
    id: workflows.id,
    name: workflows.name,
    description: workflows.description,
    status: workflows.status,
    canvas_state: workflows.canvas_state,
    position_x: workflows.position_x,
    position_y: workflows.position_y,
    scale: workflows.scale,
    viewport_position_x: workflows.viewport_position_x,
    viewport_position_y: workflows.viewport_position_y,
    viewport_scale: workflows.viewport_scale,
    grid_visible: workflows.grid_visible,
    grid_size: workflows.grid_size,
    is_published: workflows.is_published,
    tenant_id: workflows.tenant_id,
    tenant_name: tenants.name,
    created_at: workflows.created_at,
    updated_at: workflows.updated_at,
}

export class WorkflowsRepository {
    constructor(private readonly database: typeof db) {}

    async list(filters: WorkflowListQueryInput): Promise<WorkflowListResult> {
        const conditions: SQL<unknown>[] = []
        if (typeof filters.tenant_id === 'number') conditions.push(eq(workflows.tenant_id, filters.tenant_id))

        const page = Math.max(1, filters.page ?? 1)
        const limit = Math.max(1, Math.min(100, filters.limit ?? 10))
        const offset = (page - 1) * limit

        // Handle sorting
        const sortField = filters.sort && sortableFields[filters.sort as keyof typeof sortableFields] 
            ? sortableFields[filters.sort as keyof typeof sortableFields]
            : workflows.updated_at // default sort by updated_at
        const sortOrder = filters.order === 'desc' ? desc : asc

        const whereCond = conditions.length ? and(...conditions) : undefined
        const [totalRow] = await (whereCond
            ? this.database.select({ total: count() }).from(workflows).where(whereCond)
            : this.database.select({ total: count() }).from(workflows))

        const rows = await (whereCond
            ? this.database
                .select(workflowSelection)
                .from(workflows)
                .leftJoin(tenants, eq(workflows.tenant_id, tenants.id))
                .where(whereCond)
                .orderBy(sortOrder(sortField))
                .limit(limit)
                .offset(offset)
            : this.database
                .select(workflowSelection)
                .from(workflows)
                .leftJoin(tenants, eq(workflows.tenant_id, tenants.id))
                .orderBy(sortOrder(sortField))
                .limit(limit)
                .offset(offset))

        return { rows: rows as any, total: totalRow?.total ?? 0, page, limit }
    }

    async create(payload: WorkflowCreateInput & { tenant_id: number }): Promise<WorkflowPublic | undefined> {
        await this.database.insert(workflows).values(payload as any)
        const [created] = await this.database
            .select(workflowSelection)
            .from(workflows)
            .leftJoin(tenants, eq(workflows.tenant_id, tenants.id))
            .where(and(eq(workflows.name, payload.name), eq(workflows.tenant_id, payload.tenant_id)) as any)
        return created as any
    }

    async get(id: number, tenantId: number): Promise<WorkflowPublic | undefined> {
        const [row] = await this.database
            .select(workflowSelection)
            .from(workflows)
            .leftJoin(tenants, eq(workflows.tenant_id, tenants.id))
            .where(and(eq(workflows.id, id), eq(workflows.tenant_id, tenantId)) as any)
        return row as any
    }

    async update(id: number, payload: WorkflowUpdateInput, tenantId: number): Promise<WorkflowPublic | undefined> {
        const { tenant_id, ...body } = payload as any
        await this.database.update(workflows).set(body as any).where(and(eq(workflows.id, id), eq(workflows.tenant_id, tenantId)) as any)
        return this.get(id, tenantId)
    }

    async delete(id: number, tenantId: number): Promise<{ success: boolean; error?: string }> {
        const [existing] = await this.database.select({ id: workflows.id }).from(workflows).where(and(eq(workflows.id, id), eq(workflows.tenant_id, tenantId)) as any)
        if (!existing) return { success: false, error: 'Workflow not found or access denied' }
        
        // Check if any users are assigned to this workflow
        const [assignedUser] = await this.database
            .select({ id: users.id, user_name: users.user_name })
            .from(users)
            .where(eq(users.workflow_id, id))
            .limit(1)
        
        if (assignedUser) {
            return { 
                success: false, 
                error: 'Cannot delete workflow. It is currently assigned to one or more testers. Please unassign all testers first.' 
            }
        }
        
        try {
            await this.database.delete(workflows).where(eq(workflows.id, id))
            return { success: true }
        } catch (error: any) {
            console.error('Failed to delete workflow:', error)
            return { 
                success: false, 
                error: 'Failed to delete workflow. It may be in use by the system.' 
            }
        }
    }

    async ensureSameTenantForUserAndWorkflow(userId: number, workflowId: number, tenantId: number): Promise<boolean> {
        const [userRow] = await this.database.select({ tenant_id: users.tenant_id }).from(users).where(eq(users.id, userId))
        const [wfRow] = await this.database.select({ tenant_id: workflows.tenant_id }).from(workflows).where(eq(workflows.id, workflowId))
        return Boolean(userRow && wfRow && userRow.tenant_id === tenantId && wfRow.tenant_id === tenantId)
    }

    async setUserWorkflow(userId: number, workflowId: number | null): Promise<void> {
        await this.database.update(users).set({ workflow_id: workflowId as any }).where(eq(users.id, userId))
    }

    async listTesters(workflowId: number, tenantId: number) {
        const rows = await this.database
            .select({ id: users.id, user_name: users.user_name })
            .from(users)
            .where(and(eq(users.workflow_id, workflowId), eq(users.tenant_id, tenantId)) as any)
        return rows
    }

    async getByTesterId(testerId: number, tenantId: number): Promise<WorkflowPublic | null> {
        const [row] = await this.database
            .select(workflowSelection)
            .from(workflows)
            .leftJoin(tenants, eq(workflows.tenant_id, tenants.id))
            .innerJoin(users, and(
                eq(users.workflow_id, workflows.id),
                eq(users.id, testerId),
                eq(users.tenant_id, tenantId)
            ))
            .where(eq(workflows.tenant_id, tenantId))
        return row as any ?? null
    }
}


