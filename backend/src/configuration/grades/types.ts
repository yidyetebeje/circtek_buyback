import { t, type Static } from 'elysia'

export const GradeCreate = t.Object({
    name: t.String(),
    color: t.String(),
    description: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
})

export const GradeUpdate = t.Object({
    name: t.Optional(t.String()),
    color: t.Optional(t.String()),
    description: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
})

export type GradeCreateInput = Static<typeof GradeCreate>
export type GradeUpdateInput = Static<typeof GradeUpdate>

export type GradePublic = {
    id: number
    name: string
    color: string
    description: string | null
    status: boolean | null
    tenant_id: number
    created_at: string | null
}


