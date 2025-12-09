import { and, count, desc, eq, gte, lte, like, or, sql } from "drizzle-orm"
import { db } from "../../db"
import { repair_items, repairs, devices, repair_reasons, warehouses, users, repair_reason_model_prices, device_events } from "../../db/circtek.schema"
import { purchase_items } from "../../db/circtek.schema"
import { RepairConsumeItemsInput, RepairListResult, RepairRecord, RepairWithItems, RepairCreateInput, RepairItemRecord, RepairQueryInput } from "./types"

export class RepairsRepository {
  constructor(private readonly database: typeof db) { }

  private normalizeRepair<T extends { status: boolean | null }>(row: T | undefined) {
    if (!row) return undefined
    return { ...row, status: !!row.status } as any
  }

  private normalizeRepairItem<T extends { cost: any; status: boolean | null }>(row: T) {
    return { ...row, cost: Number(row.cost), status: !!row.status } as any
  }

  async createRepair(data: RepairCreateInput & { tenant_id: number; actor_id: number }): Promise<RepairRecord | undefined> {
    const [result] = await this.database.insert(repairs).values(data)
    if (!result.insertId) return undefined
    return this.findById(Number(result.insertId), data.tenant_id)
  }

  async findById(id: number, tenant_id?: number): Promise<RepairRecord | undefined> {
    const conditions = [eq(repairs.id, id)] as any[]
    if (typeof tenant_id === 'number') conditions.push(eq(repairs.tenant_id, tenant_id))

    const [row] = await this.database.select({
      id: repairs.id,
      device_id: repairs.device_id,
      remarks: repairs.remarks,
      status: repairs.status,
      actor_id: repairs.actor_id,
      tenant_id: repairs.tenant_id,
      warehouse_id: repairs.warehouse_id,
      warehouse_name: warehouses.name,
      repairer_name: users.name,
      created_at: repairs.created_at,
      updated_at: repairs.updated_at,
      device_sku: devices.sku,
    })
      .from(repairs)
      .leftJoin(warehouses, eq(repairs.warehouse_id, warehouses.id))
      .leftJoin(users, eq(repairs.actor_id, users.id))
      .leftJoin(devices, eq(repairs.device_id, devices.id))
      .where(and(...conditions))

    return this.normalizeRepair(row)
  }

  async findAll(filters: RepairQueryInput & { tenant_id?: number }): Promise<RepairListResult> {
    const conditions: any[] = []
    if (typeof filters.tenant_id === 'number') conditions.push(eq(repairs.tenant_id, filters.tenant_id))
    if (typeof filters.device_id === 'number') conditions.push(eq(repairs.device_id, filters.device_id))
    if (typeof filters.status === 'boolean') conditions.push(eq(repairs.status, filters.status))
    if (filters.date_from) conditions.push(gte(repairs.created_at, new Date(filters.date_from)))
    if (filters.date_to) conditions.push(lte(repairs.created_at, new Date(filters.date_to)))
    if (filters.search) {
      const pattern = `%${filters.search}%`
      // Search on remarks, device_sku, device_imei, device_serial, repairer_name, consumed_parts, repair_reasons
      conditions.push(or(
        like(repairs.remarks, pattern),
        like(devices.sku, pattern),
        like(devices.imei, pattern),
        like(devices.serial, pattern),
        like(users.name, pattern),
        like(repair_items.sku, pattern),
        like(repair_reasons.name, pattern)
      ))
    }

    const page = Math.max(1, filters.page ?? 1)
    const limit = Math.max(1, Math.min(100, filters.limit ?? 10))
    const offset = (page - 1) * limit

    let totalRow: { total: number } | undefined
    if (conditions.length) {
      const final = and(...conditions)
        ;[totalRow] = await this.database.select({ total: sql<number>`COUNT(DISTINCT ${repairs.id})` })
          .from(repairs)
          .leftJoin(devices, eq(repairs.device_id, devices.id))
          .leftJoin(users, eq(repairs.actor_id, users.id))
          .leftJoin(repair_items, eq(repairs.id, repair_items.repair_id))
          .leftJoin(repair_reasons, eq(repair_items.reason_id, repair_reasons.id))
          .where(final as any)
    } else {
      ;[totalRow] = await this.database.select({ total: count() })
        .from(repairs)
        .leftJoin(devices, eq(repairs.device_id, devices.id))
    }

    let rows: any[];
    if (conditions.length) {
      const final = and(...conditions)
      // Use subquery to get distinct repair IDs first, then join for full data
      const distinctRepairIds = await this.database
        .selectDistinct({
          id: repairs.id,
          created_at: repairs.created_at
        })
        .from(repairs)
        .leftJoin(devices, eq(repairs.device_id, devices.id))
        .leftJoin(warehouses, eq(repairs.warehouse_id, warehouses.id))
        .leftJoin(users, eq(repairs.actor_id, users.id))
        .leftJoin(repair_items, eq(repairs.id, repair_items.repair_id))
        .leftJoin(repair_reasons, eq(repair_items.reason_id, repair_reasons.id))
        .where(final as any)
        .orderBy(desc(repairs.created_at))
        .limit(limit)
        .offset(offset)

      // Get full data for the distinct IDs
      if (distinctRepairIds.length === 0) {
        rows = []
      } else {
        const repairIds = distinctRepairIds.map(r => r.id)
        rows = await this.database.select({
          id: repairs.id,
          device_id: repairs.device_id,
          remarks: repairs.remarks,
          status: repairs.status,
          tenant_id: repairs.tenant_id,
          actor_id: repairs.actor_id,
          warehouse_id: repairs.warehouse_id,
          warehouse_name: warehouses.name,
          repairer_name: users.name,
          created_at: repairs.created_at,
          updated_at: repairs.updated_at,
          device_sku: devices.sku,
          device_imei: devices.imei,
          device_serial: devices.serial
        })
          .from(repairs)
          .leftJoin(devices, eq(repairs.device_id, devices.id))
          .leftJoin(warehouses, eq(repairs.warehouse_id, warehouses.id))
          .leftJoin(users, eq(repairs.actor_id, users.id))
          .where(sql`${repairs.id} IN (${sql.join(repairIds.map(id => sql`${id}`), sql`, `)})`)
          .orderBy(desc(repairs.created_at))
      }
    } else {
      rows = await this.database.select({
        id: repairs.id,
        device_id: repairs.device_id,
        remarks: repairs.remarks,
        status: repairs.status,
        tenant_id: repairs.tenant_id,
        actor_id: repairs.actor_id,
        warehouse_id: repairs.warehouse_id,
        warehouse_name: warehouses.name,
        repairer_name: users.name,
        created_at: repairs.created_at,
        updated_at: repairs.updated_at,
        device_sku: devices.sku,
        device_imei: devices.imei,
        device_serial: devices.serial
      })
        .from(repairs)
        .leftJoin(devices, eq(repairs.device_id, devices.id))
        .leftJoin(warehouses, eq(repairs.warehouse_id, warehouses.id))
        .leftJoin(users, eq(repairs.actor_id, users.id))
        .orderBy(desc(repairs.created_at))
        .limit(limit)
        .offset(offset)
    }

    // Get consumed parts and reasons for each repair
    const normalizedRows = await Promise.all(
      rows.map(async (r) => {
        const normalized = this.normalizeRepair(r) as any;
        if (normalized) {
          // Get consumed items with parts and reasons for this repair
          const consumedItems = await this.database
            .select({
              sku: repair_items.sku,
              reason_name: repair_reasons.name
            })
            .from(repair_items)
            .leftJoin(repair_reasons, eq(repair_items.reason_id, repair_reasons.id))
            .where(and(eq(repair_items.repair_id, normalized.id), eq(repair_items.tenant_id, normalized.tenant_id)));

          // Return consumed items as array of objects with part_sku and reason
          normalized.consumed_items = consumedItems.map(item => ({
            part_sku: item.sku,
            reason: item.reason_name || null
          }));
        }
        return normalized;
      })
    );

    return { rows: normalizedRows.filter(Boolean) as RepairRecord[], total: totalRow?.total ?? 0, page, limit }
  }

  async getRepairWithItems(id: number, tenant_id?: number): Promise<RepairWithItems | undefined> {
    // Get repair with joined data
    const conditions = [eq(repairs.id, id)] as any[]
    if (typeof tenant_id === 'number') conditions.push(eq(repairs.tenant_id, tenant_id))

    const [repairRow] = await this.database.select({
      id: repairs.id,
      device_id: repairs.device_id,
      remarks: repairs.remarks,
      status: repairs.status,
      tenant_id: repairs.tenant_id,
      actor_id: repairs.actor_id,
      warehouse_id: repairs.warehouse_id,
      warehouse_name: warehouses.name,
      repairer_name: users.name,
      created_at: repairs.created_at,
      updated_at: repairs.updated_at,
      device_sku: devices.sku,
      device_imei: devices.imei,
      device_serial: devices.serial
    })
      .from(repairs)
      .leftJoin(devices, eq(repairs.device_id, devices.id))
      .leftJoin(warehouses, eq(repairs.warehouse_id, warehouses.id))
      .leftJoin(users, eq(repairs.actor_id, users.id))
      .where(and(...conditions))

    if (!repairRow) return undefined
    const repair = this.normalizeRepair(repairRow) as any

    const itemConditions = [eq(repair_items.repair_id, id), eq(repair_items.tenant_id, repair.tenant_id)]
    const rows = await this.database.select({
      id: repair_items.id,
      repair_id: repair_items.repair_id,
      sku: repair_items.sku,
      quantity: repair_items.quantity,
      cost: repair_items.cost,
      reason_id: repair_items.reason_id,
      reason_name: repair_reasons.name,
      purchase_items_id: repair_items.purchase_items_id,
      status: repair_items.status,
      tenant_id: repair_items.tenant_id,
      created_at: repair_items.created_at,
      updated_at: repair_items.updated_at,
    })
      .from(repair_items)
      .leftJoin(repair_reasons, eq(repair_items.reason_id, repair_reasons.id))
      .where(and(...itemConditions))
    const items: RepairItemRecord[] = rows.map(r => this.normalizeRepairItem(r))

    const total_items = items.length
    const total_quantity = items.reduce((s, i) => s + i.quantity, 0)
    const total_cost = items.reduce((s, i) => s + Number(i.cost), 0)

    return { repair, items, total_items, total_quantity, total_cost }
  }

  async addRepairItems(repair_id: number, items: Array<Omit<RepairItemRecord, 'id' | 'created_at' | 'updated_at'>>, tenant_id: number): Promise<RepairItemRecord[]> {
    if (!items.length) return []
    const payload = items.map(i => ({ ...i, repair_id, tenant_id, cost: i.cost.toString() as any }))
    await this.database.insert(repair_items).values(payload as any)

    const rows = await this.database.select().from(repair_items).where(and(eq(repair_items.repair_id, repair_id), eq(repair_items.tenant_id, tenant_id)))
    return rows.map(r => this.normalizeRepairItem(r))
  }

  async deleteRepairItemsByIds(ids: number[], tenant_id: number): Promise<void> {
    if (!ids.length) return
    await this.database.delete(repair_items).where(and(eq(repair_items.tenant_id, tenant_id), (sql`FIND_IN_SET(${repair_items.id}, ${ids.join(',')})` as any)))
  }

  async deleteRepairItemsByRepairId(repair_id: number, tenant_id: number): Promise<void> {
    await this.database.delete(repair_items).where(and(eq(repair_items.repair_id, repair_id), eq(repair_items.tenant_id, tenant_id)))
  }

  async deleteDeviceEventsByRepairId(repair_id: number, tenant_id: number): Promise<void> {

    // Delete both REPAIR_STARTED and REPAIR_COMPLETED events for this repair
    await this.database.delete(device_events).where(
      and(
        eq(device_events.tenant_id, tenant_id),
        or(
          and(
            eq(device_events.event_type, 'REPAIR_STARTED'),
            sql`JSON_EXTRACT(${device_events.details}, '$.repair_id') = ${repair_id}`
          ),
          and(
            eq(device_events.event_type, 'REPAIR_COMPLETED'),
            sql`JSON_EXTRACT(${device_events.details}, '$.repair_id') = ${repair_id}`
          )
        )
      )
    )
  }

  async deleteRepair(id: number, tenant_id: number): Promise<void> {
    await this.database.delete(repairs).where(and(eq(repairs.id, id), eq(repairs.tenant_id, tenant_id)))
  }

  async getRepairReasonById(id: number, tenant_id: number): Promise<{ id: number; name: string; fixed_price: string | null } | undefined> {
    const [row] = await this.database
      .select({
        id: repair_reasons.id,
        name: repair_reasons.name,
        fixed_price: repair_reasons.fixed_price,
      })
      .from(repair_reasons)
      .where(and(eq(repair_reasons.id, id), eq(repair_reasons.tenant_id, tenant_id)))

    return row
  }

  async getRepairReasonPrice(reason_id: number, model_name: string, tenant_id: number): Promise<{ fixed_price: string | null; is_model_specific: boolean } | undefined> {
    // First, try to get model-specific price
    const [modelPrice] = await this.database
      .select({
        fixed_price: repair_reason_model_prices.fixed_price,
      })
      .from(repair_reason_model_prices)
      .where(and(
        eq(repair_reason_model_prices.repair_reason_id, reason_id),
        eq(repair_reason_model_prices.model_name, model_name),
        eq(repair_reason_model_prices.tenant_id, tenant_id),
        eq(repair_reason_model_prices.status, true)
      ))

    if (modelPrice?.fixed_price) {
      return { fixed_price: modelPrice.fixed_price, is_model_specific: true }
    }

    // If no model-specific price, fall back to default price
    const reason = await this.getRepairReasonById(reason_id, tenant_id)
    if (reason) {
      return { fixed_price: reason.fixed_price, is_model_specific: false }
    }

    return undefined
  }

  async getDeviceById(device_id: number, tenant_id: number): Promise<{ id: number; model_name: string | null; sku: string | null } | undefined> {
    const [row] = await this.database
      .select({
        id: devices.id,
        model_name: devices.model_name,
        sku: devices.sku,
      })
      .from(devices)
      .where(and(eq(devices.id, device_id), eq(devices.tenant_id, tenant_id)))

    return row
  }

  // Analytics methods
  async getWarehouseAnalytics(filters: { tenant_id: number; date_from?: string; date_to?: string; warehouse_id?: number; model_name?: string; reason_id?: number }) {
    const conditions: any[] = [eq(repairs.tenant_id, filters.tenant_id)]

    if (filters.date_from) conditions.push(gte(repairs.created_at, new Date(filters.date_from)))
    if (filters.date_to) conditions.push(lte(repairs.created_at, new Date(filters.date_to)))
    if (filters.warehouse_id) conditions.push(eq(repairs.warehouse_id, filters.warehouse_id))
    if (filters.model_name) conditions.push(eq(devices.model_name, filters.model_name))
    if (filters.reason_id) conditions.push(eq(repair_items.reason_id, filters.reason_id))

    const results = await this.database
      .select({
        warehouse_id: warehouses.id,
        warehouse_name: warehouses.name,
        total_repairs: sql<number>`COUNT(DISTINCT ${repairs.id})`,
        unique_devices: sql<number>`COUNT(DISTINCT ${repairs.device_id})`,
        total_parts_used: sql<number>`COUNT(${repair_items.id})`,
        total_quantity_consumed: sql<number>`COALESCE(SUM(${repair_items.quantity}), 0)`,
        total_cost: sql<string>`COALESCE(SUM(${repair_items.cost} * ${repair_items.quantity}), 0)`,
      })
      .from(repairs)
      .leftJoin(repair_items, eq(repairs.id, repair_items.repair_id))
      .leftJoin(warehouses, eq(repairs.warehouse_id, warehouses.id))
      .leftJoin(devices, eq(repairs.device_id, devices.id))
      .where(and(...conditions))
      .groupBy(warehouses.id, warehouses.name)
      .orderBy(desc(sql<string>`COALESCE(SUM(${repair_items.cost} * ${repair_items.quantity}), 0)`))

    return results
      .filter(r => r.warehouse_id !== null) // Filter out any null warehouse_ids
      .map(r => ({
        warehouse_id: r.warehouse_id as number,
        warehouse_name: r.warehouse_name || 'Unknown',
        total_repairs: Number(r.total_repairs),
        total_parts_used: Number(r.total_parts_used),
        total_quantity_consumed: Number(r.total_quantity_consumed),
        total_cost: Number(r.total_cost),
        average_cost_per_repair: Number(r.unique_devices) > 0 ? Number(r.total_cost) / Number(r.unique_devices) : 0,
      }))
  }

  async getModelAnalytics(filters: { tenant_id: number; date_from?: string; date_to?: string; warehouse_id?: number; model_name?: string; reason_id?: number }) {
    const conditions: any[] = [eq(repairs.tenant_id, filters.tenant_id)]

    if (filters.date_from) conditions.push(gte(repairs.created_at, new Date(filters.date_from)))
    if (filters.date_to) conditions.push(lte(repairs.created_at, new Date(filters.date_to)))
    if (filters.warehouse_id) conditions.push(eq(repairs.warehouse_id, filters.warehouse_id))
    if (filters.model_name) conditions.push(eq(devices.model_name, filters.model_name))
    if (filters.reason_id) conditions.push(eq(repair_items.reason_id, filters.reason_id))

    const results = await this.database
      .select({
        model_name: devices.model_name,
        total_repairs: sql<number>`COUNT(DISTINCT ${repairs.id})`,
        unique_devices: sql<number>`COUNT(DISTINCT ${repairs.device_id})`,
        total_parts_used: sql<number>`COUNT(${repair_items.id})`,
        total_quantity_consumed: sql<number>`COALESCE(SUM(${repair_items.quantity}), 0)`,
        total_cost: sql<string>`COALESCE(SUM(${repair_items.cost} * ${repair_items.quantity}), 0)`,
      })
      .from(repairs)
      .leftJoin(repair_items, eq(repairs.id, repair_items.repair_id))
      .leftJoin(devices, eq(repairs.device_id, devices.id))
      .where(and(...conditions))
      .groupBy(devices.model_name)
      .orderBy(desc(sql<string>`COALESCE(SUM(${repair_items.cost} * ${repair_items.quantity}), 0)`))

    // For each model, get the most common parts
    const resultsWithParts = await Promise.all(
      results.map(async (r) => {
        const partsConditions: any[] = [
          eq(repairs.tenant_id, filters.tenant_id),
          eq(devices.model_name, r.model_name || ''),
        ]

        if (filters.date_from) partsConditions.push(gte(repairs.created_at, new Date(filters.date_from)))
        if (filters.date_to) partsConditions.push(lte(repairs.created_at, new Date(filters.date_to)))
        if (filters.reason_id) partsConditions.push(eq(repair_items.reason_id, filters.reason_id))

        // Get regular parts (non-fixed_price)
        const regularParts = await this.database
          .select({
            sku: repair_items.sku,
            usage_count: sql<number>`COUNT(${repair_items.id})`,
            total_quantity: sql<number>`SUM(${repair_items.quantity})`,
            total_cost: sql<string>`SUM(${repair_items.cost} * ${repair_items.quantity})`,
          })
          .from(repairs)
          .innerJoin(repair_items, eq(repairs.id, repair_items.repair_id))
          .innerJoin(devices, eq(repairs.device_id, devices.id))
          .where(and(...partsConditions, sql`${repair_items.sku} != 'fixed_price'`))
          .groupBy(repair_items.sku)
          .orderBy(desc(sql<number>`COUNT(${repair_items.id})`))
          .limit(5)

        // Get fixed_price entries grouped by reason
        const fixedPriceParts = await this.database
          .select({
            sku: repair_reasons.name,
            usage_count: sql<number>`COUNT(${repair_items.id})`,
            total_quantity: sql<number>`SUM(${repair_items.quantity})`,
            total_cost: sql<string>`SUM(${repair_items.cost} * ${repair_items.quantity})`,
          })
          .from(repairs)
          .innerJoin(repair_items, eq(repairs.id, repair_items.repair_id))
          .innerJoin(devices, eq(repairs.device_id, devices.id))
          .leftJoin(repair_reasons, eq(repair_items.reason_id, repair_reasons.id))
          .where(and(...partsConditions, eq(repair_items.sku, 'fixed_price')))
          .groupBy(repair_reasons.id, repair_reasons.name)
          .orderBy(desc(sql<number>`COUNT(${repair_items.id})`))
          .limit(5)

        // Combine both lists and take top 5
        const allParts = [
          ...regularParts.map(p => ({
            sku: p.sku as string,
            usage_count: Number(p.usage_count),
            total_quantity: Number(p.total_quantity),
            total_cost: Number(p.total_cost),
          })),
          ...fixedPriceParts.map(p => ({
            sku: p.sku as string,
            usage_count: Number(p.usage_count),
            total_quantity: Number(p.total_quantity),
            total_cost: Number(p.total_cost),
          }))
        ]
          .filter(p => p.sku !== null)
          .sort((a, b) => b.usage_count - a.usage_count)
          .slice(0, 5)

        return {
          model_name: r.model_name || 'Unknown',
          total_repairs: Number(r.total_repairs),
          unique_devices: Number(r.unique_devices),
          total_parts_used: Number(r.total_parts_used),
          total_quantity_consumed: Number(r.total_quantity_consumed),
          total_cost: Number(r.total_cost),
          average_cost_per_repair: Number(r.unique_devices) > 0 ? Number(r.total_cost) / Number(r.unique_devices) : 0,
          most_common_parts: allParts,
        }
      })
    )

    return resultsWithParts
  }

  async getUniqueDeviceModels(tenant_id: number): Promise<string[]> {
    const results = await this.database
      .selectDistinct({
        model_name: devices.model_name,
      })
      .from(devices)
      .where(and(eq(devices.tenant_id, tenant_id), sql`${devices.model_name} IS NOT NULL AND ${devices.model_name} != ''`))
      .orderBy(devices.model_name)

    return results
      .map(r => r.model_name)
      .filter((name): name is string => name !== null && name !== '')
  }

  async getReasonAnalytics(filters: { tenant_id: number; date_from?: string; date_to?: string; warehouse_id?: number; model_name?: string; reason_id?: number }) {
    const conditions: any[] = [eq(repairs.tenant_id, filters.tenant_id)]

    if (filters.date_from) conditions.push(gte(repairs.created_at, new Date(filters.date_from)))
    if (filters.date_to) conditions.push(lte(repairs.created_at, new Date(filters.date_to)))
    if (filters.warehouse_id) conditions.push(eq(repairs.warehouse_id, filters.warehouse_id))
    if (filters.model_name) conditions.push(eq(devices.model_name, filters.model_name))
    if (filters.reason_id) conditions.push(eq(repair_items.reason_id, filters.reason_id))

    const results = await this.database
      .select({
        reason_id: repair_reasons.id,
        reason_name: repair_reasons.name,
        total_repairs: sql<number>`COUNT(DISTINCT ${repairs.id})`,
        unique_devices: sql<number>`COUNT(DISTINCT ${repairs.device_id})`,
        total_parts_used: sql<number>`COUNT(${repair_items.id})`,
        total_quantity_consumed: sql<number>`COALESCE(SUM(${repair_items.quantity}), 0)`,
        total_cost: sql<string>`COALESCE(SUM(${repair_items.cost} * ${repair_items.quantity}), 0)`,
      })
      .from(repairs)
      .innerJoin(repair_items, eq(repairs.id, repair_items.repair_id))
      .leftJoin(repair_reasons, eq(repair_items.reason_id, repair_reasons.id))
      .leftJoin(devices, eq(repairs.device_id, devices.id))
      .where(and(...conditions))
      .groupBy(repair_reasons.id, repair_reasons.name)
      .orderBy(desc(sql<string>`COALESCE(SUM(${repair_items.cost} * ${repair_items.quantity}), 0)`))

    return results.map(r => ({
      reason_id: r.reason_id,
      reason_name: r.reason_name,
      total_repairs: Number(r.total_repairs),
      total_parts_used: Number(r.total_parts_used),
      total_quantity_consumed: Number(r.total_quantity_consumed),
      total_cost: Number(r.total_cost),
      average_cost_per_repair: Number(r.unique_devices) > 0 ? Number(r.total_cost) / Number(r.unique_devices) : 0,
    }))
  }

  async getUserAnalytics(filters: { tenant_id: number; date_from?: string; date_to?: string; warehouse_id?: number; model_name?: string; reason_id?: number }) {
    const conditions: any[] = [eq(repairs.tenant_id, filters.tenant_id)]

    if (filters.date_from) conditions.push(gte(repairs.created_at, new Date(filters.date_from)))
    if (filters.date_to) conditions.push(lte(repairs.created_at, new Date(filters.date_to)))
    if (filters.warehouse_id) conditions.push(eq(repairs.warehouse_id, filters.warehouse_id))
    if (filters.model_name) conditions.push(eq(devices.model_name, filters.model_name))
    if (filters.reason_id) conditions.push(eq(repair_items.reason_id, filters.reason_id))

    const results = await this.database
      .select({
        user_id: users.id,
        user_name: users.name,
        total_repairs: sql<number>`COUNT(DISTINCT ${repairs.id})`,
        unique_devices: sql<number>`COUNT(DISTINCT ${repairs.device_id})`,
        total_parts_used: sql<number>`COUNT(${repair_items.id})`,
        total_quantity_consumed: sql<number>`COALESCE(SUM(${repair_items.quantity}), 0)`,
        total_cost: sql<string>`COALESCE(SUM(${repair_items.cost} * ${repair_items.quantity}), 0)`,
      })
      .from(repairs)
      .leftJoin(repair_items, eq(repairs.id, repair_items.repair_id))
      .leftJoin(users, eq(repairs.actor_id, users.id))
      .leftJoin(devices, eq(repairs.device_id, devices.id))
      .where(and(...conditions))
      .groupBy(users.id, users.name)
      .orderBy(desc(sql<number>`COUNT(DISTINCT ${repairs.id})`))

    return results
      .filter(r => r.user_id !== null)
      .map(r => ({
        user_id: r.user_id as number,
        user_name: r.user_name || 'Unknown',
        total_repairs: Number(r.total_repairs),
        total_parts_used: Number(r.total_parts_used),
        total_quantity_consumed: Number(r.total_quantity_consumed),
        total_cost: Number(r.total_cost),
        average_cost_per_repair: Number(r.unique_devices) > 0 ? Number(r.total_cost) / Number(r.unique_devices) : 0,
      }))
  }

  async getIMEIAnalytics(filters: { tenant_id: number; date_from?: string; date_to?: string; warehouse_id?: number; model_name?: string; reason_id?: number; search?: string; page: number; limit: number }) {
    const conditions: any[] = [eq(repairs.tenant_id, filters.tenant_id)]

    if (filters.date_from) conditions.push(gte(repairs.created_at, new Date(filters.date_from)))
    if (filters.date_to) conditions.push(lte(repairs.created_at, new Date(filters.date_to)))
    if (filters.warehouse_id) conditions.push(eq(repairs.warehouse_id, filters.warehouse_id))
    if (filters.model_name) conditions.push(eq(devices.model_name, filters.model_name))
    if (filters.reason_id) conditions.push(eq(repair_items.reason_id, filters.reason_id))
    if (filters.search) {
      conditions.push(
        or(
          like(devices.imei, `%${filters.search}%`),
          like(devices.serial, `%${filters.search}%`)
        )
      )
    }

    // Get total count
    const [countResult] = await this.database
      .select({ count: sql<number>`COUNT(DISTINCT ${repairs.device_id})` })
      .from(repairs)
      .leftJoin(repair_items, eq(repairs.id, repair_items.repair_id))
      .leftJoin(devices, eq(repairs.device_id, devices.id))
      .where(and(...conditions))

    const total = Number(countResult?.count || 0)

    // Get paginated device list with aggregated stats
    const offset = (filters.page - 1) * filters.limit
    const results = await this.database
      .select({
        device_id: devices.id,
        device_imei: devices.imei,
        device_serial: devices.serial,
        device_sku: devices.sku,
        model_name: devices.model_name,
        warehouse_name: warehouses.name,
        total_repairs: sql<number>`COUNT(DISTINCT ${repairs.id})`,
        total_parts_used: sql<number>`COUNT(${repair_items.id})`,
        total_quantity_consumed: sql<number>`COALESCE(SUM(${repair_items.quantity}), 0)`,
        total_cost: sql<string>`COALESCE(SUM(${repair_items.cost} * ${repair_items.quantity}), 0)`,
      })
      .from(repairs)
      .leftJoin(repair_items, eq(repairs.id, repair_items.repair_id))
      .innerJoin(devices, eq(repairs.device_id, devices.id))
      .leftJoin(warehouses, eq(repairs.warehouse_id, warehouses.id))
      .where(and(...conditions))
      .groupBy(devices.id, devices.imei, devices.serial, devices.sku, devices.model_name, warehouses.name)
      .orderBy(desc(sql<string>`COALESCE(SUM(${repair_items.cost} * ${repair_items.quantity}), 0)`))
      .limit(filters.limit)
      .offset(offset)

    // For each device, get parts breakdown
    const resultsWithParts = await Promise.all(
      results.map(async (r) => {
        const partsConditions: any[] = [
          eq(repairs.tenant_id, filters.tenant_id),
          eq(repairs.device_id, r.device_id),
        ]

        if (filters.date_from) partsConditions.push(gte(repairs.created_at, new Date(filters.date_from)))
        if (filters.date_to) partsConditions.push(lte(repairs.created_at, new Date(filters.date_to)))
        if (filters.reason_id) partsConditions.push(eq(repair_items.reason_id, filters.reason_id))

        // Get regular parts
        const regularParts = await this.database
          .select({
            sku: repair_items.sku,
            usage_count: sql<number>`COUNT(${repair_items.id})`,
            total_quantity: sql<number>`SUM(${repair_items.quantity})`,
            total_cost: sql<string>`SUM(${repair_items.cost} * ${repair_items.quantity})`,
          })
          .from(repairs)
          .innerJoin(repair_items, eq(repairs.id, repair_items.repair_id))
          .where(and(...partsConditions, sql`${repair_items.sku} != 'fixed_price'`))
          .groupBy(repair_items.sku)
          .orderBy(desc(sql<number>`COUNT(${repair_items.id})`))

        // Get fixed_price entries grouped by reason
        const fixedPriceParts = await this.database
          .select({
            sku: repair_reasons.name,
            usage_count: sql<number>`COUNT(${repair_items.id})`,
            total_quantity: sql<number>`SUM(${repair_items.quantity})`,
            total_cost: sql<string>`SUM(${repair_items.cost} * ${repair_items.quantity})`,
          })
          .from(repairs)
          .innerJoin(repair_items, eq(repairs.id, repair_items.repair_id))
          .leftJoin(repair_reasons, eq(repair_items.reason_id, repair_reasons.id))
          .where(and(...partsConditions, eq(repair_items.sku, 'fixed_price')))
          .groupBy(repair_reasons.id, repair_reasons.name)
          .orderBy(desc(sql<number>`COUNT(${repair_items.id})`))

        const allParts = [
          ...regularParts.map(p => ({
            sku: p.sku as string,
            usage_count: Number(p.usage_count),
            total_quantity: Number(p.total_quantity),
            total_cost: Number(p.total_cost),
          })),
          ...fixedPriceParts.map(p => ({
            sku: p.sku as string,
            usage_count: Number(p.usage_count),
            total_quantity: Number(p.total_quantity),
            total_cost: Number(p.total_cost),
          }))
        ]
          .filter(p => p.sku !== null)
          .sort((a, b) => b.usage_count - a.usage_count)

        return {
          device_id: r.device_id,
          device_imei: r.device_imei,
          device_serial: r.device_serial,
          device_sku: r.device_sku,
          model_name: r.model_name,
          warehouse_name: r.warehouse_name,
          total_repairs: Number(r.total_repairs),
          total_parts_used: Number(r.total_parts_used),
          total_quantity_consumed: Number(r.total_quantity_consumed),
          total_cost: Number(r.total_cost),
          parts_breakdown: allParts,
        }
      })
    )

    return {
      items: resultsWithParts,
      total,
      page: filters.page,
      limit: filters.limit,
    }
  }

  async getRepairAnalytics(filters: { tenant_id: number; date_from?: string; date_to?: string; warehouse_id?: number; model_name?: string; reason_id?: number }) {
    // Get summary statistics
    const conditions: any[] = [eq(repairs.tenant_id, filters.tenant_id)]

    if (filters.date_from) conditions.push(gte(repairs.created_at, new Date(filters.date_from)))
    if (filters.date_to) conditions.push(lte(repairs.created_at, new Date(filters.date_to)))
    if (filters.warehouse_id) conditions.push(eq(repairs.warehouse_id, filters.warehouse_id))
    if (filters.model_name) conditions.push(eq(devices.model_name, filters.model_name))
    if (filters.reason_id) conditions.push(eq(repair_items.reason_id, filters.reason_id))

    const [summaryResult] = await this.database
      .select({
        total_repairs: sql<number>`COUNT(DISTINCT ${repairs.id})`,
        unique_devices: sql<number>`COUNT(DISTINCT ${repairs.device_id})`,
        total_parts_used: sql<number>`COUNT(${repair_items.id})`,
        total_quantity_consumed: sql<number>`COALESCE(SUM(${repair_items.quantity}), 0)`,
        total_cost: sql<string>`COALESCE(SUM(${repair_items.cost} * ${repair_items.quantity}), 0)`,
      })
      .from(repairs)
      .leftJoin(repair_items, eq(repairs.id, repair_items.repair_id))
      .leftJoin(devices, eq(repairs.device_id, devices.id))
      .where(and(...conditions))

    const summary = {
      total_repairs: Number(summaryResult?.total_repairs || 0),
      unique_devices: Number(summaryResult?.unique_devices || 0),
      total_parts_used: Number(summaryResult?.total_parts_used || 0),
      total_quantity_consumed: Number(summaryResult?.total_quantity_consumed || 0),
      total_cost: Number(summaryResult?.total_cost || 0),
      average_cost_per_repair: Number(summaryResult?.unique_devices || 0) > 0
        ? Number(summaryResult?.total_cost || 0) / Number(summaryResult?.unique_devices || 0)
        : 0,
    }

    // Get warehouse, model, reason, and user analytics
    const [by_warehouse, by_model, by_reason, by_user] = await Promise.all([
      this.getWarehouseAnalytics(filters),
      this.getModelAnalytics(filters),
      this.getReasonAnalytics(filters),
      this.getUserAnalytics(filters),
    ])

    return {
      summary,
      by_warehouse,
      by_model,
      by_reason,
      by_user,
    }
  }

  async findAllForExport(filters: RepairQueryInput & { tenant_id?: number }): Promise<Array<RepairRecord & { device_model_name: string | null; total_cost: number }>> {
    const conditions: any[] = []
    if (typeof filters.tenant_id === 'number') conditions.push(eq(repairs.tenant_id, filters.tenant_id))
    if (typeof filters.device_id === 'number') conditions.push(eq(repairs.device_id, filters.device_id))
    if (typeof filters.status === 'boolean') conditions.push(eq(repairs.status, filters.status))
    if (filters.date_from) conditions.push(gte(repairs.created_at, new Date(filters.date_from)))
    if (filters.date_to) conditions.push(lte(repairs.created_at, new Date(filters.date_to)))
    if (filters.search) {
      const pattern = `%${filters.search}%`
      conditions.push(or(
        like(repairs.remarks, pattern),
        like(devices.sku, pattern),
        like(devices.imei, pattern),
        like(devices.serial, pattern),
        like(users.name, pattern),
        like(repair_items.sku, pattern),
        like(repair_reasons.name, pattern)
      ))
    }

    let rows: any[];
    if (conditions.length) {
      const final = and(...conditions)
      // Get distinct repair IDs first
      const distinctRepairIds = await this.database
        .selectDistinct({
          id: repairs.id,
          created_at: repairs.created_at
        })
        .from(repairs)
        .leftJoin(devices, eq(repairs.device_id, devices.id))
        .leftJoin(warehouses, eq(repairs.warehouse_id, warehouses.id))
        .leftJoin(users, eq(repairs.actor_id, users.id))
        .leftJoin(repair_items, eq(repairs.id, repair_items.repair_id))
        .leftJoin(repair_reasons, eq(repair_items.reason_id, repair_reasons.id))
        .where(final as any)
        .orderBy(desc(repairs.created_at))

      if (distinctRepairIds.length === 0) {
        rows = []
      } else {
        const repairIds = distinctRepairIds.map(r => r.id)
        rows = await this.database.select({
          id: repairs.id,
          device_id: repairs.device_id,
          remarks: repairs.remarks,
          status: repairs.status,
          tenant_id: repairs.tenant_id,
          actor_id: repairs.actor_id,
          warehouse_id: repairs.warehouse_id,
          warehouse_name: warehouses.name,
          repairer_name: users.name,
          created_at: repairs.created_at,
          updated_at: repairs.updated_at,
          device_sku: devices.sku,
          device_imei: devices.imei,
          device_serial: devices.serial,
          device_model_name: devices.model_name
        })
          .from(repairs)
          .leftJoin(devices, eq(repairs.device_id, devices.id))
          .leftJoin(warehouses, eq(repairs.warehouse_id, warehouses.id))
          .leftJoin(users, eq(repairs.actor_id, users.id))
          .where(sql`${repairs.id} IN (${sql.join(repairIds.map(id => sql`${id}`), sql`, `)})`)
          .orderBy(desc(repairs.created_at))
      }
    } else {
      rows = await this.database.select({
        id: repairs.id,
        device_id: repairs.device_id,
        remarks: repairs.remarks,
        status: repairs.status,
        tenant_id: repairs.tenant_id,
        actor_id: repairs.actor_id,
        warehouse_id: repairs.warehouse_id,
        warehouse_name: warehouses.name,
        repairer_name: users.name,
        created_at: repairs.created_at,
        updated_at: repairs.updated_at,
        device_sku: devices.sku,
        device_imei: devices.imei,
        device_serial: devices.serial,
        device_model_name: devices.model_name
      })
        .from(repairs)
        .leftJoin(devices, eq(repairs.device_id, devices.id))
        .leftJoin(warehouses, eq(repairs.warehouse_id, warehouses.id))
        .leftJoin(users, eq(repairs.actor_id, users.id))
        .orderBy(desc(repairs.created_at))
    }

    // Get consumed parts, reasons, and calculate total cost for each repair
    const normalizedRows = await Promise.all(
      rows.map(async (r) => {
        const normalized = this.normalizeRepair(r) as any;
        if (normalized) {
          // Get consumed items with parts, reasons, and costs for this repair
          // Use r.id (the original row ID) instead of normalized.id
          const consumedItems = await this.database
            .select({
              sku: repair_items.sku,
              reason_name: repair_reasons.name,
              quantity: repair_items.quantity,
              cost: repair_items.cost
            })
            .from(repair_items)
            .leftJoin(repair_reasons, eq(repair_items.reason_id, repair_reasons.id))
            .where(and(eq(repair_items.repair_id, r.id), eq(repair_items.tenant_id, r.tenant_id)));

          // Calculate total cost
          normalized.total_cost = consumedItems.reduce((sum, item) => {
            return sum + (Number(item.cost) * Number(item.quantity));
          }, 0);

          // Return consumed items as array of objects with part_sku and reason
          normalized.consumed_items = consumedItems.map(item => ({
            part_sku: item.sku,
            reason: item.reason_name || null
          }));
        }
        return normalized;
      })
    );

    return normalizedRows.filter(Boolean) as Array<RepairRecord & { device_model_name: string | null; total_cost: number }>;
  }

}
