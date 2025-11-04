import { db } from '../../db'
import { sku_mappings } from '../../db/circtek.schema'
import { eq, and, like, sql, count } from 'drizzle-orm'
import type { SkuMappingRecord, SkuMappingQueryInput } from './types'
import { CanonicalKeyBuilder, generateUUID } from './utils'

export class SkuMappingsRepository {
  /**
   * Find all SKU mappings with optional filtering and pagination
   */
  async findAll(
    query: SkuMappingQueryInput,
    tenantId: number
  ): Promise<{
    rows: SkuMappingRecord[]
    total: number
    page: number
    limit: number
  }> {
    const { search, sku, page = 1, limit = 10 } = query
    const offset = (page - 1) * limit

    // Build where conditions
    const whereConditions = [eq(sku_mappings.tenant_id, tenantId)]

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      whereConditions.push(
        sql`(${sku_mappings.sku} LIKE ${searchTerm} OR ${sku_mappings.canonical_key} LIKE ${searchTerm})`
      )
    }

    if (sku && sku.trim()) {
      whereConditions.push(like(sku_mappings.sku, `%${sku.trim()}%`))
    }

    // Get total count
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(sku_mappings)
      .where(and(...whereConditions))

    // Get paginated results
    const rows = await db
      .select()
      .from(sku_mappings)
      .where(and(...whereConditions))
      .orderBy(sql`${sku_mappings.created_at} DESC`)
      .limit(limit)
      .offset(offset)

    return {
      rows: rows.map(row => ({
        ...row,
        conditions: row.conditions as Record<string, string>
      })),
      total: Number(total),
      page,
      limit
    }
  }

  /**
   * Find SKU mapping by ID
   */
  async findById(id: string, tenantId: number): Promise<SkuMappingRecord | null> {
    const [result] = await db
      .select()
      .from(sku_mappings)
      .where(and(eq(sku_mappings.id, id), eq(sku_mappings.tenant_id, tenantId)))
      .limit(1)

    if (!result) return null

    return {
      ...result,
      conditions: result.conditions as Record<string, string>
    }
  }

  /**
   * Find SKU mapping by canonical key (for duplicate detection)
   */
  async findByCanonicalKey(canonicalKey: string, tenantId: number): Promise<SkuMappingRecord | null> {
    const [result] = await db
      .select()
      .from(sku_mappings)
      .where(and(
        eq(sku_mappings.canonical_key, canonicalKey),
        eq(sku_mappings.tenant_id, tenantId)
      ))
      .limit(1)

    if (!result) return null

    return {
      ...result,
      conditions: result.conditions as Record<string, string>
    }
  }

  /**
   * Create new SKU mapping
   */
  async create(
    data: {
      sku: string
      conditions: Record<string, string>
    },
    tenantId: number
  ): Promise<SkuMappingRecord> {
    const id = generateUUID()
    const canonicalKey = CanonicalKeyBuilder.build(data.conditions)
    const now = new Date()

    const [result] = await db
      .insert(sku_mappings)
      .values({
        id,
        sku: data.sku,
        conditions: data.conditions,
        canonical_key: canonicalKey,
        tenant_id: tenantId,
        created_at: now,
        updated_at: now
      })

    // Return the created record
    const created = await this.findById(id, tenantId)
    if (!created) {
      throw new Error('Failed to retrieve created SKU mapping')
    }

    return created
  }

  /**
   * Update existing SKU mapping
   */
  async update(
    id: string,
    data: {
      sku: string
      conditions: Record<string, string>
    },
    tenantId: number
  ): Promise<SkuMappingRecord | null> {
    const canonicalKey = CanonicalKeyBuilder.build(data.conditions)
    const now = new Date()

    const [result] = await db
      .update(sku_mappings)
      .set({
        sku: data.sku,
        conditions: data.conditions,
        canonical_key: canonicalKey,
        updated_at: now
      })
      .where(and(eq(sku_mappings.id, id), eq(sku_mappings.tenant_id, tenantId)))

    return result ? await this.findById(id, tenantId) : null
  }

  /**
   * Delete SKU mapping
   */
  async delete(id: string, tenantId: number): Promise<boolean> {
    const result = await db
      .delete(sku_mappings)
      .where(and(eq(sku_mappings.id, id), eq(sku_mappings.tenant_id, tenantId)))

    return result.length > 0
  }

  /**
   * Check if canonical key exists (excluding specific ID)
   */
  async canonicalKeyExists(
    canonicalKey: string,
    tenantId: number,
    excludeId?: string
  ): Promise<boolean> {
    const whereConditions = [
      eq(sku_mappings.canonical_key, canonicalKey),
      eq(sku_mappings.tenant_id, tenantId)
    ]

    if (excludeId) {
      whereConditions.push(sql`${sku_mappings.id} != ${excludeId}`)
    }

    const [result] = await db
      .select({ count: count() })
      .from(sku_mappings)
      .where(and(...whereConditions))

    return Number(result.count) > 0
  }
}