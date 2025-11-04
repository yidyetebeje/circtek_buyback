import { and, count, eq, like, or, SQL, gte, lte, desc, asc, sum, sql } from "drizzle-orm";
import { transfers, transfer_items, warehouses, devices, stock, stock_device_ids } from "../../db/circtek.schema";
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
      // If is_part is false and device_id is not provided, try to find device by IMEI/serial from SKU
      if (item.is_part === false && !item.device_id) {
        const device = await this.findDeviceByImeiOrSerial(item.sku, tenant_id);
        if (device) {
          item.device_id = device.id;
        }
      }
      await this.validateStockForTransfer(item.sku, item.quantity || 1, from_warehouse_id, tenant_id, item.is_part);
    }

    // Ensure stock records exist in receiver warehouse to satisfy FK constraints
    for (const item of items) {
      await this.ensureStockExistsForTransfer(item.sku, to_warehouse_id, tenant_id, item.is_part);
    }

    const itemsToInsert = items.map(item => ({
      ...item,
      transfer_id,
      tenant_id,
      device_id: item.device_id || null,
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

  /**
   * Creates a transfer with items in a single atomic transaction.
   * 
   * Flow:
   * 1. Resolve device information and prepare items
   * 2. Validate stock availability in source warehouse
   * 3. Create transfer record
   * 4. Ensure stock records exist in destination warehouse
   * 5. Create transfer item records
   * 6. Validate device mappings
   */
  async createTransferWithItemsTransaction(
    transferData: TransferCreateInput & { tenant_id: number; created_by: number },
    items: TransferItemCreateInput[],
    tenant_id: number
  ): Promise<TransferWithDetails | undefined> {
    return await this.database.transaction(async (tx) => {
      // Step 1: Prepare items (resolve devices, validate SKUs)
      const preparedItems = await this.prepareTransferItems(items, tenant_id);

      // Step 2: Validate stock availability for all items
      await this.validateItemsStockAvailability(tx, preparedItems, transferData.from_warehouse_id, tenant_id);

      // Step 3: Create the transfer record
      const transfer_id = await this.createTransferRecord(tx, transferData);

      // Step 4: Ensure destination warehouse has stock records
      await this.ensureDestinationStockRecords(tx, preparedItems, transferData.to_warehouse_id, tenant_id);

      // Step 5: Create transfer item records
      await this.createTransferItemRecords(tx, preparedItems, transfer_id, tenant_id);

      // Step 6: Validate device mappings for devices (non-parts)
      await this.validateDeviceMappings(tx, preparedItems, transferData.from_warehouse_id, tenant_id);

      // Return the complete transfer with details
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

  /**
   * Prepares transfer items by resolving device information and validating SKUs.
   * For non-part items without device_id, attempts to find device by IMEI/serial.
   */
  private async prepareTransferItems(
    items: TransferItemCreateInput[], 
    tenant_id: number
  ): Promise<TransferItemCreateInput[]> {
    const prepared: TransferItemCreateInput[] = [];

    for (const item of items) {
      const preparedItem = { ...item };

      // Resolve device information for non-part items
      if (preparedItem.is_part === false && (!preparedItem.device_id || preparedItem.device_id === 0)) {
        const device = await this.findDeviceByImeiOrSerial(preparedItem.sku, tenant_id);
        if (device) {
          preparedItem.device_id = device.id;
          // Update SKU to device's actual SKU if available
          if (device.sku && device.sku.trim() !== '') {
            preparedItem.sku = device.sku;
          }
        }
      }

      // Validate SKU is not empty
      if (!preparedItem.sku || preparedItem.sku.trim() === '') {
        throw new Error('SKU cannot be empty');
      }

      prepared.push(preparedItem);
    }

    return prepared;
  }

  /**
   * Validates stock availability for all items in the source warehouse.
   */
  private async validateItemsStockAvailability(
    tx: any,
    items: TransferItemCreateInput[],
    from_warehouse_id: number,
    tenant_id: number
  ): Promise<void> {
    for (const item of items) {
      await this.validateStockInTransaction(
        tx,
        item.sku,
        item.quantity || 1,
        from_warehouse_id,
        tenant_id
      );
    }
  }

  /**
   * Creates the transfer record and returns its ID.
   */
  private async createTransferRecord(
    tx: any,
    transferData: TransferCreateInput & { tenant_id: number; created_by: number }
  ): Promise<number> {
    const [result] = await tx.insert(transfers).values(transferData);
    if (!result.insertId) {
      throw new Error('Failed to create transfer record');
    }
    return Number(result.insertId);
  }

  /**
   * Ensures stock records exist in destination warehouse for all items.
   */
  private async ensureDestinationStockRecords(
    tx: any,
    items: TransferItemCreateInput[],
    to_warehouse_id: number,
    tenant_id: number
  ): Promise<void> {
    for (const item of items) {
      await this.ensureStockExistsInTransaction(
        tx,
        item.sku,
        to_warehouse_id,
        tenant_id,
        item.is_part
      );
    }
  }

  /**
   * Creates transfer item records in the database.
   * Note: Only explicitly specify fields that need transformation to avoid type issues.
   */
  private async createTransferItemRecords(
    tx: any,
    items: TransferItemCreateInput[],
    transfer_id: number,
    tenant_id: number
  ): Promise<void> {
    const itemsToInsert = items.map(item => ({
      sku: item.sku,
      transfer_id,
      tenant_id,
      device_id: (item.device_id && item.device_id !== 0) ? item.device_id : null,
      is_part: item.is_part ?? false,
      quantity: item.quantity ?? 1,
    }));
    console.log(itemsToInsert, "itemsToInsert");

    await tx.insert(transfer_items).values(itemsToInsert);
  }

  /**
   * Validates device-to-stock mappings for non-part items with device IDs.
   */
  private async validateDeviceMappings(
    tx: any,
    items: TransferItemCreateInput[],
    from_warehouse_id: number,
    tenant_id: number
  ): Promise<void> {
    for (const item of items) {
      if (item.device_id && !item.is_part) {
        await this.validateDeviceStockMapping(
          tx,
          item.device_id,
          item.sku,
          from_warehouse_id,
          tenant_id
        );
      }
    }
  }

  private async ensureStockExistsForTransfer(sku: string, warehouse_id: number, tenant_id: number, is_part?: boolean): Promise<void> {
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
        is_part: is_part ?? false,
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
   * Validates that the SKU exists in the warehouse with sufficient quantity.
   * Used for non-transactional operations.
   */
  private async validateStockForTransfer(sku: string, quantity: number, from_warehouse_id: number, tenant_id: number, is_part?: boolean): Promise<void> {
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
   * Validates stock availability within a transaction context.
   * Checks if SKU exists and has sufficient quantity in the specified warehouse.
   */
  private async validateStockInTransaction(
    tx: any, 
    sku: string, 
    quantity: number, 
    warehouse_id: number, 
    tenant_id: number
  ): Promise<void> {
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
        eq(stock.warehouse_id, warehouse_id),
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
   * Ensures a stock record exists in the warehouse within a transaction.
   * Creates the record with zero quantity if it doesn't exist.
   */
  private async ensureStockExistsInTransaction(tx: any, sku: string, warehouse_id: number, tenant_id: number, is_part?: boolean): Promise<void> {
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
        is_part: is_part ?? false,
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

  /**
   * Validates that a device is mapped to stock in the specified warehouse
   */
  private async validateDeviceStockMapping(tx: any, device_id: number, sku: string, warehouse_id: number, tenant_id: number): Promise<void> {
    // Get stock record for this SKU in the warehouse
    const [stockRecord] = await tx
      .select({ id: stock.id })
      .from(stock)
      .where(and(
        eq(stock.sku, sku),
        eq(stock.warehouse_id, warehouse_id),
        eq(stock.tenant_id, tenant_id)
      ))
      .limit(1);

    if (!stockRecord) {
      throw new Error(`Stock record for SKU "${sku}" not found in warehouse`);
    }

    // Check if device is mapped to this stock
    const [mapping] = await tx
      .select({ id: stock_device_ids.id })
      .from(stock_device_ids)
      .where(and(
        eq(stock_device_ids.stock_id, stockRecord.id),
        eq(stock_device_ids.device_id, device_id),
        eq(stock_device_ids.tenant_id, tenant_id)
      ))
      .limit(1);

    if (!mapping) {
      throw new Error(`Device ${device_id} is not mapped to stock in the source warehouse`);
    }
  }

  /**
   * Moves device mapping from source warehouse stock to destination warehouse stock
   */
  async moveDeviceStockMapping(device_id: number, sku: string, from_warehouse_id: number, to_warehouse_id: number, tenant_id: number): Promise<void> {
    return await this.database.transaction(async (tx) => {
      // Get source stock record
      const [sourceStock] = await tx
        .select({ id: stock.id })
        .from(stock)
        .where(and(
          eq(stock.sku, sku),
          eq(stock.warehouse_id, from_warehouse_id),
          eq(stock.tenant_id, tenant_id)
        ))
        .limit(1);

      if (!sourceStock) {
        throw new Error(`Source stock not found for SKU "${sku}"`);
      }

      // Get destination stock record
      const [destStock] = await tx
        .select({ id: stock.id })
        .from(stock)
        .where(and(
          eq(stock.sku, sku),
          eq(stock.warehouse_id, to_warehouse_id),
          eq(stock.tenant_id, tenant_id)
        ))
        .limit(1);

      if (!destStock) {
        throw new Error(`Destination stock not found for SKU "${sku}"`);
      }

      // Delete mapping from source stock
      await tx
        .delete(stock_device_ids)
        .where(and(
          eq(stock_device_ids.stock_id, sourceStock.id),
          eq(stock_device_ids.device_id, device_id),
          eq(stock_device_ids.tenant_id, tenant_id)
        ));

      // Create mapping to destination stock
      await tx.insert(stock_device_ids).values({
        stock_id: destStock.id,
        device_id: device_id,
        tenant_id: tenant_id,
      });

      // Update device warehouse_id
      await tx
        .update(devices)
        .set({ warehouse_id: to_warehouse_id })
        .where(and(
          eq(devices.id, device_id),
          eq(devices.tenant_id, tenant_id)
        ));
    });
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
