import { and, asc, count, desc, eq, like, SQL } from 'drizzle-orm'
import { db } from '../../db'
import { label_templates, users, tenants } from '../../db/circtek.schema'
import type { LabelTemplateCreateInput, LabelTemplateListQueryInput, LabelTemplateListResult, LabelTemplatePublic, LabelTemplateUpdateInput } from './types'

const sortableFields = {
    id: label_templates.id,
    name: label_templates.name,
    description: label_templates.description,
    status: label_templates.status,
    created_at: label_templates.created_at,
    updated_at: label_templates.updated_at,
} as const

const labelTemplateSelection = {
    id: label_templates.id,
    name: label_templates.name,
    description: label_templates.description,
    status: label_templates.status,
    canvas_state: label_templates.canvas_state,
    tenant_id: label_templates.tenant_id,
    tenant_name: tenants.name,
    created_at: label_templates.created_at,
    updated_at: label_templates.updated_at,
}

export class LabelTemplatesRepository {
    constructor(private readonly database: typeof db) {}

    async list(filters: LabelTemplateListQueryInput): Promise<LabelTemplateListResult> {
        const conditions: SQL<unknown>[] = []
        if (typeof filters.tenant_id === 'number') conditions.push(eq(label_templates.tenant_id, filters.tenant_id))

        const page = Math.max(1, filters.page ?? 1)
        const limit = Math.max(1, Math.min(100, filters.limit ?? 10))
        const offset = (page - 1) * limit

        // Handle sorting
        const sortField = filters.sort && sortableFields[filters.sort as keyof typeof sortableFields] 
            ? sortableFields[filters.sort as keyof typeof sortableFields]
            : label_templates.updated_at // default sort by updated_at
        const sortOrder = filters.order === 'desc' ? desc : asc

        const whereCond = conditions.length ? and(...conditions) : undefined
        const [totalRow] = await (whereCond
            ? this.database.select({ total: count() }).from(label_templates).where(whereCond)
            : this.database.select({ total: count() }).from(label_templates))

        const rows = await (whereCond
            ? this.database
                .select(labelTemplateSelection)
                .from(label_templates)
                .leftJoin(tenants, eq(label_templates.tenant_id, tenants.id))
                .where(whereCond)
                .orderBy(sortOrder(sortField))
                .limit(limit)
                .offset(offset)
            : this.database
                .select(labelTemplateSelection)
                .from(label_templates)
                .leftJoin(tenants, eq(label_templates.tenant_id, tenants.id))
                .orderBy(sortOrder(sortField))
                .limit(limit)
                .offset(offset))

        return { rows: rows as any, total: totalRow?.total ?? 0, page, limit }
    }

    async create(payload: LabelTemplateCreateInput & { tenant_id: number }): Promise<LabelTemplatePublic | undefined> {
        await this.database.insert(label_templates).values(payload as any)
        const [created] = await this.database
            .select(labelTemplateSelection)
            .from(label_templates)
            .leftJoin(tenants, eq(label_templates.tenant_id, tenants.id))
            .where(and(eq(label_templates.name, payload.name), eq(label_templates.tenant_id, payload.tenant_id)) as any)
        return created as any
    }

    async get(id: number, tenantId: number): Promise<LabelTemplatePublic | undefined> {
        const [row] = await this.database
            .select(labelTemplateSelection)
            .from(label_templates)
            .leftJoin(tenants, eq(label_templates.tenant_id, tenants.id))
            .where(and(eq(label_templates.id, id), eq(label_templates.tenant_id, tenantId)) as any)
        return row as any
    }

    async update(id: number, payload: LabelTemplateUpdateInput, tenantId: number): Promise<LabelTemplatePublic | undefined> {
        const { tenant_id, ...body } = payload as any
        await this.database.update(label_templates).set(body as any).where(and(eq(label_templates.id, id), eq(label_templates.tenant_id, tenantId)) as any)
        return this.get(id, tenantId)
    }

    async delete(id: number, tenantId: number): Promise<boolean> {
        const [existing] = await this.database.select({ id: label_templates.id }).from(label_templates).where(and(eq(label_templates.id, id), eq(label_templates.tenant_id, tenantId)) as any)
        if (!existing) return false
        await this.database.delete(label_templates).where(eq(label_templates.id, id))
        return true
    }

    async ensureSameTenantForUserAndLabel(userId: number, labelTemplateId: number, tenantId: number): Promise<boolean> {
        const [userRow] = await this.database.select({ tenant_id: users.tenant_id }).from(users).where(eq(users.id, userId))
        const [ltRow] = await this.database.select({ tenant_id: label_templates.tenant_id }).from(label_templates).where(eq(label_templates.id, labelTemplateId))
        return Boolean(userRow && ltRow && userRow.tenant_id === tenantId && ltRow.tenant_id === tenantId)
    }

    async setUserLabelTemplate(userId: number, labelTemplateId: number | null): Promise<void> {
        await this.database.update(users).set({ label_template_id: labelTemplateId as any }).where(eq(users.id, userId))
    }

    async listTesters(labelTemplateId: number, tenantId: number) {
        const rows = await this.database
            .select({ id: users.id, user_name: users.user_name, email: users.email })
            .from(users)
            .where(and(eq(users.label_template_id, labelTemplateId), eq(users.tenant_id, tenantId)) as any)
        return rows
    }

    async getByTesterId(testerId: number, tenantId: number): Promise<LabelTemplatePublic | null> {
        const [row] = await this.database
            .select(labelTemplateSelection)
            .from(label_templates)
            .leftJoin(tenants, eq(label_templates.tenant_id, tenants.id))
            .innerJoin(users, and(
                eq(users.label_template_id, label_templates.id),
                eq(users.id, testerId),
                eq(users.tenant_id, tenantId)
            ))
            .where(eq(label_templates.tenant_id, tenantId))
        return row as any ?? null
    }
}


