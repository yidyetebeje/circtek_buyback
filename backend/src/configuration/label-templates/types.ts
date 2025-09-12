import { t, type Static } from 'elysia'

export const LabelTemplateCreate = t.Object({
    name: t.String(),
    description: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
    canvas_state: t.Unknown(),
})

export const LabelTemplateUpdate = t.Object({
    name: t.Optional(t.String()),
    description: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
    canvas_state: t.Optional(t.Unknown()),
})

export type LabelTemplateCreateInput = Static<typeof LabelTemplateCreate> & { tenant_id?: number }
export type LabelTemplateUpdateInput = Static<typeof LabelTemplateUpdate> & { tenant_id?: number }

export const LabelTemplateListQuery = t.Object({
    tenant_id: t.Optional(t.Number()),
    page: t.Optional(t.Number({ default: 1 })),
    limit: t.Optional(t.Number({ default: 10 })),
    sort: t.Optional(t.String()),
    order: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
})

export type LabelTemplateListQueryInput = Static<typeof LabelTemplateListQuery>

export type LabelTemplatePublic = {
    id: number
    name: string
    description: string | null
    status: boolean | null
    canvas_state: unknown
    tenant_id: number
    tenant_name?: string | null
    created_at: string | null
    updated_at: string | null
}

export type LabelTemplateListResult = {
    rows: LabelTemplatePublic[]
    total: number
    page: number
    limit: number
}


