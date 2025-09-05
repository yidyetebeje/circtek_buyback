import type { response } from '../types/response'
import { ConfigurationRepository } from './repository'

import type { LabelTemplateCreateInput, LabelTemplatePublic, LabelTemplateUpdateInput, WiFiProfileCreateInput, WiFiProfilePublic, WiFiProfileUpdateInput, WorkflowCreateInput, WorkflowPublic, WorkflowUpdateInput } from './types'

export class ConfigurationController {
    constructor(private readonly repo: ConfigurationRepository) {}

    // Label Templates
    async listLabelTemplates(queryTenantId: number | null | undefined, currentRole: string | undefined, currentTenantId: number): Promise<response<LabelTemplatePublic[]>> {
        const hasValidQueryTenant = typeof queryTenantId === 'number' && Number.isFinite(queryTenantId)
        const resolvedTenantId = currentRole === 'super_admin' ? (hasValidQueryTenant ? queryTenantId! : null) : currentTenantId
        const rows = await this.repo.listLabelTemplates(resolvedTenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async createLabelTemplate(payload: LabelTemplateCreateInput, tenantId: number): Promise<response<LabelTemplatePublic | null>> {
        const created = await this.repo.createLabelTemplate({ ...payload, tenant_id: tenantId })
        return { data: created ?? null, message: 'Label template created', status: 201 }
    }

    async getLabelTemplate(id: number, tenantId: number): Promise<response<LabelTemplatePublic | null>> {
        const found = await this.repo.getLabelTemplate(id, tenantId)
        if (!found) return { data: null, message: 'Not found', status: 404 }
        return { data: found, message: 'OK', status: 200 }
    }

    async updateLabelTemplate(id: number, payload: LabelTemplateUpdateInput, tenantId: number): Promise<response<LabelTemplatePublic | null>> {
        const updated = await this.repo.updateLabelTemplate(id, payload, tenantId)
        if (!updated) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: updated, message: 'Updated', status: 200 }
    }

    async deleteLabelTemplate(id: number, tenantId: number): Promise<response<{ id: number } | null>> {
        const ok = await this.repo.deleteLabelTemplate(id, tenantId)
        if (!ok) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: { id }, message: 'Deleted', status: 200 }
    }

    // Workflows
    async listWorkflows(queryTenantId: number | null | undefined, currentRole: string | undefined, currentTenantId: number): Promise<response<WorkflowPublic[]>> {
        const hasValidQueryTenant = typeof queryTenantId === 'number' && Number.isFinite(queryTenantId)
        const resolvedTenantId = currentRole === 'super_admin' ? (hasValidQueryTenant ? queryTenantId! : null) : currentTenantId
        const rows = await this.repo.listWorkflows(resolvedTenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async createWorkflow(payload: WorkflowCreateInput, tenantId: number): Promise<response<WorkflowPublic | null>> {
        const created = await this.repo.createWorkflow({ ...payload, tenant_id: tenantId })
        return { data: created ?? null, message: 'Workflow created', status: 201 }
    }

    async getWorkflow(id: number, tenantId: number): Promise<response<WorkflowPublic | null>> {
        const found = await this.repo.getWorkflow(id, tenantId)
        if (!found) return { data: null, message: 'Not found', status: 404 }
        return { data: found, message: 'OK', status: 200 }
    }

    async updateWorkflow(id: number, payload: WorkflowUpdateInput, tenantId: number): Promise<response<WorkflowPublic | null>> {
        const updated = await this.repo.updateWorkflow(id, payload, tenantId)
        if (!updated) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: updated, message: 'Updated', status: 200 }
    }

    async deleteWorkflow(id: number, tenantId: number): Promise<response<{ id: number } | null>> {
        const ok = await this.repo.deleteWorkflow(id, tenantId)
        if (!ok) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: { id }, message: 'Deleted', status: 200 }
    }

    // Assignments
    async assignWorkflowToUser(workflowId: number, userId: number, tenantId: number, actorId: number): Promise<response<{ user_id: number; workflow_id: number } | null>> {
        const allowed = await this.repo.ensureSameTenantForUserAndWorkflow(userId, workflowId, tenantId)
        if (!allowed) return { data: null, message: 'Forbidden: tenants mismatch', status: 403 }
        await this.repo.setUserWorkflow(userId, workflowId)
        return { data: { user_id: userId, workflow_id: workflowId }, message: 'Assigned', status: 200 }
    }

    async unassignWorkflowFromUser(workflowId: number, userId: number, tenantId: number, actorId: number): Promise<response<{ user_id: number; workflow_id: null } | null>> {
        const allowed = await this.repo.ensureSameTenantForUserAndWorkflow(userId, workflowId, tenantId)
        if (!allowed) return { data: null, message: 'Forbidden: tenants mismatch', status: 403 }
        await this.repo.setUserWorkflow(userId, null)
        return { data: { user_id: userId, workflow_id: null }, message: 'Unassigned', status: 200 }
    }

    async assignLabelTemplateToUser(labelTemplateId: number, userId: number, tenantId: number, actorId: number): Promise<response<{ user_id: number; label_template_id: number } | null>> {
        const allowed = await this.repo.ensureSameTenantForUserAndLabel(userId, labelTemplateId, tenantId)
        if (!allowed) return { data: null, message: 'Forbidden: tenants mismatch', status: 403 }
        await this.repo.setUserLabelTemplate(userId, labelTemplateId)
        return { data: { user_id: userId, label_template_id: labelTemplateId }, message: 'Assigned', status: 200 }
    }

    async unassignLabelTemplateFromUser(labelTemplateId: number, userId: number, tenantId: number, actorId: number): Promise<response<{ user_id: number; label_template_id: null } | null>> {
        const allowed = await this.repo.ensureSameTenantForUserAndLabel(userId, labelTemplateId, tenantId)
        if (!allowed) return { data: null, message: 'Forbidden: tenants mismatch', status: 403 }
        await this.repo.setUserLabelTemplate(userId, null)
        return { data: { user_id: userId, label_template_id: null }, message: 'Unassigned', status: 200 }
    }

    // List assigned testers
    async listWorkflowTesters(workflowId: number, tenantId: number): Promise<response<any[]>> {
        const rows = await this.repo.listWorkflowTesters(workflowId, tenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async listLabelTemplateTesters(labelTemplateId: number, tenantId: number): Promise<response<any[]>> {
        const rows = await this.repo.listLabelTemplateTesters(labelTemplateId, tenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    // WiFi Profiles
    async listWiFiProfiles(queryTenantId: number | null | undefined, currentRole: string | undefined, currentTenantId: number): Promise<response<WiFiProfilePublic[]>> {
        const hasValidQueryTenant = typeof queryTenantId === 'number' && Number.isFinite(queryTenantId)
        const resolvedTenantId = currentRole === 'super_admin' ? (hasValidQueryTenant ? queryTenantId! : null) : currentTenantId
        const rows = await this.repo.listWiFiProfiles(resolvedTenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async createWiFiProfile(payload: WiFiProfileCreateInput, tenantId: number): Promise<response<WiFiProfilePublic | null>> {
        const created = await this.repo.createWiFiProfile({ ...payload, tenant_id: tenantId })
        return { data: created ?? null, message: 'WiFi Profile created', status: 201 }
    }

    async getWiFiProfile(id: number, tenantId: number): Promise<response<WiFiProfilePublic | null>> {
        const found = await this.repo.getWiFiProfile(id, tenantId)
        if (!found) return { data: null, message: 'Not found', status: 404 }
        return { data: found, message: 'OK', status: 200 }
    }

    async updateWiFiProfile(id: number, payload: WiFiProfileUpdateInput, tenantId: number): Promise<response<WiFiProfilePublic | null>> {
        const updated = await this.repo.updateWiFiProfile(id, payload, tenantId)
        if (!updated) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: updated, message: 'Updated', status: 200 }
    }

    async deleteWiFiProfile(id: number, tenantId: number): Promise<response<{ id: number } | null>> {
        const ok = await this.repo.deleteWiFiProfile(id, tenantId)
        if (!ok) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: { id }, message: 'Deleted', status: 200 }
    }

    // Assign/unassign WiFi profile
    async assignWiFiProfileToUser(wifiProfileId: number, userId: number, tenantId: number, actorId: number): Promise<response<{ user_id: number; wifi_profile_id: number } | null>> {
        const allowed = await this.repo.ensureSameTenantForUserAndWiFi(userId, wifiProfileId, tenantId)
        if (!allowed) return { data: null, message: 'Forbidden: tenants mismatch', status: 403 }
        await this.repo.setUserWiFiProfile(userId, wifiProfileId)
        return { data: { user_id: userId, wifi_profile_id: wifiProfileId }, message: 'Assigned', status: 200 }
    }

    async unassignWiFiProfileFromUser(wifiProfileId: number, userId: number, tenantId: number, actorId: number): Promise<response<{ user_id: number; wifi_profile_id: null } | null>> {
        const allowed = await this.repo.ensureSameTenantForUserAndWiFi(userId, wifiProfileId, tenantId)
        if (!allowed) return { data: null, message: 'Forbidden: tenants mismatch', status: 403 }
        await this.repo.setUserWiFiProfile(userId, null)
        return { data: { user_id: userId, wifi_profile_id: null }, message: 'Unassigned', status: 200 }
    }

    async listWiFiProfileTesters(wifiProfileId: number, tenantId: number): Promise<response<any[]>> {
        const rows = await this.repo.listWiFiProfileTesters(wifiProfileId, tenantId)
        return { data: rows, message: 'OK', status: 200 }
    }
}


