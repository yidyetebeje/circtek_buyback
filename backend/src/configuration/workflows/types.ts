import { t, type Static } from 'elysia'

export const WorkflowCreate = t.Object({
    name: t.String(),
    description: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
    canvas_state: t.Unknown(),
    position_x: t.Optional(t.Number()),
    position_y: t.Optional(t.Number()),
    scale: t.Optional(t.Number()),
    viewport_position_x: t.Optional(t.Number()),
    viewport_position_y: t.Optional(t.Number()),
    viewport_scale: t.Optional(t.Number()),
    grid_visible: t.Optional(t.Boolean()),
    grid_size: t.Optional(t.Number()),
    is_published: t.Optional(t.Boolean()),
})

export const WorkflowUpdate = t.Object({
    name: t.Optional(t.String()),
    description: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
    canvas_state: t.Optional(t.Unknown()),
    position_x: t.Optional(t.Number()),
    position_y: t.Optional(t.Number()),
    scale: t.Optional(t.Number()),
    viewport_position_x: t.Optional(t.Number()),
    viewport_position_y: t.Optional(t.Number()),
    viewport_scale: t.Optional(t.Number()),
    grid_visible: t.Optional(t.Boolean()),
    grid_size: t.Optional(t.Number()),
    is_published: t.Optional(t.Boolean()),
})

export type WorkflowCreateInput = Static<typeof WorkflowCreate> & { tenant_id?: number }
export type WorkflowUpdateInput = Static<typeof WorkflowUpdate> & { tenant_id?: number }

export const WorkflowListQuery = t.Object({
    tenant_id: t.Optional(t.Number()),
    page: t.Optional(t.Number({ default: 1 })),
    limit: t.Optional(t.Number({ default: 10 })),
    sort: t.Optional(t.String()),
    order: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
})

export type WorkflowListQueryInput = Static<typeof WorkflowListQuery>

export type WorkflowPublic = {
    id: number
    name: string
    description: string | null
    status: boolean | null
    canvas_state: unknown
    position_x: number | null
    position_y: number | null
    scale: number | null
    viewport_position_x: number | null
    viewport_position_y: number | null
    viewport_scale: number | null
    grid_visible: boolean | null
    grid_size: number | null
    is_published: boolean | null
    tenant_id: number
    tenant_name?: string | null
    created_at: string | null
    updated_at: string | null
}

export type WorkflowListResult = {
    rows: WorkflowPublic[]
    total: number
    page: number
    limit: number
}


