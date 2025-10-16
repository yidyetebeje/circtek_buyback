import { and, count, desc, eq, gte, lte, like, or, sql } from "drizzle-orm"
import { db } from "../../db"
import { repair_items, repairs, devices, repair_reasons, warehouses, users } from "../../db/circtek.schema"
import { purchase_items } from "../../db/circtek.schema"
import { RepairConsumeItemsInput, RepairListResult, RepairRecord, RepairWithItems, RepairCreateInput, RepairItemRecord, RepairQueryInput } from "./types"

export class RepairsRepository {
  constructor(private readonly database: typeof db) {}

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
      repairer_username: users.user_name,
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
      // Search on remarks, device_sku, device_imei, device_serial
      conditions.push(or(
        like(repairs.remarks, pattern),
        like(devices.sku, pattern),
        like(devices.imei, pattern),
        like(devices.serial, pattern)
      ))
    }

    const page = Math.max(1, filters.page ?? 1)
    const limit = Math.max(1, Math.min(100, filters.limit ?? 10))
    const offset = (page - 1) * limit

    let totalRow: { total: number } | undefined
    if (conditions.length) {
      const final = and(...conditions)
      ;[totalRow] = await this.database.select({ total: count() })
        .from(repairs)
        .leftJoin(devices, eq(repairs.device_id, devices.id))
        .where(final as any)
    } else {
      ;[totalRow] = await this.database.select({ total: count() })
        .from(repairs)
        .leftJoin(devices, eq(repairs.device_id, devices.id))
    }

    let rows
    if (conditions.length) {
      const final = and(...conditions)
      rows = await this.database.select({
        id: repairs.id,
        device_id: repairs.device_id,
        remarks: repairs.remarks,
        status: repairs.status,
        tenant_id: repairs.tenant_id,
        actor_id: repairs.actor_id,
        warehouse_id: repairs.warehouse_id,
        warehouse_name: warehouses.name,
        repairer_username: users.user_name,
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
        .where(final as any)
        .orderBy(desc(repairs.created_at))
        .limit(limit)
        .offset(offset)
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
        repairer_username: users.user_name,
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

    // Get consumed parts for each repair
    const normalizedRows = await Promise.all(
      rows.map(async (r) => {
        const normalized = this.normalizeRepair(r) as any;
        if (normalized) {
          // Get consumed parts SKUs for this repair
          const consumedParts = await this.database
            .select({ sku: repair_items.sku })
            .from(repair_items)
            .where(and(eq(repair_items.repair_id, normalized.id), eq(repair_items.tenant_id, normalized.tenant_id)));
          
          normalized.consumed_parts = consumedParts.map(p => p.sku);
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
      repairer_username: users.user_name,
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
}


