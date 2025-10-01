import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm'
import { db } from '../../db'
import { grades, device_grades } from '../../db/circtek.schema'
import type { GradeCreateInput, GradePublic, GradeUpdateInput } from './types'

const gradeSelection = {
    id: grades.id,
    name: grades.name,
    color: grades.color,
    tenant_id: grades.tenant_id,
    created_at: grades.created_at,
}

export class GradesRepository {
    constructor(private readonly database: typeof db) {}

    async list(
        tenantId?: number | null,
        search?: string,
        page?: number,
        limit?: number,
        sort?: string,
        order?: 'asc' | 'desc'
    ): Promise<{ data: GradePublic[]; total: number }> {
        // Build where conditions
        const conditions: any[] = []
        
        if (tenantId != null) {
            conditions.push(eq(grades.tenant_id, tenantId))
        }
        
        if (search && search.trim()) {
            conditions.push(
                or(
                    like(grades.name, `%${search.trim()}%`),
                    like(grades.color, `%${search.trim()}%`)
                )
            )
        }
        
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined
        
        // Get total count
        const countResult = await this.database
            .select({ count: sql<number>`count(*)` })
            .from(grades)
            .where(whereClause as any)
        const total = Number(countResult[0]?.count ?? 0)
        
        // Build order by
        let orderByClause: any
        if (sort === 'name') {
            orderByClause = order === 'desc' ? desc(grades.name) : asc(grades.name)
        } else {
            orderByClause = desc(grades.created_at)
        }
        
        // Build query with pagination
        const pageNum = page && page > 0 ? page : 1
        const limitNum = limit && limit > 0 ? limit : 10
        const offset = (pageNum - 1) * limitNum
        
        const rows = await this.database
            .select(gradeSelection)
            .from(grades)
            .where(whereClause as any)
            .orderBy(orderByClause)
            .limit(limitNum)
            .offset(offset)
        
        return { data: rows as any, total }
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

    async delete(id: number, tenantId: number): Promise<{ success: boolean; error?: string }> {
        const [existing] = await this.database.select({ id: grades.id }).from(grades).where(and(eq(grades.id, id), eq(grades.tenant_id, tenantId)) as any)
        if (!existing) return { success: false, error: 'Grade not found or access denied' }
        
        // Check if any devices are assigned to this grade
        const [assignedDevice] = await this.database
            .select({ id: device_grades.id })
            .from(device_grades)
            .where(eq(device_grades.grade_id, id))
            .limit(1)
        
        if (assignedDevice) {
            return { 
                success: false, 
                error: 'Cannot delete grade. It is currently assigned to one or more devices. Please remove all device assignments first.' 
            }
        }
        
        try {
            await this.database.delete(grades).where(eq(grades.id, id))
            return { success: true }
        } catch (error: any) {
            console.error('Failed to delete grade:', error)
            return { 
                success: false, 
                error: 'Failed to delete grade. It may be in use by the system.' 
            }
        }
    }
}


