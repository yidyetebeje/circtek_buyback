import { and, count, eq, like, or, SQL, gte, lte, desc, sum, sql } from "drizzle-orm";
import { stock_movements, warehouses, users, stock } from "../../db/circtek.schema";
import { MovementCreateInput, MovementQueryInput, MovementWithDetails, MovementListResult, MovementSummary, StockAuditTrail } from "./types";
import { db } from "../../db/index";

const movementWithDetailsSelection = {
  id: stock_movements.id,
  sku: stock_movements.sku,
  warehouse_id: stock_movements.warehouse_id,
  warehouse_name: warehouses.name,
  delta: stock_movements.delta,
  reason: stock_movements.reason,
  ref_type: stock_movements.ref_type,
  ref_id: stock_movements.ref_id,
  actor_id: stock_movements.actor_id,
  actor_name: users.name,
  created_at: stock_movements.created_at,
  updated_at: stock_movements.updated_at,
  status: stock_movements.status,
  tenant_id: stock_movements.tenant_id,
};

export class MovementsRepository {
  constructor(private readonly database: typeof db) {}

  async createMovement(movementData: MovementCreateInput & { tenant_id: number }): Promise<MovementWithDetails | undefined> {
    await this.database.insert(stock_movements).values(movementData);
    
    // Return the created movement with details
    const [created] = await this.database
      .select(movementWithDetailsSelection)
      .from(stock_movements)
      .leftJoin(warehouses, eq(stock_movements.warehouse_id, warehouses.id))
      .leftJoin(users, eq(stock_movements.actor_id, users.id))
      .where(and(
        eq(stock_movements.sku, movementData.sku),
        eq(stock_movements.warehouse_id, movementData.warehouse_id),
        eq(stock_movements.ref_type, movementData.ref_type),
        eq(stock_movements.ref_id, movementData.ref_id),
        eq(stock_movements.tenant_id, movementData.tenant_id)
      ))
      .orderBy(desc(stock_movements.created_at))
      .limit(1);

    return created;
  }

  async findById(id: number, tenant_id?: number): Promise<MovementWithDetails | undefined> {
    const conditions = [eq(stock_movements.id, id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(stock_movements.tenant_id, tenant_id));
    }

    const [result] = await this.database
      .select(movementWithDetailsSelection)
      .from(stock_movements)
      .leftJoin(warehouses, eq(stock_movements.warehouse_id, warehouses.id))
      .leftJoin(users, eq(stock_movements.actor_id, users.id))
      .where(and(...conditions));
    
    return result;
  }

  async findAll(filters: MovementQueryInput & { tenant_id?: number }): Promise<MovementListResult> {
    const conditions: any[] = [];
    
    if (typeof filters.tenant_id === 'number') {
      conditions.push(eq(stock_movements.tenant_id, filters.tenant_id));
    }
    if (typeof filters.warehouse_id === 'number') {
      conditions.push(eq(stock_movements.warehouse_id, filters.warehouse_id));
    }
    if (filters.sku) {
      conditions.push(eq(stock_movements.sku, filters.sku));
    }
    if (filters.reason) {
      conditions.push(eq(stock_movements.reason, filters.reason as any));
    }
    if (typeof filters.actor_id === 'number') {
      conditions.push(eq(stock_movements.actor_id, filters.actor_id));
    }
    if (filters.ref_type) {
      conditions.push(eq(stock_movements.ref_type, filters.ref_type));
    }
    if (typeof filters.ref_id === 'number') {
      conditions.push(eq(stock_movements.ref_id, filters.ref_id));
    }
    if (filters.date_from) {
      conditions.push(gte(stock_movements.created_at, new Date(filters.date_from)));
    }
    if (filters.date_to) {
      conditions.push(lte(stock_movements.created_at, new Date(filters.date_to)));
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(stock_movements.sku, pattern),
          like(stock_movements.ref_type, pattern)
        )
      );
    }

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, Math.min(100, filters.limit ?? 10));
    const offset = (page - 1) * limit;

    // Get total count
    let totalRow: { total: number } | undefined;
    if (conditions.length) {
      const finalCondition = and(...conditions as any);
      [totalRow] = await this.database
        .select({ total: count() })
        .from(stock_movements)
        .where(finalCondition as any);
    } else {
      [totalRow] = await this.database.select({ total: count() }).from(stock_movements);
    }

    // Get paginated results
    let rows;
    if (conditions.length) {
      const finalCondition = and(...conditions as any);
      rows = await this.database
        .select(movementWithDetailsSelection)
        .from(stock_movements)
        .leftJoin(warehouses, eq(stock_movements.warehouse_id, warehouses.id))
        .leftJoin(users, eq(stock_movements.actor_id, users.id))
        .where(finalCondition as any)
        .orderBy(desc(stock_movements.created_at))
        .limit(limit)
        .offset(offset);
    } else {
      rows = await this.database
        .select(movementWithDetailsSelection)
        .from(stock_movements)
        .leftJoin(warehouses, eq(stock_movements.warehouse_id, warehouses.id))
        .leftJoin(users, eq(stock_movements.actor_id, users.id))
        .orderBy(desc(stock_movements.created_at))
        .limit(limit)
        .offset(offset);
    }

    return { rows, total: totalRow?.total ?? 0, page, limit };
  }

  async getMovementSummary(filters: MovementQueryInput & { tenant_id?: number }): Promise<MovementSummary> {
    const conditions: any[] = [];
    
    if (typeof filters.tenant_id === 'number') {
      conditions.push(eq(stock_movements.tenant_id, filters.tenant_id));
    }
    if (typeof filters.warehouse_id === 'number') {
      conditions.push(eq(stock_movements.warehouse_id, filters.warehouse_id));
    }
    if (filters.date_from) {
      conditions.push(gte(stock_movements.created_at, new Date(filters.date_from)));
    }
    if (filters.date_to) {
      conditions.push(lte(stock_movements.created_at, new Date(filters.date_to)));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    // Get basic statistics
    const [basicStats] = await this.database
      .select({
        total_movements: count(),
        total_inbound: sql`SUM(CASE WHEN ${stock_movements.delta} > 0 THEN ${stock_movements.delta} ELSE 0 END)`.as('total_inbound'),
        total_outbound: sql`SUM(CASE WHEN ${stock_movements.delta} < 0 THEN ABS(${stock_movements.delta}) ELSE 0 END)`.as('total_outbound'),
        net_change: sum(stock_movements.delta),
      })
      .from(stock_movements)
      .where(whereClause as any);

    // Get breakdown by reason
    const reasonBreakdown = await this.database
      .select({
        reason: stock_movements.reason,
        count: count(),
      })
      .from(stock_movements)
      .where(whereClause as any)
      .groupBy(stock_movements.reason);

    // Get breakdown by warehouse
    const warehouseBreakdown = await this.database
      .select({
        warehouse_id: stock_movements.warehouse_id,
        warehouse_name: warehouses.name,
        count: count(),
      })
      .from(stock_movements)
      .leftJoin(warehouses, eq(stock_movements.warehouse_id, warehouses.id))
      .where(whereClause as any)
      .groupBy(stock_movements.warehouse_id, warehouses.name);

    const by_reason: Record<string, number> = {};
    reasonBreakdown.forEach(item => {
      by_reason[item.reason] = item.count;
    });

    const by_warehouse: Record<string, number> = {};
    warehouseBreakdown.forEach(item => {
      const key = item.warehouse_name || `Warehouse ${item.warehouse_id}`;
      by_warehouse[key] = item.count;
    });

    return {
      total_movements: basicStats?.total_movements ?? 0,
      total_inbound: Number(basicStats?.total_inbound) ?? 0,
      total_outbound: Number(basicStats?.total_outbound) ?? 0,
      net_change: Number(basicStats?.net_change) ?? 0,
      by_reason,
      by_warehouse,
    };
  }

  async getStockAuditTrail(sku: string, warehouse_id: number, tenant_id: number): Promise<StockAuditTrail | undefined> {
    // Get all movements for this SKU and warehouse
    const movements = await this.database
      .select(movementWithDetailsSelection)
      .from(stock_movements)
      .leftJoin(warehouses, eq(stock_movements.warehouse_id, warehouses.id))
      .leftJoin(users, eq(stock_movements.actor_id, users.id))
      .where(and(
        eq(stock_movements.sku, sku),
        eq(stock_movements.warehouse_id, warehouse_id),
        eq(stock_movements.tenant_id, tenant_id)
      ))
      .orderBy(desc(stock_movements.created_at));

    if (!movements.length) {
      return undefined;
    }

    // Get current stock level
    const [currentStock] = await this.database
      .select({ quantity: stock.quantity })
      .from(stock)
      .where(and(
        eq(stock.sku, sku),
        eq(stock.warehouse_id, warehouse_id),
        eq(stock.tenant_id, tenant_id)
      ));

    // Calculate totals
    const total_in = movements
      .filter(m => m.delta > 0)
      .reduce((sum, m) => sum + m.delta, 0);

    const total_out = movements
      .filter(m => m.delta < 0)
      .reduce((sum, m) => sum + Math.abs(m.delta), 0);

    return {
      sku,
      warehouse_id,
      movements,
      current_stock: currentStock?.quantity ?? 0,
      total_in,
      total_out,
    };
  }

  async findByReference(ref_type: string, ref_id: number, tenant_id?: number): Promise<MovementWithDetails[]> {
    const conditions = [
      eq(stock_movements.ref_type, ref_type),
      eq(stock_movements.ref_id, ref_id)
    ];
    
    if (typeof tenant_id === 'number') {
      conditions.push(eq(stock_movements.tenant_id, tenant_id));
    }

    return await this.database
      .select(movementWithDetailsSelection)
      .from(stock_movements)
      .leftJoin(warehouses, eq(stock_movements.warehouse_id, warehouses.id))
      .leftJoin(users, eq(stock_movements.actor_id, users.id))
      .where(and(...conditions))
      .orderBy(desc(stock_movements.created_at));
  }
}
