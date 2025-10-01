import { t, type Static } from 'elysia'

export const GradeCreate = t.Object({
    name: t.String({ 
        minLength: 2, 
        maxLength: 100,
        pattern: '^[a-zA-Z\\s]+$',
        error: 'Name must contain only letters and spaces, and be 2-100 characters long'
    }),
    color: t.String({ 
        pattern: '^#[0-9A-Fa-f]{6}$',
        error: 'Color must be a valid hex code (e.g., #FF5733)'
    }),
})

export const GradeUpdate = t.Object({
    name: t.Optional(t.String({ 
        minLength: 2, 
        maxLength: 100,
        pattern: '^[a-zA-Z\\s]+$',
        error: 'Name must contain only letters and spaces, and be 2-100 characters long'
    })),
    color: t.Optional(t.String({ 
        pattern: '^#[0-9A-Fa-f]{6}$',
        error: 'Color must be a valid hex code (e.g., #FF5733)'
    })),
})

export type GradeCreateInput = Static<typeof GradeCreate>
export type GradeUpdateInput = Static<typeof GradeUpdate>

export type GradePublic = {
    id: number
    name: string
    color: string
    tenant_id: number
    created_at: string | null
}


