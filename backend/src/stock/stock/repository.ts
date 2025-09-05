import { and, count, eq, like, or, SQL, gte, lte, sql } from "drizzle-orm";
import { stock, warehouses } from "../../db/circtek.schema";
import { StockCreateInput, StockQueryInput, StockUpdateInput, StockWithWarehouse, StockListResult, StockSummary } from "./types";
import { db } from "../../db/index";

const stockWithWarehouseSelection = {
  id: stock.id,
  sku: stock.sku,
  is_part: stock.is_part,
  quantity: stock.quantity,
  warehouse_id: stock.warehouse_id,
  warehouse_name: warehouses.name,
  status: stock.status,
  tenant_id: stock.tenant_id,
  created_at: stock.created_at,
  updated_at: stock.updated_at,
};

export class StockRepository {
  constructor(private readonly database: typeof db) {}

  async createStock(stockData: StockCreateInput & { tenant_id: number }): Promise<StockWithWarehouse | undefined> {
    // Check if stock already exists for this SKU and warehouse
    const existing = await this.findBySkuAndWarehouse(stockData.sku, stockData.warehouse_id, stockData.tenant_id);
    if (existing) {
      // If exists, update quantity instead of creating new
      return this.updateStock(existing.id, { quantity: existing.quantity + stockData.quantity }, stockData.tenant_id);
    }

    try {
      await this.database.insert(stock).values(stockData);
    } catch (error: any) {
      // Handle unique constraint violation for SKU
      if (error.code === 'ER_DUP_ENTRY') {
        // Check if there's an existing record for this SKU
        const [existingGlobal] = await this.database
          .select(stockWithWarehouseSelection)
          .from(stock)
          .leftJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
          .where(eq(stock.sku, stockData.sku));
        
        if (existingGlobal) {
          // Update existing record to match our warehouse and add quantity
          await this.database
            .update(stock)
            .set({ 
              warehouse_id: stockData.warehouse_id, 
              tenant_id: stockData.tenant_id,
              quantity: existingGlobal.quantity + stockData.quantity,
              updated_at: new Date()
            })
            .where(eq(stock.sku, stockData.sku));
          
          return this.findBySkuAndWarehouse(stockData.sku, stockData.warehouse_id, stockData.tenant_id);
        }
      }
      throw error;
    }

    const [created] = await this.database
      .select(stockWithWarehouseSelection)
      .from(stock)
      .leftJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
      .where(and(
        eq(stock.sku, stockData.sku),
        eq(stock.warehouse_id, stockData.warehouse_id),
        eq(stock.tenant_id, stockData.tenant_id)
      ));
    return created;
  }

  async findBySkuAndWarehouse(sku: string, warehouse_id: number, tenant_id: number): Promise<StockWithWarehouse | undefined> {
    const [result] = await this.database
      .select(stockWithWarehouseSelection)
      .from(stock)
      .leftJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
      .where(and(
        eq(stock.sku, sku),
        eq(stock.warehouse_id, warehouse_id),
        eq(stock.tenant_id, tenant_id)
      ));
    return result;
  }

  async findById(id: number, tenant_id?: number): Promise<StockWithWarehouse | undefined> {
    const conditions = [eq(stock.id, id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(stock.tenant_id, tenant_id));
    }

    const [result] = await this.database
      .select(stockWithWarehouseSelection)
      .from(stock)
      .leftJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
      .where(and(...conditions));
    return result;
  }

  async findAll(filters: StockQueryInput & { tenant_id?: number }): Promise<StockListResult> {
    const conditions: any[] = [];
    
    if (typeof filters.tenant_id === 'number') {
      conditions.push(eq(stock.tenant_id, filters.tenant_id));
    }
    if (typeof filters.warehouse_id === 'number') {
      conditions.push(eq(stock.warehouse_id, filters.warehouse_id));
    }
    if (filters.sku) {
      conditions.push(eq(stock.sku, filters.sku));
    }
    if (typeof filters.is_part === 'boolean') {
      conditions.push(eq(stock.is_part, filters.is_part));
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(like(stock.sku, pattern));
    }
    if (typeof filters.low_stock_threshold === 'number') {
      conditions.push(lte(stock.quantity, filters.low_stock_threshold));
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
        .from(stock)
        .where(finalCondition as any);
    } else {
      [totalRow] = await this.database.select({ total: count() }).from(stock);
    }

    // Get paginated results
    let rows;
    if (conditions.length) {
      const finalCondition = and(...conditions as any);
      rows = await this.database
        .select(stockWithWarehouseSelection)
        .from(stock)
        .leftJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
        .where(finalCondition as any)
        .limit(limit)
        .offset(offset);
    } else {
      rows = await this.database
        .select(stockWithWarehouseSelection)
        .from(stock)
        .leftJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
        .limit(limit)
        .offset(offset);
    }

    return { rows, total: totalRow?.total ?? 0, page, limit };
  }

  async updateStock(id: number, updates: StockUpdateInput, tenant_id?: number): Promise<StockWithWarehouse | undefined> {
    const conditions = [eq(stock.id, id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(stock.tenant_id, tenant_id));
    }

    await this.database
      .update(stock)
      .set({ ...updates, updated_at: new Date() })
      .where(and(...conditions));
    
    return this.findById(id, tenant_id);
  }

  async updateStockQuantity(sku: string, warehouse_id: number, delta: number, tenant_id: number): Promise<StockWithWarehouse | undefined> {
    const existing = await this.findBySkuAndWarehouse(sku, warehouse_id, tenant_id);
     console.log("updateStockQuantity", sku, warehouse_id, delta, tenant_id);
    
    if (!existing) {
      // Create new stock record if doesn't exist
      if (delta > 0) {
        return this.createStock({ sku, warehouse_id, quantity: delta, tenant_id });
      }
      return undefined;
    }

    const newQuantity = existing.quantity + delta;
    
    // Prevent negative stock
    if (newQuantity < 0) {
      throw new Error(`Insufficient stock. Current: ${existing.quantity}, Attempted delta: ${delta}`);
    }

    return this.updateStock(existing.id, { quantity: newQuantity }, tenant_id);
  }

  async deleteStock(id: number, tenant_id?: number): Promise<{ id: number }> {
    const conditions = [eq(stock.id, id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(stock.tenant_id, tenant_id));
    }

    await this.database.delete(stock).where(and(...conditions));
    return { id };
  }

  async getStockSummary(tenant_id?: number): Promise<StockSummary> {
    const conditions: any[] = [];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(stock.tenant_id, tenant_id));
    }

    // Get basic counts
    const whereClause = conditions.length ? and(...conditions) : undefined;
    
    const [summary] = await this.database
      .select({
        total_skus: count(),
        total_quantity: sql`SUM(${stock.quantity})`.as('total_quantity'),
      })
      .from(stock)
      .where(whereClause as any);

    // Get low stock count (threshold: 5)
    const lowStockConditions = [...conditions, lte(stock.quantity, 5)];
    const [lowStock] = await this.database
      .select({ low_stock_items: count() })
      .from(stock)
      .where(and(...lowStockConditions) as any);

    // Get warehouse count
    const [warehouseCount] = await this.database
      .select({ warehouses_count: sql`COUNT(DISTINCT ${stock.warehouse_id})` })
      .from(stock)
      .where(whereClause as any);

    return {
      total_skus: summary?.total_skus ?? 0,
      total_quantity: Number(summary?.total_quantity) ?? 0,
      low_stock_items: lowStock?.low_stock_items ?? 0,
      warehouses_count: Number(warehouseCount?.warehouses_count) ?? 0,
    };
  }

  async getLowStockItems(threshold: number = 5, tenant_id?: number): Promise<StockWithWarehouse[]> {
    const conditions: any[] = [lte(stock.quantity, threshold)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(stock.tenant_id, tenant_id));
    }

    return await this.database
      .select(stockWithWarehouseSelection)
      .from(stock)
      .leftJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
      .where(and(...conditions));
  }
}
