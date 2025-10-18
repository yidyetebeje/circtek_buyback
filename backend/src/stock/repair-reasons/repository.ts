import { eq, and, like, desc, count } from 'drizzle-orm'
import { db } from '../../db'
import { repair_reasons, repair_reason_model_prices } from '../../db/circtek.schema'
import { RepairReasonRecord, RepairReasonCreateInput, RepairReasonUpdateInput, RepairReasonQueryInput, RepairReasonModelPriceRecord, RepairReasonModelPriceCreateInput, RepairReasonModelPriceUpdateInput, RepairReasonWithModelPrices } from './types'

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

  // Model-specific pricing methods
  async findByIdWithModelPrices(id: number, tenant_id?: number): Promise<RepairReasonWithModelPrices | null> {
    try {
      const reason = await this.findById(id, tenant_id)
      if (!reason) return null

      const modelPrices = await this.getModelPrices(id, tenant_id)
      return { ...reason, model_prices: modelPrices }
    } catch (error) {
      console.error('Error finding repair reason with model prices:', error)
      return null
    }
  }

  async getModelPrices(repair_reason_id: number, tenant_id?: number): Promise<RepairReasonModelPriceRecord[]> {
    try {
      const conditions = [eq(repair_reason_model_prices.repair_reason_id, repair_reason_id)]
      if (typeof tenant_id === 'number') {
        conditions.push(eq(repair_reason_model_prices.tenant_id, tenant_id))
      }

      const rows = await db.select().from(repair_reason_model_prices).where(and(...conditions))
      return rows as RepairReasonModelPriceRecord[]
    } catch (error) {
      console.error('Error getting model prices:', error)
      return []
    }
  }

  async getModelPrice(repair_reason_id: number, model_name: string, tenant_id: number): Promise<RepairReasonModelPriceRecord | null> {
    try {
      const [row] = await db.select()
        .from(repair_reason_model_prices)
        .where(and(
          eq(repair_reason_model_prices.repair_reason_id, repair_reason_id),
          eq(repair_reason_model_prices.model_name, model_name),
          eq(repair_reason_model_prices.tenant_id, tenant_id)
        ))
      return row as RepairReasonModelPriceRecord || null
    } catch (error) {
      console.error('Error getting model price:', error)
      return null
    }
  }

  async createModelPrice(payload: RepairReasonModelPriceCreateInput & { tenant_id: number }): Promise<RepairReasonModelPriceRecord | null> {
    try {
      const [result] = await db.insert(repair_reason_model_prices).values({
        repair_reason_id: payload.repair_reason_id,
        model_name: payload.model_name,
        fixed_price: payload.fixed_price.toString(),
        status: payload.status ?? true,
        tenant_id: payload.tenant_id,
      })

      if (result.insertId) {
        const [created] = await db.select()
          .from(repair_reason_model_prices)
          .where(eq(repair_reason_model_prices.id, Number(result.insertId)))
        return created as RepairReasonModelPriceRecord || null
      }
      return null
    } catch (error) {
      console.error('Error creating model price:', error)
      return null
    }
  }

  async updateModelPrice(id: number, payload: RepairReasonModelPriceUpdateInput, tenant_id?: number): Promise<RepairReasonModelPriceRecord | null> {
    try {
      const conditions = [eq(repair_reason_model_prices.id, id)]
      if (typeof tenant_id === 'number') {
        conditions.push(eq(repair_reason_model_prices.tenant_id, tenant_id))
      }

      const updateData: any = {}
      if (payload.model_name !== undefined) updateData.model_name = payload.model_name
      if (payload.fixed_price !== undefined) updateData.fixed_price = payload.fixed_price.toString()
      if (payload.status !== undefined) updateData.status = payload.status

      const [result] = await db.update(repair_reason_model_prices)
        .set(updateData)
        .where(and(...conditions))

      if (result.affectedRows && result.affectedRows > 0) {
        const [updated] = await db.select()
          .from(repair_reason_model_prices)
          .where(eq(repair_reason_model_prices.id, id))
        return updated as RepairReasonModelPriceRecord || null
      }
      return null
    } catch (error) {
      console.error('Error updating model price:', error)
      return null
    }
  }

  async deleteModelPrice(id: number, tenant_id?: number): Promise<boolean> {
    try {
      const conditions = [eq(repair_reason_model_prices.id, id)]
      if (typeof tenant_id === 'number') {
        conditions.push(eq(repair_reason_model_prices.tenant_id, tenant_id))
      }

      const [result] = await db.delete(repair_reason_model_prices).where(and(...conditions))
      return (result.affectedRows || 0) > 0
    } catch (error) {
      console.error('Error deleting model price:', error)
      return false
    }
  }
}

export const repairReasonsRepository = new RepairReasonsRepository()
