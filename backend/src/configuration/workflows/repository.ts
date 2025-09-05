import { and, eq } from 'drizzle-orm'
import { db } from '../../db'
import { users, workflows, tenants } from '../../db/circtek.schema'
import type { WorkflowCreateInput, WorkflowPublic, WorkflowUpdateInput } from './types'

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

    async list(tenantId?: number | null): Promise<WorkflowPublic[]> {
        if (tenantId == null) {
            const rows = await this.database
                .select(workflowSelection)
                .from(workflows)
                .leftJoin(tenants, eq(workflows.tenant_id, tenants.id))
            return rows as any
        }
        const rows = await this.database
            .select(workflowSelection)
            .from(workflows)
            .leftJoin(tenants, eq(workflows.tenant_id, tenants.id))
            .where(eq(workflows.tenant_id, tenantId))
        return rows as any
    }

    async create(payload: WorkflowCreateInput & { tenant_id: number }): Promise<WorkflowPublic | undefined> {
        await this.database.insert(workflows).values(payload as any)
        const [created] = await this.database
            .select(workflowSelection)
            .from(workflows)
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

    async delete(id: number, tenantId: number): Promise<boolean> {
        const [existing] = await this.database.select({ id: workflows.id }).from(workflows).where(and(eq(workflows.id, id), eq(workflows.tenant_id, tenantId)) as any)
        if (!existing) return false
        await this.database.delete(workflows).where(eq(workflows.id, id))
        return true
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
            .select({ id: users.id, user_name: users.user_name, email: users.email })
            .from(users)
            .where(and(eq(users.workflow_id, workflowId), eq(users.tenant_id, tenantId)) as any)
        return rows
    }
}


