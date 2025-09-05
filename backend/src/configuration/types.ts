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

export type LabelTemplatePublic = {
    id: number
    name: string
    description: string | null
    status: boolean | null
    canvas_state: unknown
    tenant_id: number
    created_at: string | null
    updated_at: string | null
}

export const WorkflowCreate = t.Object({
    name: t.String(),
    description: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
    canvas_state: t.Unknown(),
})

export const WorkflowUpdate = t.Object({
    name: t.Optional(t.String()),
    description: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
    canvas_state: t.Optional(t.Unknown()),
})

export type WorkflowCreateInput = Static<typeof WorkflowCreate> & { tenant_id?: number }
export type WorkflowUpdateInput = Static<typeof WorkflowUpdate> & { tenant_id?: number }

export type WorkflowPublic = {
    id: number
    name: string
    description: string | null
    status: boolean | null
    canvas_state: unknown
    tenant_id: number
    created_at: string | null
    updated_at: string | null
}

// WiFi Profiles
export const WiFiProfileCreate = t.Object({
    name: t.String(),
    ssid: t.String(),
    password: t.String(),
    status: t.Optional(t.Boolean()),
})

export const WiFiProfileUpdate = t.Object({
    name: t.Optional(t.String()),
    ssid: t.Optional(t.String()),
    password: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
})

export type WiFiProfileCreateInput = Static<typeof WiFiProfileCreate> & { tenant_id?: number }
export type WiFiProfileUpdateInput = Static<typeof WiFiProfileUpdate> & { tenant_id?: number }

export type WiFiProfilePublic = {
    id: number
    name: string
    ssid: string
    password: string
    status: boolean | null
    tenant_id: number
    created_at: string | null
    updated_at: string | null
}

// (removed user shop access types per requirements)


