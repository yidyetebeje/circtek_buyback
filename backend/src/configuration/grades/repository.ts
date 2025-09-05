import { and, eq } from 'drizzle-orm'
import { db } from '../../db'
import { grades } from '../../db/circtek.schema'
import type { GradeCreateInput, GradePublic, GradeUpdateInput } from './types'

const gradeSelection = {
    id: grades.id,
    name: grades.name,
    color: grades.color,
    description: grades.description,
    status: grades.status,
    tenant_id: grades.tenant_id,
    created_at: grades.created_at,
}

export class GradesRepository {
    constructor(private readonly database: typeof db) {}

    async list(tenantId?: number | null): Promise<GradePublic[]> {
        if (tenantId == null) {
            const rows = await this.database.select(gradeSelection).from(grades)
            return rows as any
        }
        const rows = await this.database.select(gradeSelection).from(grades).where(eq(grades.tenant_id, tenantId))
        return rows as any
    }

    async create(payload: GradeCreateInput & { tenant_id: number }): Promise<GradePublic | undefined> {
        await this.database.insert(grades).values(payload as any)
        const [created] = await this.database
            .select(gradeSelection)
            .from(grades)
            .where(and(eq(grades.name, payload.name), eq(grades.tenant_id, payload.tenant_id)) as any)
        return created as any
    }

    async get(id: number, tenantId: number): Promise<GradePublic | undefined> {
        const [row] = await this.database.select(gradeSelection).from(grades).where(and(eq(grades.id, id), eq(grades.tenant_id, tenantId)) as any)
        return row as any
    }

    async update(id: number, payload: GradeUpdateInput, tenantId: number): Promise<GradePublic | undefined> {
        const { tenant_id, ...body } = payload as any
        await this.database.update(grades).set(body as any).where(and(eq(grades.id, id), eq(grades.tenant_id, tenantId)) as any)
        return this.get(id, tenantId)
    }

    async delete(id: number, tenantId: number): Promise<boolean> {
        const [existing] = await this.database.select({ id: grades.id }).from(grades).where(and(eq(grades.id, id), eq(grades.tenant_id, tenantId)) as any)
        if (!existing) return false
        await this.database.delete(grades).where(eq(grades.id, id))
        return true
    }
}


