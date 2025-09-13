import { and, count, eq, like, or, SQL, gte, lte, desc, asc, sum, sql } from "drizzle-orm";
import { transfers, transfer_items, warehouses, devices, stock } from "../../db/circtek.schema";
import { 
  TransferCreateInput, 
  TransferItemCreateInput, 
  TransferQueryInput, 
  TransferRecord, 
  TransferItemRecord,
  TransferWithDetails,
  TransferListResult,
  TransferSummary
} from "./types";
import { db } from "../../db/index";

export class TransfersRepository {
  constructor(private readonly database: typeof db) {}

  async createTransfer(transferData: TransferCreateInput & { tenant_id: number; created_by: number }): Promise<TransferRecord | undefined> {
    const [result] = await this.database.insert(transfers).values(transferData);

    if (!result.insertId) return undefined;

    return this.findTransferById(Number(result.insertId), transferData.tenant_id);
  }

  async createTransferItems(transfer_id: number, items: TransferItemCreateInput[], tenant_id: number, from_warehouse_id: number, to_warehouse_id: number): Promise<TransferItemRecord[]> {
    // Validate stock availability in sender warehouse for all items
    for (const item of items) {
      await this.validateStockForTransfer(item.sku, item.quantity || 1, from_warehouse_id, tenant_id);
    }

    // Ensure stock records exist in receiver warehouse to satisfy FK constraints
    for (const item of items) {
      await this.ensureStockExistsForTransfer(item.sku, to_warehouse_id, tenant_id);
    }

    const itemsToInsert = items.map(item => ({
      ...item,
      transfer_id,
      tenant_id,
    }));

    await this.database.insert(transfer_items).values(itemsToInsert);

    // Return the created items
    return this.database
      .select()
      .from(transfer_items)
      .where(and(
        eq(transfer_items.transfer_id, transfer_id),
        eq(transfer_items.tenant_id, tenant_id)
      ));
  }

  async createTransferWithItemsTransaction(
    transferData: TransferCreateInput & { tenant_id: number; created_by: number },
    items: TransferItemCreateInput[],
    tenant_id: number
  ): Promise<TransferWithDetails | undefined> {
    return await this.database.transaction(async (tx) => {
      // First, validate stock availability for all items before creating anything
      for (const item of items) {
        await this.validateStockForTransferInTransaction(
          tx, 
          item.sku, 
          item.quantity || 1, 
          transferData.from_warehouse_id, 
          tenant_id
        );
      }

      // Create the transfer
      const [transferResult] = await tx.insert(transfers).values(transferData);
      if (!transferResult.insertId) {
        throw new Error('Failed to create transfer');
      }

      const transfer_id = Number(transferResult.insertId);

      // Ensure stock records exist in receiver warehouse for FK constraints
      for (const item of items) {
        await this.ensureStockExistsForTransferInTransaction(
          tx, 
          item.sku, 
          transferData.to_warehouse_id, 
          tenant_id
        );
      }

      // Create transfer items
      const itemsToInsert = items.map(item => ({
        ...item,
        transfer_id,
        tenant_id,
      }));

      await tx.insert(transfer_items).values(itemsToInsert);

      // Return the full transfer with details
      return this.findTransferWithDetails(transfer_id, tenant_id);
    });
  }

  async findTransferById(id: number, tenant_id?: number): Promise<TransferRecord | undefined> {
    const conditions = [eq(transfers.id, id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(transfers.tenant_id, tenant_id));
    }

    const [result] = await this.database
      .select()
      .from(transfers)
      .where(and(...conditions));
    
    return result;
  }

  async findTransferWithDetails(id: number, tenant_id?: number): Promise<TransferWithDetails | undefined> {
    const transfer = await this.findTransferById(id, tenant_id);
    if (!transfer) return undefined;

    // Get warehouse details
    const [fromWarehouse] = await this.database
      .select({ name: warehouses.name })
      .from(warehouses)
      .where(eq(warehouses.id, transfer.from_warehouse_id));

    const [toWarehouse] = await this.database
      .select({ name: warehouses.name })
      .from(warehouses)
      .where(eq(warehouses.id, transfer.to_warehouse_id));

    // Get transfer items with device details
    const items = await this.database
      .select({
        id: transfer_items.id,
        transfer_id: transfer_items.transfer_id,
        sku: transfer_items.sku,
        device_id: transfer_items.device_id,
        is_part: transfer_items.is_part,
        quantity: transfer_items.quantity,
        status: transfer_items.status,
        tenant_id: transfer_items.tenant_id,
        created_at: transfer_items.created_at,
        updated_at: transfer_items.updated_at,
        device_sku: devices.sku,
        device_model: devices.model_name,
      })
      .from(transfer_items)
      .leftJoin(devices, eq(transfer_items.device_id, devices.id))
      .where(and(
        eq(transfer_items.transfer_id, id),
        eq(transfer_items.tenant_id, transfer.tenant_id)
      ));

    const normalizedItems = items.map(item => ({
      ...item,
      device_sku: item.device_sku ?? undefined,
      device_model: item.device_model ?? undefined,
    }));

    const total_items = normalizedItems.length;
    const total_quantity = normalizedItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

    return {
      id: transfer.id,
      from_warehouse_id: transfer.from_warehouse_id,
      from_warehouse_name: fromWarehouse?.name,
      to_warehouse_id: transfer.to_warehouse_id,
      to_warehouse_name: toWarehouse?.name,
      status: transfer.status,
      created_by: transfer.created_by as number,
      completed_by: transfer.completed_by ?? null,
      completed_at: transfer.completed_at ?? null,
      tenant_id: transfer.tenant_id,
      created_at: transfer.created_at,
      updated_at: transfer.updated_at,
      items: normalizedItems,
      total_items,
      total_quantity,
      is_completed: transfer.status === true, // Assuming true means completed
    };
  }

  async findAllTransfers(filters: TransferQueryInput & { tenant_id?: number }): Promise<TransferListResult> {
    const conditions: any[] = [];
    
    if (typeof filters.tenant_id === 'number') {
      conditions.push(eq(transfers.tenant_id, filters.tenant_id));
    }
    if (typeof filters.from_warehouse_id === 'number') {
      conditions.push(eq(transfers.from_warehouse_id, filters.from_warehouse_id));
    }
    if (typeof filters.to_warehouse_id === 'number') {
      conditions.push(eq(transfers.to_warehouse_id, filters.to_warehouse_id));
    }
    if (filters.status) {
      const statusBool = filters.status === 'completed' || filters.status === 'true';
      conditions.push(eq(transfers.status, statusBool));
    }
    if (filters.date_from) {
      conditions.push(gte(transfers.created_at, new Date(filters.date_from)));
    }
    if (filters.date_to) {
      conditions.push(lte(transfers.created_at, new Date(filters.date_to)));
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
        .from(transfers)
        .where(finalCondition as any);
    } else {
      [totalRow] = await this.database.select({ total: count() }).from(transfers);
    }

    // Get paginated results with warehouse names
    let baseQuery = this.database
      .select({
        id: transfers.id,
        from_warehouse_id: transfers.from_warehouse_id,
        from_warehouse_name: sql`fw.name`.as('from_warehouse_name'),
        to_warehouse_id: transfers.to_warehouse_id,
        to_warehouse_name: sql`tw.name`.as('to_warehouse_name'),
        status: transfers.status,
        created_by: transfers.created_by as any,
        completed_by: transfers.completed_by as any,
        completed_at: transfers.completed_at as any,
        tenant_id: transfers.tenant_id,
        created_at: transfers.created_at,
        updated_at: transfers.updated_at,
        total_items: sql`COUNT(${transfer_items.id})`.as('total_items'),
        total_quantity: sql`SUM(${transfer_items.quantity})`.as('total_quantity'),
      })
      .from(transfers)
      .leftJoin(sql`warehouses fw`, sql`${transfers.from_warehouse_id} = fw.id`)
      .leftJoin(sql`warehouses tw`, sql`${transfers.to_warehouse_id} = tw.id`)
      .leftJoin(transfer_items, eq(transfers.id, transfer_items.transfer_id))
      .groupBy(transfers.id);

    let rows;
    if (conditions.length) {
      const finalCondition = and(...conditions as any);
      rows = await baseQuery
        .where(finalCondition as any)
        .orderBy(sortDirection(sortColumn))
        .limit(limit)
        .offset(offset);
    } else {
      rows = await baseQuery
        .orderBy(sortDirection(sortColumn))
        .limit(limit)
        .offset(offset);
    }

    // Transform rows to match expected type
    const transfersWithDetails: TransferWithDetails[] = rows.map(row => ({
      id: row.id,
      from_warehouse_id: row.from_warehouse_id,
      from_warehouse_name: row.from_warehouse_name as string,
      to_warehouse_id: row.to_warehouse_id,
      to_warehouse_name: row.to_warehouse_name as string,
      status: row.status,
      created_by: (row as any).created_by as number,
      completed_by: (row as any).completed_by as number | null,
      completed_at: (row as any).completed_at as Date | null,
      tenant_id: row.tenant_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      items: [], // Items not loaded in list view for performance
      total_items: Number(row.total_items),
      total_quantity: Number(row.total_quantity) || 0,
      is_completed: row.status === true,
    }));

    return { rows: transfersWithDetails, total: totalRow?.total ?? 0, page, limit };
  }

  async updateTransferStatus(id: number, status: boolean, tenant_id?: number, completed_by?: number): Promise<TransferRecord | undefined> {
    const conditions = [eq(transfers.id, id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(transfers.tenant_id, tenant_id));
    }

    await this.database
      .update(transfers)
      .set({ status, updated_at: new Date(), ...(status ? { completed_by, completed_at: new Date() } : {}) } as any)
      .where(and(...conditions));
    
    return this.findTransferById(id, tenant_id);
  }

  async getTransferItems(transfer_id: number, tenant_id?: number): Promise<TransferItemRecord[]> {
    const conditions = [eq(transfer_items.transfer_id, transfer_id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(transfer_items.tenant_id, tenant_id));
    }

    return this.database
      .select()
      .from(transfer_items)
      .where(and(...conditions));
  }

  async getTransferSummary(tenant_id?: number): Promise<TransferSummary> {
    const conditions: any[] = [];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(transfers.tenant_id, tenant_id));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    // Get basic statistics
    const [basicStats] = await this.database
      .select({
        total_transfers: count(),
        pending_transfers: sql`SUM(CASE WHEN ${transfers.status} = false THEN 1 ELSE 0 END)`.as('pending_transfers'),
        completed_transfers: sql`SUM(CASE WHEN ${transfers.status} = true THEN 1 ELSE 0 END)`.as('completed_transfers'),
      })
      .from(transfers)
      .where(whereClause as any);

    // Get items in transit (pending transfers)
    const [itemsInTransit] = await this.database
      .select({
        total_items: sql`COUNT(${transfer_items.id})`.as('total_items'),
      })
      .from(transfer_items)
      .innerJoin(transfers, eq(transfer_items.transfer_id, transfers.id))
      .where(and(
        eq(transfers.status, false), // Pending transfers
        ...(conditions.length ? conditions : [])
      ) as any);

    // Get breakdown by warehouse (outbound and inbound)
    const warehouseOutbound = await this.database
      .select({
        warehouse_id: transfers.from_warehouse_id,
        warehouse_name: warehouses.name,
        count: count(),
      })
      .from(transfers)
      .leftJoin(warehouses, eq(transfers.from_warehouse_id, warehouses.id))
      .where(whereClause as any)
      .groupBy(transfers.from_warehouse_id, warehouses.name);

    const warehouseInbound = await this.database
      .select({
        warehouse_id: transfers.to_warehouse_id,
        warehouse_name: warehouses.name,
        count: count(),
      })
      .from(transfers)
      .leftJoin(warehouses, eq(transfers.to_warehouse_id, warehouses.id))
      .where(whereClause as any)
      .groupBy(transfers.to_warehouse_id, warehouses.name);

    const by_warehouse: Record<string, { outbound: number; inbound: number }> = {};
    
    warehouseOutbound.forEach(item => {
      const key = item.warehouse_name || `Warehouse ${item.warehouse_id}`;
      if (!by_warehouse[key]) by_warehouse[key] = { outbound: 0, inbound: 0 };
      by_warehouse[key].outbound = item.count;
    });

    warehouseInbound.forEach(item => {
      const key = item.warehouse_name || `Warehouse ${item.warehouse_id}`;
      if (!by_warehouse[key]) by_warehouse[key] = { outbound: 0, inbound: 0 };
      by_warehouse[key].inbound = item.count;
    });

    return {
      total_transfers: basicStats?.total_transfers ?? 0,
      pending_transfers: Number(basicStats?.pending_transfers) ?? 0,
      completed_transfers: Number(basicStats?.completed_transfers) ?? 0,
      total_items_in_transit: Number(itemsInTransit?.total_items) ?? 0,
      by_warehouse,
    };
  }

  async deleteTransfer(id: number, tenant_id?: number): Promise<{ id: number }> {
    const conditions = [eq(transfers.id, id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(transfers.tenant_id, tenant_id));
    }

    // First delete related items
    await this.database
      .delete(transfer_items)
      .where(eq(transfer_items.transfer_id, id));

    await this.database.delete(transfers).where(and(...conditions));
    return { id };
  }

  private async ensureStockExistsForTransfer(sku: string, warehouse_id: number, tenant_id: number): Promise<void> {
    // Check if stock record exists for this SKU in the specified warehouse
    const [existing] = await this.database
      .select({ id: stock.id })
      .from(stock)
      .where(and(
        eq(stock.sku, sku), 
        eq(stock.warehouse_id, warehouse_id),
        eq(stock.tenant_id, tenant_id)
      ))
      .limit(1);
    
    if (existing) return;

    // Create stock record in the specified warehouse for FK constraint
    try {
      await this.database.insert(stock).values({
        sku,
        warehouse_id,
        quantity: 0,
        tenant_id,
        is_part: false,
      });
    } catch (error: any) {
      // Handle unique constraint - stock might exist but in different warehouse
      if (error.code === 'ER_DUP_ENTRY') {
        // Just ignore - another process might have created it
        return;
      } else {
        throw error;
      }
    }
  }

  /**
   * Validates that the SKU exists in the sender warehouse with sufficient quantity
   */
  private async validateStockForTransfer(sku: string, quantity: number, from_warehouse_id: number, tenant_id: number): Promise<void> {
    const [stockRecord] = await this.database
      .select({ 
        id: stock.id,
        quantity: stock.quantity,
        warehouse_name: warehouses.name
      })
      .from(stock)
      .leftJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
      .where(and(
        eq(stock.sku, sku),
        eq(stock.warehouse_id, from_warehouse_id),
        eq(stock.tenant_id, tenant_id)
      ))
      .limit(1);

    if (!stockRecord) {
      throw new Error(`SKU "${sku}" does not exist in the sender warehouse`);
    }

    if (stockRecord.quantity < quantity) {
      throw new Error(`Insufficient quantity for SKU "${sku}" in sender warehouse "${stockRecord.warehouse_name}". Available: ${stockRecord.quantity}, Required: ${quantity}`);
    }
  }

  /**
   * Transaction-aware version of validateStockForTransfer
   */
  private async validateStockForTransferInTransaction(tx: any, sku: string, quantity: number, from_warehouse_id: number, tenant_id: number): Promise<void> {
    const [stockRecord] = await tx
      .select({ 
        id: stock.id,
        quantity: stock.quantity,
        warehouse_name: warehouses.name
      })
      .from(stock)
      .leftJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
      .where(and(
        eq(stock.sku, sku),
        eq(stock.warehouse_id, from_warehouse_id),
        eq(stock.tenant_id, tenant_id)
      ))
      .limit(1);

    if (!stockRecord) {
      throw new Error(`SKU "${sku}" does not exist in the sender warehouse`);
    }

    if (stockRecord.quantity < quantity) {
      throw new Error(`Insufficient quantity for SKU "${sku}" in sender warehouse "${stockRecord.warehouse_name}". Available: ${stockRecord.quantity}, Required: ${quantity}`);
    }
  }

  /**
   * Transaction-aware version of ensureStockExistsForTransfer
   */
  private async ensureStockExistsForTransferInTransaction(tx: any, sku: string, warehouse_id: number, tenant_id: number): Promise<void> {
    // Check if stock record exists for this SKU in the specified warehouse
    const [existing] = await tx
      .select({ id: stock.id })
      .from(stock)
      .where(and(
        eq(stock.sku, sku), 
        eq(stock.warehouse_id, warehouse_id),
        eq(stock.tenant_id, tenant_id)
      ))
      .limit(1);
    
    if (existing) return;

    // Create stock record in the specified warehouse for FK constraint
    try {
      await tx.insert(stock).values({
        sku,
        warehouse_id,
        quantity: 0,
        tenant_id,
        is_part: false,
      });
    } catch (error: any) {
      // Handle unique constraint - stock might exist but in different warehouse
      if (error.code === 'ER_DUP_ENTRY') {
        // Just ignore - another process might have created it
        return;
      } else {
        throw error;
      }
    }
  }

  async findDeviceByImeiOrSerial(identifier: string, tenant_id?: number): Promise<any | undefined> {
    const [device] = await this.database
      .select({
        id: devices.id,
        sku: devices.sku,
        serial: devices.serial,
        imei: devices.imei,
        device_type: devices.device_type,
        make: devices.make,
        model_no: devices.model_no,
        model_name: devices.model_name,
        storage: devices.storage,
        color: devices.color,
        lpn: devices.lpn,
        tenant_id: devices.tenant_id
      })
      .from(devices)
      .where(
        tenant_id 
          ? and(
              or(eq(devices.imei, identifier), eq(devices.serial, identifier)),
              eq(devices.tenant_id, tenant_id)
            )
          : or(eq(devices.imei, identifier), eq(devices.serial, identifier))
      )
      .limit(1);

    return device;
  }

  private getSortColumn(sortBy?: string): any {
    switch (sortBy) {
      case 'from_warehouse_name':
        return sql`fw.name`;
      case 'to_warehouse_name':
        return sql`tw.name`;
      case 'total_items':
        return sql`COUNT(${transfer_items.id})`;
      case 'total_quantity':
        return sql`SUM(${transfer_items.quantity})`;
      case 'is_completed':
      case 'status':
        return transfers.status;
      case 'created_at':
      default:
        return transfers.created_at;
    }
  }
}
