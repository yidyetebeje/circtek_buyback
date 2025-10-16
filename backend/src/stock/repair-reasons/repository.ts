import { eq, and, like, desc, count } from 'drizzle-orm'
import { db } from '../../db'
import { repair_reasons } from '../../db/circtek.schema'
import { RepairReasonRecord, RepairReasonCreateInput, RepairReasonUpdateInput, RepairReasonQueryInput } from './types'

export class RepairReasonsRepository {
  async create(payload: RepairReasonCreateInput & { tenant_id: number }): Promise<RepairReasonRecord | null> {
    try {
      const [result] = await db.insert(repair_reasons).values({
        name: payload.name,
        description: payload.description || null,
        fixed_price: payload.fixed_price !== undefined && payload.fixed_price !== null ? payload.fixed_price.toString() : null,
        status: payload.status ?? true,
        tenant_id: payload.tenant_id,
      })
      
      if (result.insertId) {
        return await this.findById(Number(result.insertId))
      }
      return null
    } catch (error) {
      console.error('Error creating repair reason:', error)
      return null
    }
  }

  async findById(id: number, tenant_id?: number): Promise<RepairReasonRecord | null> {
    try {
      const conditions = [eq(repair_reasons.id, id)]
      if (typeof tenant_id === 'number') {
        conditions.push(eq(repair_reasons.tenant_id, tenant_id))
      }

      const [found] = await db.select().from(repair_reasons).where(and(...conditions))
      return found as RepairReasonRecord || null
    } catch (error) {
      console.error('Error finding repair reason by id:', error)
      return null
    }
  }

  async findAll(query: RepairReasonQueryInput): Promise<{ rows: RepairReasonRecord[]; total: number; page: number; limit: number }> {
    try {
      const { page = 1, limit = 10, search, status, tenant_id } = query
      const offset = (page - 1) * limit

      const conditions = []
      if (typeof tenant_id === 'number') {
        conditions.push(eq(repair_reasons.tenant_id, tenant_id))
      }
      if (typeof status === 'boolean') {
        conditions.push(eq(repair_reasons.status, status))
      }
      if (search) {
        conditions.push(like(repair_reasons.name, `%${search}%`))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const [rows, totalResult] = await Promise.all([
        db.select()
          .from(repair_reasons)
          .where(whereClause)
          .orderBy(desc(repair_reasons.id))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() })
          .from(repair_reasons)
          .where(whereClause)
      ])

      return {
        rows: rows as RepairReasonRecord[],
        total: totalResult[0]?.count || 0,
        page,
        limit
      }
    } catch (error) {
      console.error('Error finding repair reasons:', error)
      return { rows: [], total: 0, page: 1, limit: 10 }
    }
  }

  async update(id: number, payload: RepairReasonUpdateInput, tenant_id?: number): Promise<RepairReasonRecord | null> {
    try {
      const conditions = [eq(repair_reasons.id, id)]
      if (typeof tenant_id === 'number') {
        conditions.push(eq(repair_reasons.tenant_id, tenant_id))
      }

      const updateData: any = {}
      if (payload.name !== undefined) updateData.name = payload.name
      if (payload.description !== undefined) updateData.description = payload.description
      if (payload.fixed_price !== undefined) {
        updateData.fixed_price = payload.fixed_price !== null ? payload.fixed_price.toString() : null
      }
      if (payload.status !== undefined) updateData.status = payload.status

      const [result] = await db.update(repair_reasons)
        .set(updateData)
        .where(and(...conditions))

      if (result.affectedRows && result.affectedRows > 0) {
        return await this.findById(id, tenant_id)
      }
      return null
    } catch (error) {
      console.error('Error updating repair reason:', error)
      return null
    }
  }

  async delete(id: number, tenant_id?: number): Promise<boolean> {
    try {
      const conditions = [eq(repair_reasons.id, id)]
      if (typeof tenant_id === 'number') {
        conditions.push(eq(repair_reasons.tenant_id, tenant_id))
      }

      const [result] = await db.delete(repair_reasons).where(and(...conditions))
      return (result.affectedRows || 0) > 0
    } catch (error) {
      console.error('Error deleting repair reason:', error)
      return false
    }
  }
}

export const repairReasonsRepository = new RepairReasonsRepository()
