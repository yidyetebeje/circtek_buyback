import { MySql2Database } from "drizzle-orm/mysql2";
import { eq, and, gte, lte, or, desc, sql } from "drizzle-orm";
import { repairs, repair_items, devices, repair_reasons, users, warehouses, tenants } from "../../db/circtek.schema";
import { RepairListResponse, DeviceRepairHistoryResponse } from "./types";

export class PowerBIRepository {
  constructor(private db: MySql2Database<any>) {}

  async getRepairsList(filters: {
    page?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
    warehouse_id?: number;
    actor_id?: number;
    tenant_id?: number;
    status?: boolean;
  }): Promise<{ data: RepairListResponse[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 50, start_date, end_date, warehouse_id, actor_id, tenant_id, status } = filters;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    
    if (start_date) {
      conditions.push(gte(repairs.created_at, new Date(start_date)));
    }
    
    if (end_date) {
      conditions.push(lte(repairs.created_at, new Date(end_date)));
    }
    
    if (warehouse_id) {
      conditions.push(eq(repairs.warehouse_id, warehouse_id));
    }
    
    if (actor_id) {
      conditions.push(eq(repairs.actor_id, actor_id));
    }
    
    if (tenant_id) {
      conditions.push(eq(repairs.tenant_id, tenant_id));
    }
    
    if (status !== undefined) {
      conditions.push(eq(repairs.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(repairs)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;

    // Get repairs with all joins
    const repairsData = await this.db
      .select({
        // Repair fields
        id: repairs.id,
        device_id: repairs.device_id,
        remarks: repairs.remarks,
        status: repairs.status,
        actor_id: repairs.actor_id,
        tenant_id: repairs.tenant_id,
        warehouse_id: repairs.warehouse_id,
        created_at: repairs.created_at,
        updated_at: repairs.updated_at,
        
        // Device fields
        device_sku: devices.sku,
        device_lpn: devices.lpn,
        device_serial: devices.serial,
        device_imei: devices.imei,
        
        // No global repair reason
        
        // Actor (user) fields
        actor_name: users.name,
        actor_user_name: users.user_name,
        actor_email: users.email,
        
        // Warehouse fields
        warehouse_name: warehouses.name,
        warehouse_description: warehouses.description,
        
        // Tenant fields
        tenant_name: tenants.name,
        tenant_description: tenants.description,
      })
      .from(repairs)
      .innerJoin(devices, eq(repairs.device_id, devices.id))
      // removed global reason join
      .innerJoin(users, eq(repairs.actor_id, users.id))
      .innerJoin(warehouses, eq(repairs.warehouse_id, warehouses.id))
      .innerJoin(tenants, eq(repairs.tenant_id, tenants.id))
      .where(whereClause)
      .orderBy(desc(repairs.created_at))
      .limit(limit)
      .offset(offset);

    // Get repair items for each repair
    const repairIds = repairsData.map(r => r.id);
    let repairItemsData: any[] = [];
    
    if (repairIds.length > 0) {
      repairItemsData = await this.db
        .select({
          repair_id: repair_items.repair_id,
          id: repair_items.id,
          sku: repair_items.sku,
          quantity: repair_items.quantity,
          cost: repair_items.cost,
          reason_id: repair_items.reason_id,
          reason_name: repair_reasons.name,
          purchase_items_id: repair_items.purchase_items_id,
          created_at: repair_items.created_at,
        })
        .from(repair_items)
        .innerJoin(repair_reasons, eq(repair_items.reason_id, repair_reasons.id))
        .where(sql`${repair_items.repair_id} IN (${repairIds.join(',')})`);
    }

    // Group repair items by repair_id
    const repairItemsMap = repairItemsData.reduce((acc, item) => {
      if (!acc[item.repair_id]) {
        acc[item.repair_id] = [];
      }
      acc[item.repair_id].push({
        id: item.id,
        sku: item.sku,
        quantity: item.quantity,
        cost: item.cost,
        reason_id: item.reason_id,
        reason_name: item.reason_name,
        purchase_items_id: item.purchase_items_id,
        created_at: item.created_at,
      });
      return acc;
    }, {} as Record<number, any[]>);

    // Combine repairs with their items
    const result: RepairListResponse[] = repairsData.map(repair => ({
      ...repair,
      repair_items: repairItemsMap[repair.id] || []
    }));

    return {
      data: result,
      total,
      page,
      limit
    };
  }

  async getDeviceRepairHistory(filters: {
    imei?: string;
    serial?: string;
    tenant_id?: number;
  }): Promise<DeviceRepairHistoryResponse | null> {
    const { imei, serial, tenant_id } = filters;

    if (!imei && !serial) {
      throw new Error('Either IMEI or serial number must be provided');
    }

    // Build device search conditions
    const deviceConditions = [];
    
    if (imei) {
      deviceConditions.push(eq(devices.imei, imei));
    }
    
    if (serial) {
      deviceConditions.push(eq(devices.serial, serial));
    }
    
    if (tenant_id) {
      deviceConditions.push(eq(devices.tenant_id, tenant_id));
    }

    const deviceWhereClause = deviceConditions.length > 0 ? and(...deviceConditions) : undefined;

    // Find the device first
    const deviceData = await this.db
      .select({
        id: devices.id,
        sku: devices.sku,
        lpn: devices.lpn,
        serial: devices.serial,
        imei: devices.imei,
      })
      .from(devices)
      .where(deviceWhereClause)
      .limit(1);

    if (deviceData.length === 0) {
      return null;
    }

    const device = deviceData[0];

    // Get all repairs for this device
    const repairsData = await this.db
      .select({
        // Repair fields
        id: repairs.id,
        device_id: repairs.device_id,
        remarks: repairs.remarks,
        status: repairs.status,
        actor_id: repairs.actor_id,
        tenant_id: repairs.tenant_id,
        warehouse_id: repairs.warehouse_id,
        created_at: repairs.created_at,
        updated_at: repairs.updated_at,
        
        // Device fields (same as device above, but included for consistency)
        device_sku: devices.sku,
        device_lpn: devices.lpn,
        device_make: devices.make,
        device_model_no: devices.model_no,
        device_model_name: devices.model_name,
        device_storage: devices.storage,
        device_memory: devices.memory,
        device_color: devices.color,
        device_type: devices.device_type,
        device_serial: devices.serial,
        device_imei: devices.imei,
        device_imei2: devices.imei2,
        device_description: devices.description,
        
        // Repair reason fields
        reason_name: repair_reasons.name,
        reason_description: repair_reasons.description,
        
        // Actor (user) fields
        actor_name: users.name,
        actor_user_name: users.user_name,
        actor_email: users.email,
        
        // Warehouse fields
        warehouse_name: warehouses.name,
        warehouse_description: warehouses.description,
        
        // Tenant fields
        tenant_name: tenants.name,
        tenant_description: tenants.description,
      })
      .from(repairs)
      .innerJoin(devices, eq(repairs.device_id, devices.id))
      // removed global reason join
      .innerJoin(users, eq(repairs.actor_id, users.id))
      .innerJoin(warehouses, eq(repairs.warehouse_id, warehouses.id))
      .innerJoin(tenants, eq(repairs.tenant_id, tenants.id))
      .where(eq(repairs.device_id, device.id))
      .orderBy(desc(repairs.created_at));

    // Get repair items for all repairs
    const repairIds = repairsData.map(r => r.id);
    let repairItemsData: any[] = [];
    
    if (repairIds.length > 0) {
      repairItemsData = await this.db
        .select({
          repair_id: repair_items.repair_id,
          id: repair_items.id,
          sku: repair_items.sku,
          quantity: repair_items.quantity,
          cost: repair_items.cost,
          reason_id: repair_items.reason_id,
          purchase_items_id: repair_items.purchase_items_id,
          created_at: repair_items.created_at,
        })
        .from(repair_items)
        .where(sql`${repair_items.repair_id} IN (${repairIds.join(',')})`);
    }

    // Group repair items by repair_id
    const repairItemsMap = repairItemsData.reduce((acc, item) => {
      if (!acc[item.repair_id]) {
        acc[item.repair_id] = [];
      }
      acc[item.repair_id].push({
        id: item.id,
        sku: item.sku,
        quantity: item.quantity,
        cost: item.cost,
        reason_id: item.reason_id,
        purchase_items_id: item.purchase_items_id,
        created_at: item.created_at,
      });
      return acc;
    }, {} as Record<number, any[]>);

    // Combine repairs with their items
    const repairsWithItems: RepairListResponse[] = repairsData.map(repair => ({
      ...repair,
      repair_items: repairItemsMap[repair.id] || []
    }));

    return {
      device,
      repairs: repairsWithItems
    };
  }
}
