import { and, count, eq, like, or, SQL, desc, asc, sql } from "drizzle-orm";
import { sku_specs } from "../../db/circtek.schema";
import { SkuSpecsCreateInput, SkuSpecsQueryInput, SkuSpecsUpdateInput, SkuSpecsRecord, SkuSpecsListResult } from "./types";
import { db } from "../../db/index";

const skuSpecsSelection = {
  id: sku_specs.id,
  sku: sku_specs.sku,
  make: sku_specs.make,
  model_no: sku_specs.model_no,
  model_name: sku_specs.model_name,
  is_part: sku_specs.is_part,
  storage: sku_specs.storage,
  memory: sku_specs.memory,
  color: sku_specs.color,
  device_type: sku_specs.device_type,
  status: sku_specs.status,
  tenant_id: sku_specs.tenant_id,
  created_at: sku_specs.created_at,
  updated_at: sku_specs.updated_at,
};

export class SkuSpecsRepository {
  constructor(private readonly database: typeof db) {}

  async createSkuSpecs(skuSpecsData: SkuSpecsCreateInput & { tenant_id: number }): Promise<SkuSpecsRecord | undefined> {
    try {
      // Explicitly set nullable columns to null when omitted to avoid MySQL DEFAULT keyword errors
      const insertData: typeof sku_specs.$inferInsert = {
        sku: skuSpecsData.sku,
        tenant_id: skuSpecsData.tenant_id,
        make: skuSpecsData.make ?? null,
        model_no: skuSpecsData.model_no ?? null,
        model_name: skuSpecsData.model_name ?? null,
        is_part: skuSpecsData.is_part ?? false,
        storage: skuSpecsData.storage ?? null,
        memory: skuSpecsData.memory ?? null,
        color: skuSpecsData.color ?? null,
        device_type: (skuSpecsData.device_type as any) ?? null,
      };

      // Preserve DB default for status when it's not provided
      if (skuSpecsData.status !== undefined) {
        insertData.status = skuSpecsData.status;
      }

      await this.database.insert(sku_specs).values(insertData);

      const [created] = await this.database
        .select(skuSpecsSelection)
        .from(sku_specs)
        .where(and(
          eq(sku_specs.sku, skuSpecsData.sku),
          eq(sku_specs.tenant_id, skuSpecsData.tenant_id)
        ));
      return created;
    } catch (error) {
      throw error;
    }
  }

  async findById(id: number, tenant_id?: number): Promise<SkuSpecsRecord | undefined> {
    const conditions = [eq(sku_specs.id, id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(sku_specs.tenant_id, tenant_id));
    }

    const [result] = await this.database
      .select(skuSpecsSelection)
      .from(sku_specs)
      .where(and(...conditions));
    return result;
  }

  async findBySku(sku: string, tenant_id: number): Promise<SkuSpecsRecord | undefined> {
    const [result] = await this.database
      .select(skuSpecsSelection)
      .from(sku_specs)
      .where(and(
        eq(sku_specs.sku, sku),
        eq(sku_specs.tenant_id, tenant_id)
      ));
    return result;
  }

  async findAll(filters: SkuSpecsQueryInput & { tenant_id?: number }): Promise<SkuSpecsListResult> {
    const conditions: any[] = [];
    
    if (typeof filters.tenant_id === 'number') {
      conditions.push(eq(sku_specs.tenant_id, filters.tenant_id));
    }
    if (filters.sku) {
      conditions.push(eq(sku_specs.sku, filters.sku));
    }
    if (filters.make) {
      conditions.push(like(sku_specs.make, `%${filters.make}%`));
    }
    if (filters.model_no) {
      conditions.push(like(sku_specs.model_no, `%${filters.model_no}%`));
    }
    if (filters.model_name) {
      conditions.push(like(sku_specs.model_name, `%${filters.model_name}%`));
    }
    if (filters.device_type) {
      conditions.push(eq(sku_specs.device_type, filters.device_type as any));
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(sku_specs.sku, pattern),
          like(sku_specs.make, pattern),
          like(sku_specs.model_no, pattern),
          like(sku_specs.model_name, pattern),
          like(sku_specs.color, pattern)
        )
      );
    }

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, Math.min(100, filters.limit ?? 10));
    const offset = (page - 1) * limit;

    // Determine sorting
    const sortColumn = this.getSortColumn(filters.sort_by);
    const sortDirection = filters.sort_dir === 'desc' ? desc : asc;

    // Get total count
    let totalRow: { total: number } | undefined;
    if (conditions.length) {
      const finalCondition = and(...conditions as any);
      [totalRow] = await this.database
        .select({ total: count() })
        .from(sku_specs)
        .where(finalCondition as any);
    } else {
      [totalRow] = await this.database.select({ total: count() }).from(sku_specs);
    }

    // Get paginated results
    let rows;
    if (conditions.length) {
      const finalCondition = and(...conditions as any);
      rows = await this.database
        .select(skuSpecsSelection)
        .from(sku_specs)
        .where(finalCondition as any)
        .orderBy(sortDirection(sortColumn))
        .limit(limit)
        .offset(offset);
    } else {
      rows = await this.database
        .select(skuSpecsSelection)
        .from(sku_specs)
        .orderBy(sortDirection(sortColumn))
        .limit(limit)
        .offset(offset);
    }

    return { rows, total: totalRow?.total ?? 0, page, limit };
  }

  async updateSkuSpecs(id: number, updates: SkuSpecsUpdateInput, tenant_id?: number): Promise<SkuSpecsRecord | undefined> {
   
    const conditions = [eq(sku_specs.id, id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(sku_specs.tenant_id, tenant_id));
    }

    await this.database
      .update(sku_specs)
      .set({ ...updates, updated_at: new Date() })
      .where(and(...conditions));
    
    return this.findById(id, tenant_id);
  }

  async deleteSkuSpecs(id: number, tenant_id?: number): Promise<{ id: number }> {
    const conditions = [eq(sku_specs.id, id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(sku_specs.tenant_id, tenant_id));
    }

    await this.database.delete(sku_specs).where(and(...conditions));
    return { id };
  }

  async searchForAutocomplete(query: string, tenant_id: number, limit: number = 10): Promise<Array<{ sku: string; model_name: string | null; is_part: boolean | null }>> {
    const pattern = `%${query}%`;
    const conditions = [
      eq(sku_specs.tenant_id, tenant_id),
      eq(sku_specs.status, true), // Only active specs
      or(
        like(sku_specs.sku, pattern),
        like(sku_specs.model_name, pattern)
      )
    ];

    const results = await this.database
      .select({
        sku: sku_specs.sku,
        model_name: sku_specs.model_name,
        is_part: sku_specs.is_part
      })
      .from(sku_specs)
      .where(and(...conditions))
      .limit(limit)
      .orderBy(sku_specs.model_name);

    return results;
  }

  private getSortColumn(sortBy?: string): any {
    switch (sortBy) {
      case 'sku':
        return sku_specs.sku;
      case 'make':
        return sku_specs.make;
      case 'model_no':
        return sku_specs.model_no;
      case 'model_name':
        return sku_specs.model_name;
      case 'device_type':
        return sku_specs.device_type;
      case 'storage':
        return sku_specs.storage;
      case 'memory':
        return sku_specs.memory;
      case 'color':
        return sku_specs.color;
      case 'created_at':
      default:
        return sku_specs.created_at;
    }
  }
}
