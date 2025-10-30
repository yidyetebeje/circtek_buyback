import { and, count, eq, like, or, SQL, gte, lte, desc, asc, sql } from "drizzle-orm";
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

  /**
   * Extract base SKU by removing the last segment (batch number)
   * Example: GSM-TI-BAT-11-290 -> GSM-TI-BAT-11
   */
  private getBaseSku(sku: string): string {
    const parts = sku.split('-');
    if (parts.length <= 1) {
      return sku; // No batch segment to remove
    }
    return parts.slice(0, -1).join('-');
  }

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
    // If batch grouping is enabled, use specialized method
    if (filters.group_by_batch) {
      return this.findAllGroupedByBatch(filters);
    }

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

    // Determine sorting
    const sortColumn = this.getSortColumn(filters.sort_by);
    const sortDirection = filters.sort_dir === 'desc' ? desc : asc;

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
        .orderBy(sortDirection(sortColumn))
        .limit(limit)
        .offset(offset);
    } else {
      rows = await this.database
        .select(stockWithWarehouseSelection)
        .from(stock)
        .leftJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
        .orderBy(sortDirection(sortColumn))
        .limit(limit)
        .offset(offset);
    }

    return { rows, total: totalRow?.total ?? 0, page, limit };
  }

  /**
   * Find all stock grouped by base SKU (batch grouping)
   */
  private async findAllGroupedByBatch(filters: StockQueryInput & { tenant_id?: number }): Promise<StockListResult> {
    const conditions: any[] = [];
    
    if (typeof filters.tenant_id === 'number') {
      conditions.push(eq(stock.tenant_id, filters.tenant_id));
    }
    if (typeof filters.warehouse_id === 'number') {
      conditions.push(eq(stock.warehouse_id, filters.warehouse_id));
    }
    if (filters.sku) {
      // When batch grouping, match SKUs that start with the base pattern
      const pattern = `${filters.sku}%`;
      conditions.push(like(stock.sku, pattern));
    }
    if (typeof filters.is_part === 'boolean') {
      conditions.push(eq(stock.is_part, filters.is_part));
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(like(stock.sku, pattern));
    }

    // Get all stock records matching conditions
    let allRecords;
    if (conditions.length) {
      const finalCondition = and(...conditions as any);
      allRecords = await this.database
        .select(stockWithWarehouseSelection)
        .from(stock)
        .leftJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
        .where(finalCondition as any);
    } else {
      allRecords = await this.database
        .select(stockWithWarehouseSelection)
        .from(stock)
        .leftJoin(warehouses, eq(stock.warehouse_id, warehouses.id));
    }

    // Group by base SKU and warehouse
    const groupedMap = new Map<string, StockWithWarehouse>();
    
    allRecords.forEach(record => {
      const baseSku = this.getBaseSku(record.sku);
      const key = `${record.warehouse_id}:${baseSku}`;
      
      const existing = groupedMap.get(key);
      if (existing) {
        // Aggregate quantities
        existing.quantity += record.quantity;
      } else {
        // Create new grouped record with base SKU
        groupedMap.set(key, {
          ...record,
          sku: baseSku,
          quantity: record.quantity
        });
      }
    });

    let groupedRecords = Array.from(groupedMap.values());

    // Apply low stock threshold filter after grouping
    if (typeof filters.low_stock_threshold === 'number') {
      groupedRecords = groupedRecords.filter(r => r.quantity <= filters.low_stock_threshold);
    }

    // Apply sorting
    const sortBy = filters.sort_by || 'created_at';
    const sortDir = filters.sort_dir || 'asc';
    
    groupedRecords.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
        case 'sku':
          aVal = a.sku;
          bVal = b.sku;
          break;
        case 'quantity':
          aVal = a.quantity;
          bVal = b.quantity;
          break;
        case 'warehouse_name':
          aVal = a.warehouse_name || '';
          bVal = b.warehouse_name || '';
          break;
        case 'is_part':
          aVal = a.is_part ? 1 : 0;
          bVal = b.is_part ? 1 : 0;
          break;
        default:
          aVal = a.created_at?.getTime() ?? 0;
          bVal = b.created_at?.getTime() ?? 0;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Apply pagination
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, Math.min(100, filters.limit ?? 10));
    const offset = (page - 1) * limit;
    const total = groupedRecords.length;
    const rows = groupedRecords.slice(offset, offset + limit);

    return { rows, total, page, limit };
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

  private getSortColumn(sortBy?: string): any {
    switch (sortBy) {
      case 'sku':
        return stock.sku;
      case 'quantity':
        return stock.quantity;
      case 'warehouse_name':
        return warehouses.name;
      case 'is_part':
        return stock.is_part;
      case 'created_at':
      default:
        return stock.created_at;
    }
  }
}
