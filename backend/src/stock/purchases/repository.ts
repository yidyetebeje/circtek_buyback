import { and, count, eq, like, or, SQL, gte, lte, desc, asc, sum, sql } from "drizzle-orm";
import { purchases, purchase_items, received_items, warehouses, devices, sku_specs, stock, tenants,  stock_device_ids } from "../../db/circtek.schema";
import { 
  PurchaseCreateInput, 
  PurchaseItemCreateInput, 
  PurchaseQueryInput, 
  PurchaseRecord, 
  PurchaseItemRecord,
  ReceivedItemRecord,
  PurchaseListResult,
  PurchaseWithItemsAndReceived,
  PurchaseWithItems,
  PurchaseWithItemsListResult,
  ReceiveItemsRequestInput
} from "./types";
import { db } from "../../db/index";

export class PurchasesRepository {
  constructor(private readonly database: typeof db) {}

  /**
   * Generate a unique purchase order number in format: po_{tenant_name}_{timestamp}_{random}
   */
  private async generatePurchaseOrderNumber(tenant_id: number): Promise<string> {
    // Get tenant name
    const [tenant] = await this.database
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenant_id));
    
    if (!tenant) {
      throw new Error(`Tenant with ID ${tenant_id} not found`);
    }

    // Sanitize tenant name: remove spaces, special characters, convert to lowercase
    const sanitizedTenantName = tenant.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

    // Generate unique identifier: timestamp + random string
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 8); // 6 random characters
    
    return `po_${sanitizedTenantName}_${timestamp}_${randomPart}`;
  }

  async createPurchase(purchaseData: PurchaseCreateInput & { tenant_id: number }): Promise<PurchaseRecord | undefined> {
    // Convert the datetime string to a proper Date object, ensuring it's valid
    const deliveryDate = new Date(purchaseData.expected_delivery_date);
    
    // Check if the date is valid
    if (isNaN(deliveryDate.getTime())) {
      throw new Error(`Invalid expected_delivery_date: ${purchaseData.expected_delivery_date}`);
    }
    
    // Generate purchase order number if not provided
    const purchase_order_no = purchaseData.purchase_order_no || 
                              await this.generatePurchaseOrderNumber(purchaseData.tenant_id);
    
    const [result] = await this.database.insert(purchases).values({
      ...purchaseData,
      purchase_order_no,
      expected_delivery_date: deliveryDate,
    });

    if (!result.insertId) return undefined;

    return this.findPurchaseById(Number(result.insertId), purchaseData.tenant_id);
  }

  async createPurchaseItems(purchase_id: number, items: PurchaseItemCreateInput[], tenant_id: number): Promise<PurchaseItemRecord[]> {
    const itemsToInsert = items.map(item => ({
      ...item,
      purchase_id,
      tenant_id,
      price: item.price.toString(), // Convert to string for decimal field
    }));

    await this.database.insert(purchase_items).values(itemsToInsert);

    // Return the created items, coercing decimal strings to numbers
    const rows = await this.database
      .select()
      .from(purchase_items)
      .where(and(
        eq(purchase_items.purchase_id, purchase_id),
        eq(purchase_items.tenant_id, tenant_id)
      ));

    return rows.map((row) => ({ ...row, price: Number(row.price) }));
  }

  async findPurchaseById(id: number, tenant_id?: number): Promise<PurchaseRecord | undefined> {
    const conditions = [eq(purchases.id, id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(purchases.tenant_id, tenant_id));
    }

    const [result] = await this.database
      .select()
      .from(purchases)
      .where(and(...conditions));
    
    return result;
  }

  async findPurchaseWithItems(id: number, tenant_id?: number): Promise<PurchaseWithItemsAndReceived | undefined> {
    const purchase = await this.findPurchaseById(id, tenant_id);
    if (!purchase) return undefined;

    // Get purchase items with received quantities
    const items = await this.database
      .select({
        id: purchase_items.id,
        purchase_id: purchase_items.purchase_id,
        sku: purchase_items.sku,
        quantity: purchase_items.quantity,
        quantity_used_for_repair: purchase_items.quantity_used_for_repair,
        price: purchase_items.price,
        is_part: purchase_items.is_part,
        status: purchase_items.status,
        tenant_id: purchase_items.tenant_id,
        created_at: purchase_items.created_at,
        received_quantity: sql`COALESCE(SUM(${received_items.quantity}), 0)`.as('received_quantity'),
      })
      .from(purchase_items)
      .leftJoin(received_items, eq(purchase_items.id, received_items.purchase_item_id))
      .where(and(
        eq(purchase_items.purchase_id, id),
        eq(purchase_items.tenant_id, purchase.tenant_id)
      ))
      .groupBy(purchase_items.id);

    const itemsWithRemaining = items.map(item => ({
      ...item,
      price: Number(item.price),
      received_quantity: Number(item.received_quantity),
      remaining_quantity: item.quantity - Number(item.received_quantity),
    }));

    const total_items = itemsWithRemaining.reduce((sum, item) => sum + item.quantity, 0);
    const total_received = itemsWithRemaining.reduce((sum, item) => sum + item.received_quantity, 0);
    const is_fully_received = total_received >= total_items;

    return {
      purchase,
      items: itemsWithRemaining,
      total_items,
      total_received,
      is_fully_received,
    };
  }

  async findAllPurchases(filters: PurchaseQueryInput & { tenant_id?: number }): Promise<PurchaseListResult> {
    const conditions: any[] = [];
    
    if (typeof filters.tenant_id === 'number') {
      conditions.push(eq(purchases.tenant_id, filters.tenant_id));
    }
    if (filters.supplier_name) {
      conditions.push(like(purchases.supplier_name, `%${filters.supplier_name}%`));
    }
    if (filters.purchase_order_no) {
      conditions.push(like(purchases.purchase_order_no, `%${filters.purchase_order_no}%`));
    }
    if (filters.date_from) {
      conditions.push(gte(purchases.created_at, new Date(filters.date_from)));
    }
    if (filters.date_to) {
      conditions.push(lte(purchases.created_at, new Date(filters.date_to)));
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(purchases.purchase_order_no, pattern),
          like(purchases.supplier_name, pattern),
          like(purchases.supplier_order_no, pattern),
          sql`EXISTS (
            SELECT 1 FROM ${purchase_items} pi
            WHERE pi.purchase_id = ${purchases.id}
            AND pi.sku LIKE ${pattern}
          )` as any
        )
      );
    }

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, Math.min(100, filters.limit ?? 10));
    const offset = (page - 1) * limit;

    // Determine sorting - default to created_at desc (newest first)
    const sortColumn = this.getSortColumn(filters.sort_by);
    const sortDirection = filters.sort_dir === 'asc' ? asc : desc; // Default to desc

    // Apply receiving_status filter (pending/completed) using correlated subqueries
    const receivingStatus = (filters as any).receiving_status as 'pending' | 'completed' | undefined;
    if (receivingStatus === 'pending') {
      conditions.push(sql`
        (
          SELECT COALESCE(SUM(ri.quantity), 0)
          FROM ${purchase_items} pi
          LEFT JOIN ${received_items} ri ON pi.id = ri.purchase_item_id
          WHERE pi.purchase_id = ${purchases.id}
        ) < (
          SELECT COALESCE(SUM(pi2.quantity), 0)
          FROM ${purchase_items} pi2
          WHERE pi2.purchase_id = ${purchases.id}
        )
      ` as any);
    } else if (receivingStatus === 'completed') {
      conditions.push(sql`
        (
          SELECT COALESCE(SUM(ri.quantity), 0)
          FROM ${purchase_items} pi
          LEFT JOIN ${received_items} ri ON pi.id = ri.purchase_item_id
          WHERE pi.purchase_id = ${purchases.id}
        ) >= (
          SELECT COALESCE(SUM(pi2.quantity), 0)
          FROM ${purchase_items} pi2
          WHERE pi2.purchase_id = ${purchases.id}
        )
      ` as any);
    }

    // Get total count with potential join and conditions
    let totalRow: { total: number } | undefined;
    if (conditions.length) {
      const finalCondition = and(...conditions as any);
      [totalRow] = await this.database
        .select({ total: count() })
        .from(purchases)
        .where(finalCondition as any);
    } else {
      [totalRow] = await this.database.select({ total: count() }).from(purchases);
    }

    // Get paginated results (join totals if filtering)
    let rows;
    if (conditions.length) {
      const finalCondition = and(...conditions as any);
      rows = await this.database
        .select()
        .from(purchases)
        .where(finalCondition as any)
        .orderBy(sortDirection(sortColumn))
        .limit(limit)
        .offset(offset);
    } else {
      rows = await this.database
        .select()
        .from(purchases)
        .orderBy(sortDirection(sortColumn))
        .limit(limit)
        .offset(offset);
    }

    return { rows, total: totalRow?.total ?? 0, page, limit };
  }

  async findAllPurchasesWithItems(filters: PurchaseQueryInput & { tenant_id?: number }): Promise<PurchaseWithItemsListResult> {
    const conditions: any[] = [];
    
    if (typeof filters.tenant_id === 'number') {
      conditions.push(eq(purchases.tenant_id, filters.tenant_id));
    }
    if (filters.supplier_name) {
      conditions.push(like(purchases.supplier_name, `%${filters.supplier_name}%`));
    }
    if (filters.purchase_order_no) {
      conditions.push(like(purchases.purchase_order_no, `%${filters.purchase_order_no}%`));
    }
    if (filters.date_from) {
      conditions.push(gte(purchases.created_at, new Date(filters.date_from)));
    }
    if (filters.date_to) {
      conditions.push(lte(purchases.created_at, new Date(filters.date_to)));
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(purchases.purchase_order_no, pattern),
          like(purchases.supplier_name, pattern),
          like(purchases.supplier_order_no, pattern),
          sql`EXISTS (
            SELECT 1 FROM ${purchase_items} pi
            WHERE pi.purchase_id = ${purchases.id}
            AND pi.sku LIKE ${pattern}
          )` as any
        )
      );
    }

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, Math.min(100, filters.limit ?? 10));
    const offset = (page - 1) * limit;

    // Determine sorting - default to created_at desc (newest first)
    const sortColumn = this.getSortColumn(filters.sort_by);
    const sortDirection = filters.sort_dir === 'asc' ? asc : desc; // Default to desc

    // Get total count
    let totalRow: { total: number } | undefined;
    if (conditions.length) {
      const finalCondition = and(...conditions as any);
      [totalRow] = await this.database
        .select({ total: count() })
        .from(purchases)
        .where(finalCondition as any);
    } else {
      [totalRow] = await this.database.select({ total: count() }).from(purchases);
    }

    // Apply receiving_status filter with correlated subqueries (no joins in selection to preserve shape)
    const receivingStatus2 = (filters as any).receiving_status as 'pending' | 'completed' | undefined;
    if (receivingStatus2 === 'pending') {
      conditions.push(sql`
        (
          SELECT COALESCE(SUM(ri.quantity), 0)
          FROM ${purchase_items} pi
          LEFT JOIN ${received_items} ri ON pi.id = ri.purchase_item_id
          WHERE pi.purchase_id = ${purchases.id}
        ) < (
          SELECT COALESCE(SUM(pi2.quantity), 0)
          FROM ${purchase_items} pi2
          WHERE pi2.purchase_id = ${purchases.id}
        )
      ` as any);
    } else if (receivingStatus2 === 'completed') {
      conditions.push(sql`
        (
          SELECT COALESCE(SUM(ri.quantity), 0)
          FROM ${purchase_items} pi
          LEFT JOIN ${received_items} ri ON pi.id = ri.purchase_item_id
          WHERE pi.purchase_id = ${purchases.id}
        ) >= (
          SELECT COALESCE(SUM(pi2.quantity), 0)
          FROM ${purchase_items} pi2
          WHERE pi2.purchase_id = ${purchases.id}
        )
      ` as any);
    }

    // Get paginated purchases (no joins in result set)
    let purchaseRows;
    if (conditions.length) {
      const finalCondition = and(...conditions as any);
      purchaseRows = await this.database
        .select()
        .from(purchases)
        .where(finalCondition as any)
        .orderBy(sortDirection(sortColumn))
        .limit(limit)
        .offset(offset);
    } else {
      purchaseRows = await this.database
        .select()
        .from(purchases)
        .orderBy(sortDirection(sortColumn))
        .limit(limit)
        .offset(offset);
    }

    // For each purchase, get its items with received quantities
    const rows: PurchaseWithItems[] = [];
    for (const purchase of purchaseRows) {
      const items = await this.database
        .select({
          id: purchase_items.id,
          purchase_id: purchase_items.purchase_id,
          sku: purchase_items.sku,
          quantity: purchase_items.quantity,
          quantity_used_for_repair: purchase_items.quantity_used_for_repair,
          price: purchase_items.price,
          is_part: purchase_items.is_part,
          status: purchase_items.status,
          tenant_id: purchase_items.tenant_id,
          created_at: purchase_items.created_at,
          received_quantity: sql`COALESCE(SUM(${received_items.quantity}), 0)`.as('received_quantity'),
        })
        .from(purchase_items)
        .leftJoin(received_items, eq(purchase_items.id, received_items.purchase_item_id))
        .where(and(
          eq(purchase_items.purchase_id, purchase.id),
          eq(purchase_items.tenant_id, purchase.tenant_id)
        ))
        .groupBy(purchase_items.id);

      const itemsWithRemaining = items.map(item => ({
        ...item,
        price: Number(item.price),
        received_quantity: Number(item.received_quantity),
        remaining_quantity: item.quantity - Number(item.received_quantity),
      }));

      rows.push({
        purchase,
        items: itemsWithRemaining,
      });
    }

    return { rows, total: totalRow?.total ?? 0, page, limit };
  }

  async receiveItems(receiveData: ReceiveItemsRequestInput, tenant_id: number): Promise<ReceivedItemRecord[]> {
    const receivedItems: ReceivedItemRecord[] = [];
    
    try {
      for (const item of receiveData.items) {
        const identifiers = (item as any).identifiers as string[] | undefined
        if (identifiers && identifiers.length > 0) {
          for (const identifier of identifiers) {
            try {
              await this.ensureStockExistsForSku(item.sku, tenant_id, receiveData.warehouse_id, false)
              const deviceId = await this.ensureDeviceForIdentifier(item.sku, identifier, tenant_id, receiveData.warehouse_id)
              
              if (!deviceId) {
                throw new Error(`Failed to create device for identifier: ${identifier}`)
              }
              
              const [result] = await this.database.insert(received_items).values({
                purchase_id: receiveData.purchase_id,
                purchase_item_id: item.purchase_item_id,
                sku: item.sku,
                device_id: deviceId,
                quantity: 1,
                tenant_id,
              });
              const stockresult = await this.database.select().from(stock).where(eq(stock.sku, item.sku))
              if (stockresult.length > 0) {
                await this.database.insert(stock_device_ids).values({
                  stock_id: stockresult[0].id,
                  device_id: deviceId,
                  tenant_id,
                });
              }

              if (result.insertId) {
                const [received] = await this.database
                  .select()
                  .from(received_items)
                  .where(eq(received_items.id, Number(result.insertId)));
                if (received) receivedItems.push(received);
              } else {
                throw new Error(`Failed to insert received_items for identifier: ${identifier}`)
              }
            } catch (error) {
              if (process.env.NODE_ENV === 'test') {
                console.error(`receiveItems identifier error for ${identifier}:`, error)
              }
              throw error
            }
          }
        } else {
          try {
            // Ensure stock exists for this SKU before inserting received_items
            await this.ensureStockExistsForSku(item.sku, tenant_id, receiveData.warehouse_id, true)
            
            const [result] = await this.database.insert(received_items).values({
              purchase_id: receiveData.purchase_id,
              purchase_item_id: item.purchase_item_id,
              sku: item.sku,
          
              quantity: item.quantity_received,
              tenant_id,
            });

            if (result.insertId) {
              const [received] = await this.database
                .select()
                .from(received_items)
                .where(eq(received_items.id, Number(result.insertId)));
              if (received) receivedItems.push(received);
            } else {
              throw new Error(`Failed to insert received_items for SKU: ${item.sku}`)
            }
          } catch (error) {
            if (process.env.NODE_ENV === 'test') {
              console.error(`receiveItems SKU error for ${item.sku}:`, error)
            }
            throw error
          }
        }
      }
      
      return receivedItems;
    } catch (error) {
      // Rollback any partial inserts if needed
      if (process.env.NODE_ENV === 'test') {
        console.error('receiveItems failed, potential rollback needed:', error)
      }
      throw error
    }
  }

  async getReceivedItems(purchase_id: number, tenant_id?: number): Promise<ReceivedItemRecord[]> {
    const conditions = [eq(received_items.purchase_id, purchase_id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(received_items.tenant_id, tenant_id));
    }

    return this.database
      .select()
      .from(received_items)
      .where(and(...conditions))
      .orderBy(desc(received_items.received_at));
  }

  async getPurchaseItems(purchase_id: number, tenant_id?: number): Promise<PurchaseItemRecord[]> {
    const conditions = [eq(purchase_items.purchase_id, purchase_id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(purchase_items.tenant_id, tenant_id));
    }

    const rows = await this.database
      .select()
      .from(purchase_items)
      .where(and(...conditions));

    return rows.map((row) => ({ ...row, price: Number(row.price) }));
  }

  // Allocation helpers for repairs consumption cost-resolution
  async getSkuBatchesWithAvailability(skuValue: string, tenant_id: number, warehouse_id: number): Promise<Array<PurchaseItemRecord & { received_quantity: number; available_quantity: number }>> {
    const items = await this.database
      .select({
        id: purchase_items.id,
        purchase_id: purchase_items.purchase_id,
        sku: purchase_items.sku,
        quantity: purchase_items.quantity,
        quantity_used_for_repair: purchase_items.quantity_used_for_repair,
        price: purchase_items.price,
        is_part: purchase_items.is_part,
        status: purchase_items.status,
        tenant_id: purchase_items.tenant_id,
        created_at: purchase_items.created_at,
        received_quantity: sql`COALESCE(SUM(${received_items.quantity}), 0)`.as('received_quantity'),
      })
      .from(purchase_items)
      .leftJoin(received_items, eq(purchase_items.id, received_items.purchase_item_id))
      .leftJoin(purchases, eq(purchase_items.purchase_id, purchases.id))
      .where(and(
        eq(purchase_items.sku, skuValue),
        eq(purchase_items.tenant_id, tenant_id),
        eq(purchase_items.status, true as any),
        eq(purchases.warehouse_id, warehouse_id)

      ))
      .groupBy(purchase_items.id)
      .orderBy(desc(purchase_items.created_at));

    return items.map((row: any) => {
      const received = Number(row.received_quantity ?? 0)
      const used = Number(row.quantity_used_for_repair ?? 0)
      const available = Math.max(0, received - used)
      return {
        ...(row as any),
        price: Number(row.price),
        received_quantity: received,
        available_quantity: available,
      } as any
    })
  }

  async allocateSkuQuantity(
    skuValue: string,
    quantityNeeded: number,
    tenant_id: number,
    warehouse_id: number
  ): Promise<{ total_allocated: number; allocations: Array<{ purchase_item_id: number; quantity: number; unit_price: number }> }> {
    if (quantityNeeded <= 0) return { total_allocated: 0, allocations: [] }

    const batches = await this.getSkuBatchesWithAvailability(skuValue, tenant_id,warehouse_id)
    let remaining = quantityNeeded
    const allocations: Array<{ purchase_item_id: number; quantity: number; unit_price: number }> = []

    for (const batch of batches) {
      if (remaining <= 0) break
      const take = Math.min(remaining, batch.available_quantity)
      if (take > 0) {
        // increment used for repair
        await this.database
          .update(purchase_items)
          .set({ quantity_used_for_repair: sql`${purchase_items.quantity_used_for_repair} + ${take}` as any })
          .where(and(eq(purchase_items.id, batch.id), eq(purchase_items.tenant_id, tenant_id)))

        allocations.push({ purchase_item_id: batch.id, quantity: take, unit_price: Number(batch.price) })
        remaining -= take
      }
    }

    return { total_allocated: quantityNeeded - remaining, allocations }
  }

  async deallocateAllocations(
    allocations: Array<{ purchase_item_id: number; quantity: number }>,
    tenant_id: number
  ): Promise<void> {
    for (const alloc of allocations) {
      await this.database
        .update(purchase_items)
        .set({ quantity_used_for_repair: sql`${purchase_items.quantity_used_for_repair} - ${alloc.quantity}` as any })
        .where(and(eq(purchase_items.id, alloc.purchase_item_id), eq(purchase_items.tenant_id, tenant_id)))
    }
  }

  async deletePurchase(id: number, tenant_id?: number): Promise<{ id: number }> {
    // First delete related items
    await this.database
      .delete(purchase_items)
      .where(and(
        eq(purchase_items.purchase_id, id),
        ...(typeof tenant_id === 'number' ? [eq(purchase_items.tenant_id, tenant_id)] : [])
      ));

    await this.database
      .delete(received_items)
      .where(and(
        eq(received_items.purchase_id, id),
        ...(typeof tenant_id === 'number' ? [eq(received_items.tenant_id, tenant_id)] : [])
      ));

    // Then delete the purchase
    const conditions = [eq(purchases.id, id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(purchases.tenant_id, tenant_id));
    }

    await this.database.delete(purchases).where(and(...conditions));
    return { id };
  }

  // Helpers
  private isImei(identifier: string): boolean {
    // Heuristic: IMEI is all digits and length between 14 and 17
    return /^[0-9]{14,17}$/.test(identifier)
  }

  private async findDeviceByIdentifier(identifier: string, tenant_id: number): Promise<{ id: number } | undefined> {
    const [foundByImei] = await this.database
      .select({ id: devices.id })
      .from(devices)
      .where(and(eq(devices.tenant_id, tenant_id), eq(devices.imei, identifier)))
    if (foundByImei) return foundByImei

    const [foundBySerial] = await this.database
      .select({ id: devices.id })
      .from(devices)
      .where(and(eq(devices.tenant_id, tenant_id), eq(devices.serial, identifier)))
    return foundBySerial
  }

  private async ensureDeviceForIdentifier(sku: string, identifier: string, tenant_id: number, warehouse_id?: number): Promise<number> {
    const existing = await this.findDeviceByIdentifier(identifier, tenant_id)
    if (existing) return existing.id

    // Try to get specs for SKU (gracefully handle environments without sku_specs table)
    let spec: any | undefined
    try {
      ;[spec] = await this.database.select().from(sku_specs).where(eq(sku_specs.sku, sku))
    } catch (e) {
      // Missing table or other non-critical error: proceed without spec enrichment
      spec = undefined
    }

    const values: any = {
      sku,
      lpn: '',
      make: spec?.make ?? '',
      model_no: spec?.model_no ?? '',
      model_name: spec?.model_name ?? '',
      storage: spec?.storage ?? '',
      memory: spec?.memory ?? '',
      color: spec?.color ?? '',
      device_type: spec?.device_type ?? 'iPhone',
      serial: this.isImei(identifier) ? '' : identifier,
      imei: this.isImei(identifier) ? identifier : null, // Use null instead of empty string
      imei2: '',
      guid: '',
      description: '',
      tenant_id,
      warehouse_id: warehouse_id || 1, // Add warehouse_id, default to 1 if not provided
    }

    try {
      const [insert] = await this.database.insert(devices).values(values)
      if (insert.insertId) return Number(insert.insertId)
    } catch (e) {
      // Attempt minimal insert fallback
      const minimalValues: any = {
        sku,
        lpn: '',
        make: '',
        model_no: '',
        model_name: '',
        storage: '',
        memory: '',
        color: '',
        device_type: 'iPhone',
        serial: this.isImei(identifier) ? '' : identifier,
        imei: this.isImei(identifier) ? identifier : null, // Use null instead of empty string
        imei2: '',
        guid: '',
        description: '',
        tenant_id,
        warehouse_id: warehouse_id || 1, // Add warehouse_id to fallback as well
      }
      const [fallbackInsert] = await this.database.insert(devices).values(minimalValues)
      if (fallbackInsert.insertId) return Number(fallbackInsert.insertId)
    }

    // Fallback: query back by identifier
    const created = await this.findDeviceByIdentifier(identifier, tenant_id)
    if (!created) throw new Error('Failed to create device for identifier')
    return created.id
  }

  private async ensureStockExistsForSku(skuValue: string, tenant_id: number, warehouse_id: number, is_part: boolean): Promise<void> {
    const [existing] = await this.database
      .select({ id: stock.id })
      .from(stock)
      .where(and(
        eq(stock.sku, skuValue), 
        eq(stock.tenant_id, tenant_id),
        eq(stock.warehouse_id, warehouse_id)
      ))
    if (existing) return

    try {
      await this.database.insert(stock).values({
        sku: skuValue,
        warehouse_id,
        quantity: 0,
        tenant_id,
        is_part,
      })
    } catch (error: any) {
      // If SKU already exists globally but not for this warehouse, that's a schema issue
      // For now, check if it exists and use the existing record
      if (error.code === 'ER_DUP_ENTRY') {
        const [existingGlobal] = await this.database
          .select({ id: stock.id })
          .from(stock)
          .where(eq(stock.sku, skuValue))
        
        if (existingGlobal) {
          // Update the existing record to match our warehouse if needed
          await this.database
            .update(stock)
            .set({ warehouse_id, tenant_id })
            .where(eq(stock.sku, skuValue))
        } else {
          throw error
        }
      } else {
        throw error
      }
    }
  }

  private getSortColumn(sortBy?: string): any {
    switch (sortBy) {
      case 'purchase_order_no':
        return purchases.purchase_order_no;
      case 'supplier_name':
        return purchases.supplier_name;
      case 'expected_delivery_date':
        return purchases.expected_delivery_date;
      case 'customer_name':
        return purchases.customer_name;
      case 'tracking_number':
        return purchases.tracking_number;
      case 'created_at':
      default:
        return purchases.created_at;
    }
  }
}
