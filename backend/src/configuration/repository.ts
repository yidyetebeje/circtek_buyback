import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { label_templates, users, wifi_profile, workflows } from '../db/circtek.schema'
import type { LabelTemplateCreateInput, LabelTemplatePublic, LabelTemplateUpdateInput, WiFiProfileCreateInput, WiFiProfilePublic, WiFiProfileUpdateInput, WorkflowCreateInput, WorkflowPublic, WorkflowUpdateInput } from './types'

const labelTemplateSelection = {
    id: label_templates.id,
    name: label_templates.name,
    description: label_templates.description,
    status: label_templates.status,
    canvas_state: label_templates.canvas_state,
    tenant_id: label_templates.tenant_id,
    created_at: label_templates.created_at,
    updated_at: label_templates.updated_at,
}

const workflowSelection = {
    id: workflows.id,
    name: workflows.name,
    description: workflows.description,
    status: workflows.status,
    canvas_state: workflows.canvas_state,
    tenant_id: workflows.tenant_id,
    created_at: workflows.created_at,
    updated_at: workflows.updated_at,
}

const wifiProfileSelection = {
    id: wifi_profile.id,
    name: wifi_profile.name,
    ssid: wifi_profile.ssid,
    password: wifi_profile.password,
    status: wifi_profile.status,
    tenant_id: wifi_profile.tenant_id,
    created_at: wifi_profile.created_at,
    updated_at: wifi_profile.updated_at,
}

export class ConfigurationRepository {
    constructor(private readonly database: typeof db) {}

    // Label Templates
    async listLabelTemplates(tenantId?: number | null): Promise<LabelTemplatePublic[]> {
        if (tenantId == null) {
            const rows = await this.database.select(labelTemplateSelection).from(label_templates).orderBy(desc(label_templates.updated_at))
            return rows as any
        }
        const rows = await this.database.select(labelTemplateSelection).from(label_templates).where(eq(label_templates.tenant_id, tenantId)).orderBy(desc(label_templates.updated_at))
        return rows as any
    }

    async createLabelTemplate(payload: LabelTemplateCreateInput & { tenant_id: number }): Promise<LabelTemplatePublic | undefined> {
        await this.database.insert(label_templates).values(payload as any)
        const [created] = await this.database
            .select(labelTemplateSelection)
            .from(label_templates)
            .where(and(eq(label_templates.name, payload.name), eq(label_templates.tenant_id, payload.tenant_id)) as any)
        return created as any
    }

    async getLabelTemplate(id: number, tenantId: number): Promise<LabelTemplatePublic | undefined> {
        const [row] = await this.database.select(labelTemplateSelection).from(label_templates).where(and(eq(label_templates.id, id), eq(label_templates.tenant_id, tenantId)) as any)
        return row as any
    }

    async updateLabelTemplate(id: number, payload: LabelTemplateUpdateInput, tenantId: number): Promise<LabelTemplatePublic | undefined> {
        const { tenant_id, ...body } = payload as any
        await this.database.update(label_templates).set(body as any).where(and(eq(label_templates.id, id), eq(label_templates.tenant_id, tenantId)) as any)
        return this.getLabelTemplate(id, tenantId)
    }

    async deleteLabelTemplate(id: number, tenantId: number): Promise<boolean> {
        const [existing] = await this.database.select({ id: label_templates.id }).from(label_templates).where(and(eq(label_templates.id, id), eq(label_templates.tenant_id, tenantId)) as any)
        if (!existing) return false
        await this.database.delete(label_templates).where(eq(label_templates.id, id))
        return true
    }

    // Workflows
    async listWorkflows(tenantId?: number | null): Promise<WorkflowPublic[]> {
        if (tenantId == null) {
            const rows = await this.database.select(workflowSelection).from(workflows).orderBy(desc(workflows.updated_at))
            return rows as any
        }
        const rows = await this.database.select(workflowSelection).from(workflows).where(eq(workflows.tenant_id, tenantId)).orderBy(desc(workflows.updated_at))
        return rows as any
    }

    async createWorkflow(payload: WorkflowCreateInput & { tenant_id: number }): Promise<WorkflowPublic | undefined> {
        await this.database.insert(workflows).values(payload as any)
        const [created] = await this.database
            .select(workflowSelection)
            .from(workflows)
            .where(and(eq(workflows.name, payload.name), eq(workflows.tenant_id, payload.tenant_id)) as any)
        return created as any
    }

    async getWorkflow(id: number, tenantId: number): Promise<WorkflowPublic | undefined> {
        const [row] = await this.database.select(workflowSelection).from(workflows).where(and(eq(workflows.id, id), eq(workflows.tenant_id, tenantId)) as any)
        return row as any
    }

    async updateWorkflow(id: number, payload: WorkflowUpdateInput, tenantId: number): Promise<WorkflowPublic | undefined> {
        const { tenant_id, ...body } = payload as any
        await this.database.update(workflows).set(body as any).where(and(eq(workflows.id, id), eq(workflows.tenant_id, tenantId)) as any)
        return this.getWorkflow(id, tenantId)
    }

    async deleteWorkflow(id: number, tenantId: number): Promise<boolean> {
        const [existing] = await this.database.select({ id: workflows.id }).from(workflows).where(and(eq(workflows.id, id), eq(workflows.tenant_id, tenantId)) as any)
        if (!existing) return false
        await this.database.delete(workflows).where(eq(workflows.id, id))
        return true
    }

    // Assignments via users table foreign keys
    async ensureSameTenantForUserAndWorkflow(userId: number, workflowId: number, tenantId: number): Promise<boolean> {
        const [userRow] = await this.database.select({ tenant_id: users.tenant_id }).from(users).where(eq(users.id, userId))
        const [wfRow] = await this.database.select({ tenant_id: workflows.tenant_id }).from(workflows).where(eq(workflows.id, workflowId))
        return Boolean(userRow && wfRow && userRow.tenant_id === tenantId && wfRow.tenant_id === tenantId)
    }

    async setUserWorkflow(userId: number, workflowId: number | null): Promise<void> {
        await this.database.update(users).set({ workflow_id: workflowId as any }).where(eq(users.id, userId))
    }

    async ensureSameTenantForUserAndLabel(userId: number, labelTemplateId: number, tenantId: number): Promise<boolean> {
        const [userRow] = await this.database.select({ tenant_id: users.tenant_id }).from(users).where(eq(users.id, userId))
        const [ltRow] = await this.database.select({ tenant_id: label_templates.tenant_id }).from(label_templates).where(eq(label_templates.id, labelTemplateId))
        return Boolean(userRow && ltRow && userRow.tenant_id === tenantId && ltRow.tenant_id === tenantId)
    }

    async setUserLabelTemplate(userId: number, labelTemplateId: number | null): Promise<void> {
        await this.database.update(users).set({ label_template_id: labelTemplateId as any }).where(eq(users.id, userId))
    }

    async listWorkflowTesters(workflowId: number, tenantId: number) {
        const rows = await this.database
            .select({ id: users.id, user_name: users.user_name, email: users.email })
            .from(users)
            .where(and(eq(users.workflow_id, workflowId), eq(users.tenant_id, tenantId)) as any)
        return rows
    }

    async listLabelTemplateTesters(labelTemplateId: number, tenantId: number) {
        const rows = await this.database
            .select({ id: users.id, user_name: users.user_name, email: users.email })
            .from(users)
            .where(and(eq(users.label_template_id, labelTemplateId), eq(users.tenant_id, tenantId)) as any)
        return rows
    }

    // WiFi Profiles CRUD
    async listWiFiProfiles(tenantId?: number | null): Promise<WiFiProfilePublic[]> {
        if (tenantId == null) {
            const rows = await this.database.select(wifiProfileSelection).from(wifi_profile).orderBy(desc(wifi_profile.updated_at))
            return rows as any
        }
        const rows = await this.database.select(wifiProfileSelection).from(wifi_profile).where(eq(wifi_profile.tenant_id, tenantId)).orderBy(desc(wifi_profile.updated_at))
        return rows as any
    }

    async createWiFiProfile(payload: WiFiProfileCreateInput & { tenant_id: number }): Promise<WiFiProfilePublic | undefined> {
        await this.database.insert(wifi_profile).values(payload as any)
        const [created] = await this.database
            .select(wifiProfileSelection)
            .from(wifi_profile)
            .where(and(eq(wifi_profile.name, payload.name), eq(wifi_profile.tenant_id, payload.tenant_id)) as any)
        return created as any
    }

    async getWiFiProfile(id: number, tenantId: number): Promise<WiFiProfilePublic | undefined> {
        const [row] = await this.database.select(wifiProfileSelection).from(wifi_profile).where(and(eq(wifi_profile.id, id), eq(wifi_profile.tenant_id, tenantId)) as any)
        return row as any
    }

    async updateWiFiProfile(id: number, payload: WiFiProfileUpdateInput, tenantId: number): Promise<WiFiProfilePublic | undefined> {
        const { tenant_id, ...body } = payload as any
        await this.database.update(wifi_profile).set(body as any).where(and(eq(wifi_profile.id, id), eq(wifi_profile.tenant_id, tenantId)) as any)
        return this.getWiFiProfile(id, tenantId)
    }

    async deleteWiFiProfile(id: number, tenantId: number): Promise<boolean> {
        const [existing] = await this.database.select({ id: wifi_profile.id }).from(wifi_profile).where(and(eq(wifi_profile.id, id), eq(wifi_profile.tenant_id, tenantId)) as any)
        if (!existing) return false
        await this.database.delete(wifi_profile).where(eq(wifi_profile.id, id))
        return true
    }

    // WiFi profile assignments
    async ensureSameTenantForUserAndWiFi(userId: number, wifiProfileId: number, tenantId: number): Promise<boolean> {
        const [userRow] = await this.database.select({ tenant_id: users.tenant_id }).from(users).where(eq(users.id, userId))
        const [wifiRow] = await this.database.select({ tenant_id: wifi_profile.tenant_id }).from(wifi_profile).where(eq(wifi_profile.id, wifiProfileId))
        return Boolean(userRow && wifiRow && userRow.tenant_id === tenantId && wifiRow.tenant_id === tenantId)
    }

    async setUserWiFiProfile(userId: number, wifiProfileId: number | null): Promise<void> {
        await this.database.update(users).set({ wifi_profile_id: wifiProfileId as any }).where(eq(users.id, userId))
    }

    async listWiFiProfileTesters(wifiProfileId: number, tenantId: number) {
        const rows = await this.database
            .select({ id: users.id, user_name: users.user_name, email: users.email })
            .from(users)
            .where(and(eq(users.wifi_profile_id, wifiProfileId), eq(users.tenant_id, tenantId)) as any)
        return rows
    }
}


