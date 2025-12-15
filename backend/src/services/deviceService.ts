import { db } from "../db";
import { devices, stock, stock_movements, sku_specs, stock_device_ids } from "../db/circtek.schema";
import { eq, and, sql } from "drizzle-orm";

export interface AddDeviceParams {
  imei: string;
  sku: string;
  serial?: string;
  warehouse_id: number;
  tenant_id: number;
  order_id?: number;
  lpn?: string;
  make?: string;
  model_no?: string;
  model_name?: string;
  storage?: string;
  memory?: string;
  color?: string;
  device_type?: 'iPhone' | 'Macbook' | 'Airpods' | 'Android';
  guid?: string;
  description?: string;
}

export interface StockCheckResult {
  inStock: boolean;
  quantity: number;
  sku: string;
  warehouse_id: number;
  stockRecord?: any;
}

/**
 * Device service for managing device inventory and stock operations
 * Handles device creation, stock checking, and inventory management
 */
export class DeviceService {

  /**
   * Check if a device SKU is in stock at a specific warehouse
   * @param sku The SKU to check
   * @param warehouseId The warehouse ID to check stock in
   * @param tenantId The tenant ID for scoping
   * @param minQuantity Minimum quantity required (default: 1)
   * @returns Stock check result with availability and quantity
   */
  async checkStock(
    sku: string,
    warehouseId: number,
    tenantId: number,
    minQuantity: number = 1
  ): Promise<StockCheckResult> {
    try {
      const stockRecord = await db
        .select()
        .from(stock)
        .where(
          and(
            eq(stock.sku, sku),
            eq(stock.warehouse_id, warehouseId),
            eq(stock.tenant_id, tenantId),
            eq(stock.status, true)
          )
        )
        .limit(1);

      if (stockRecord.length === 0) {
        return {
          inStock: false,
          quantity: 0,
          sku,
          warehouse_id: warehouseId
        };
      }

      const currentStock = stockRecord[0];
      const isInStock = currentStock.quantity >= minQuantity;

      return {
        inStock: isInStock,
        quantity: currentStock.quantity,
        sku,
        warehouse_id: warehouseId,
        stockRecord: currentStock
      };
    } catch (error) {
      console.error("[DeviceService] Error checking stock:", error);
      throw new Error(`Failed to check stock for SKU ${sku}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Add a new device to inventory and update stock levels
   * @param params Device parameters
   * @returns The created device record
   */
  async addDevice(params: AddDeviceParams): Promise<any> {
    try {
      // Start a transaction to ensure data consistency
      return await db.transaction(async (tx) => {
        // First, get SKU specifications if available
        let skuSpecs = null;
        if (params.sku) {
          const specs = await tx
            .select()
            .from(sku_specs)
            .where(
              and(
                eq(sku_specs.sku, params.sku),
                eq(sku_specs.tenant_id, params.tenant_id),
                eq(sku_specs.status, true)
              )
            )
            .limit(1);

          if (specs.length > 0) {
            skuSpecs = specs[0];
          }
        }

        // Check if device with same IMEI already exists for this tenant
        const existingDevice = await tx
          .select()
          .from(devices)
          .where(
            and(
              eq(devices.imei, params.imei),
              eq(devices.tenant_id, params.tenant_id)
            )
          )
          .limit(1);

        let deviceId: number;
        let deviceRecord: any;

        if (existingDevice.length > 0) {
          // Device already exists, use the existing record
          deviceRecord = existingDevice[0];
          deviceId = deviceRecord.id;
          console.log(`[DeviceService] Device with IMEI ${params.imei} already exists, checking stock status`);
        } else {
          // Create the device record, using SKU specs as fallback for missing data
          const deviceData = {
            sku: params.sku,
            lpn: params.lpn,
            make: params.make || skuSpecs?.make,
            model_no: params.model_no || skuSpecs?.model_no,
            model_name: params.model_name || skuSpecs?.model_name,
            storage: params.storage || skuSpecs?.storage,
            memory: params.memory || skuSpecs?.memory,
            color: params.color || skuSpecs?.color,
            device_type: params.device_type || skuSpecs?.device_type,
            serial: params.serial,
            imei: params.imei,
            guid: params.guid,
            description: params.description,
            tenant_id: params.tenant_id,
            warehouse_id: params.warehouse_id,
            status: true
          };

          const [newDevice] = await tx
            .insert(devices)
            .values(deviceData)
            .$returningId();

          deviceId = newDevice.id;

          // Fetch the complete device record
          const completeDevice = await tx
            .select()
            .from(devices)
            .where(eq(devices.id, deviceId))
            .limit(1);

          deviceRecord = completeDevice[0];
        }

        // Check if device is already in stock_device_ids
        if (params.sku) {
          const existingStockEntry = await tx
            .select()
            .from(stock_device_ids)
            .where(
              and(
                eq(stock_device_ids.device_id, deviceId),
                eq(stock_device_ids.tenant_id, params.tenant_id)
              )
            )
            .limit(1);

          // Only add to stock if device is not already tracked
          if (existingStockEntry.length === 0) {
            const stockId = await this.updateStockForDevice(tx, params.sku, params.warehouse_id, params.tenant_id, 1);

            // Record stock movement
            await tx.insert(stock_movements).values({
              sku: params.sku,
              warehouse_id: params.warehouse_id,
              delta: 1,
              reason: 'buyback',
              ref_type: 'order',
              ref_id: params.order_id || deviceId,
              actor_id: 1, // TODO: Get actual user ID from context
              tenant_id: params.tenant_id,
              status: true
            });

            // Add device to stock_device_ids for tracking
            if (stockId) {
              await tx.insert(stock_device_ids).values({
                stock_id: stockId,
                device_id: deviceId,
                tenant_id: params.tenant_id
              });
            }
            console.log(`[DeviceService] Device ${params.imei} added to stock`);
          } else {
            console.log(`[DeviceService] Device ${params.imei} is already in stock, skipping stock update`);
          }
        }

        return deviceRecord;
      });
    } catch (error) {
      console.error("[DeviceService] Error adding device:", error);
      throw new Error(`Failed to add device: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Update stock levels for a device SKU
   * @param tx Database transaction
   * @param sku The SKU to update
   * @param warehouseId The warehouse ID
   * @param tenantId The tenant ID
   * @param delta The quantity change (positive for increase, negative for decrease)
   */
  /**
   * Update stock levels for a device SKU
   * @param tx Database transaction
   * @param sku The SKU to update
   * @param warehouseId The warehouse ID
   * @param tenantId The tenant ID
   * @param delta The quantity change (positive for increase, negative for decrease)
   * @returns The stock ID
   */
  private async updateStockForDevice(
    tx: any,
    sku: string,
    warehouseId: number,
    tenantId: number,
    delta: number
  ): Promise<number | null> {
    // Check if stock record exists
    const existingStock = await tx
      .select()
      .from(stock)
      .where(
        and(
          eq(stock.sku, sku),
          eq(stock.warehouse_id, warehouseId),
          eq(stock.tenant_id, tenantId)
        )
      )
      .limit(1);

    if (existingStock.length > 0) {
      // Update existing stock
      await tx
        .update(stock)
        .set({
          quantity: sql`quantity + ${delta}`,
          updated_at: sql`CURRENT_TIMESTAMP`
        })
        .where(
          and(
            eq(stock.sku, sku),
            eq(stock.warehouse_id, warehouseId),
            eq(stock.tenant_id, tenantId)
          )
        );
      return existingStock[0].id;
    } else {
      // Create new stock record
      const [newStock] = await tx.insert(stock).values({
        sku,
        warehouse_id: warehouseId,
        tenant_id: tenantId,
        quantity: Math.max(0, delta), // Ensure non-negative quantity
        is_part: false,
        status: true
      }).$returningId();
      return newStock.id;
    }
  }

  /**
   * Get device by IMEI
   * @param imei The IMEI to search for
   * @param tenantId The tenant ID for scoping
   * @returns The device record if found
   */
  async getDeviceByImei(imei: string, tenantId: number): Promise<any | null> {
    try {
      const device = await db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.imei, imei),
            eq(devices.tenant_id, tenantId),
            eq(devices.status, true)
          )
        )
        .limit(1);

      return device.length > 0 ? device[0] : null;
    } catch (error) {
      console.error("[DeviceService] Error getting device by IMEI:", error);
      throw new Error(`Failed to get device by IMEI: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get device by serial number
   * @param serial The serial number to search for
   * @param tenantId The tenant ID for scoping
   * @returns The device record if found
   */
  async getDeviceBySerial(serial: string, tenantId: number): Promise<any | null> {
    try {
      const device = await db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.serial, serial),
            eq(devices.tenant_id, tenantId),
            eq(devices.status, true)
          )
        )
        .limit(1);

      return device.length > 0 ? device[0] : null;
    } catch (error) {
      console.error("[DeviceService] Error getting device by serial:", error);
      throw new Error(`Failed to get device by serial: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get devices by SKU and warehouse
   * @param sku The SKU to search for
   * @param warehouseId The warehouse ID
   * @param tenantId The tenant ID for scoping
   * @returns Array of device records
   */
  async getDevicesBySku(sku: string, warehouseId: number, tenantId: number): Promise<any[]> {
    try {
      const deviceList = await db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.sku, sku),
            eq(devices.warehouse_id, warehouseId),
            eq(devices.tenant_id, tenantId),
            eq(devices.status, true)
          )
        );

      return deviceList;
    } catch (error) {
      console.error("[DeviceService] Error getting devices by SKU:", error);
      throw new Error(`Failed to get devices by SKU: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Check if a device exists by IMEI
   * @param imei The IMEI to check
   * @param tenantId The tenant ID for scoping
   * @returns True if device exists, false otherwise
   */
  async deviceExists(imei: string, tenantId: number): Promise<boolean> {
    try {
      const device = await this.getDeviceByImei(imei, tenantId);
      return device !== null;
    } catch (error) {
      console.error("[DeviceService] Error checking device existence:", error);
      return false;
    }
  }

  /**
   * Check if a device is currently in stock using the stock_device_ids table
   * @param imei The IMEI to check
   * @param tenantId The tenant ID for scoping
   * @returns True if device is in stock, false otherwise
   */
  async isDeviceInStockByImei(imei: string, tenantId: number): Promise<boolean> {
    try {
      // First find the device by IMEI
      const device = await this.getDeviceByImei(imei, tenantId);
      if (!device) {
        return false;
      }

      // Check if device exists in stock_device_ids
      const stockEntry = await db
        .select({ id: stock_device_ids.id })
        .from(stock_device_ids)
        .where(
          and(
            eq(stock_device_ids.device_id, device.id),
            eq(stock_device_ids.tenant_id, tenantId)
          )
        )
        .limit(1);

      return stockEntry.length > 0;
    } catch (error) {
      console.error("[DeviceService] Error checking if device is in stock by IMEI:", error);
      return false;
    }
  }

  /**
   * Check if a device is currently in stock by serial using the stock_device_ids table
   * @param serial The serial number to check
   * @param tenantId The tenant ID for scoping
   * @returns True if device is in stock, false otherwise
   */
  async isDeviceInStockBySerial(serial: string, tenantId: number): Promise<boolean> {
    try {
      // First find the device by serial
      const device = await this.getDeviceBySerial(serial, tenantId);
      if (!device) {
        return false;
      }

      // Check if device exists in stock_device_ids
      const stockEntry = await db
        .select({ id: stock_device_ids.id })
        .from(stock_device_ids)
        .where(
          and(
            eq(stock_device_ids.device_id, device.id),
            eq(stock_device_ids.tenant_id, tenantId)
          )
        )
        .limit(1);

      return stockEntry.length > 0;
    } catch (error) {
      console.error("[DeviceService] Error checking if device is in stock by serial:", error);
      return false;
    }
  }
}

// Export a singleton instance
export const deviceService = new DeviceService();
