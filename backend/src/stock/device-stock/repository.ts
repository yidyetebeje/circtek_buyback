import { and, count, eq, like, or, desc, asc, sql } from "drizzle-orm";
import { stock_device_ids, devices, stock, warehouses, device_events } from "../../db/circtek.schema";

import { DeviceStockQueryInput, DeviceStockItem, DeviceStockListResult, DeviceStockFilters } from "./types";
import { db } from "../../db/index";

export class DeviceStockRepository {
    constructor(private readonly database: typeof db) { }

    /**
     * Get paginated list of devices in stock with filtering
     */
    async findAll(filters: DeviceStockQueryInput & { tenantId?: number }): Promise<DeviceStockListResult> {
        const conditions: any[] = [];

        // Tenant scoping
        if (typeof filters.tenantId === 'number') {
            conditions.push(eq(stock_device_ids.tenant_id, filters.tenantId));
        }

        // Warehouse filter
        if (typeof filters.warehouseId === 'number') {
            conditions.push(eq(stock.warehouse_id, filters.warehouseId));
        }

        // Shop filter - find warehouses belonging to the shop
        if (typeof filters.shopId === 'number') {
            conditions.push(eq(warehouses.shop_id, filters.shopId));
        }

        // Search by IMEI or serial
        if (filters.search) {
            const pattern = `%${filters.search}%`;
            conditions.push(
                or(
                    like(devices.imei, pattern),
                    like(devices.serial, pattern)
                )
            );
        }

        // Model name filter
        if (filters.modelName) {
            conditions.push(eq(devices.model_name, filters.modelName));
        }

        // Storage filter
        if (filters.storage) {
            conditions.push(eq(devices.storage, filters.storage));
        }

        // Color filter
        if (filters.colorName) {
            conditions.push(
                or(
                    eq(devices.color, filters.colorName),
                    eq(devices.edited_color, filters.colorName)
                )
            );
        }

        // SKU filter
        if (filters.sku) {
            conditions.push(eq(stock.sku, filters.sku));
        }

        // Grade filter
        if (filters.grade) {
            conditions.push(eq(devices.grade, filters.grade));
        }

        // Pagination
        const page = Math.max(1, filters.page ?? 1);
        const limit = Math.max(1, Math.min(100, filters.limit ?? 20));
        const offset = (page - 1) * limit;

        // Sorting
        const sortColumn = this.getSortColumn(filters.sortBy);
        const sortDirection = filters.sortDirection === 'asc' ? asc : desc;

        // Build WHERE clause
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count
        const [countResult] = await this.database
            .select({ total: count() })
            .from(stock_device_ids)
            .innerJoin(stock, eq(stock_device_ids.stock_id, stock.id))
            .innerJoin(devices, eq(stock_device_ids.device_id, devices.id))
            .innerJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
            .where(whereClause);

        const total = countResult?.total ?? 0;

        // Get paginated data
        const rows = await this.database
            .select({
                id: stock_device_ids.id,
                deviceId: devices.id,
                imei: devices.imei,
                serial: devices.serial,
                sku: stock.sku,
                grade: devices.grade,
                modelName: devices.model_name,
                storage: devices.storage,
                color: devices.color,
                editedColor: devices.edited_color,
                warehouseId: warehouses.id,
                warehouseName: warehouses.name,
                createdAt: stock_device_ids.created_at,
            })
            .from(stock_device_ids)
            .innerJoin(stock, eq(stock_device_ids.stock_id, stock.id))
            .innerJoin(devices, eq(stock_device_ids.device_id, devices.id))
            .innerJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
            .where(whereClause)
            .orderBy(sortDirection(sortColumn))
            .limit(limit)
            .offset(offset);

        // Check for dead status by looking at device events
        const deviceIds = rows.map(r => r.deviceId);

        // Get dead status for all devices in one query
        const deadDeviceIds = new Set<number>();
        if (deviceIds.length > 0) {
            const deadEvents = await this.database
                .select({ deviceId: device_events.device_id })
                .from(device_events)
                .where(
                    and(
                        sql`${device_events.device_id} IN (${sql.join(deviceIds.map(id => sql`${id}`), sql`, `)})`,
                        eq(device_events.event_type, 'DEAD_IMEI'),
                        eq(device_events.status, true)
                    )
                );

            deadEvents.forEach(e => {
                if (e.deviceId) deadDeviceIds.add(e.deviceId);
            });
        }

        // Transform data to match expected output
        const data: DeviceStockItem[] = rows.map(row => ({
            id: row.id,
            deviceId: row.deviceId,
            imei: row.imei,
            serial: row.serial,
            sku: row.sku,
            grade: row.grade,
            modelName: row.modelName,
            storage: row.storage,
            colorName: row.editedColor || row.color,
            warehouseId: row.warehouseId,
            warehouseName: row.warehouseName,
            isDead: deadDeviceIds.has(row.deviceId),
            createdAt: row.createdAt?.toISOString() ?? null,
        }));

        // Apply isDead filter post-query (since it requires checking device_events)
        let filteredData = data;
        if (typeof filters.isDead === 'boolean') {
            filteredData = data.filter(d => d.isDead === filters.isDead);
        }

        return {
            data: filteredData,
            meta: {
                total: typeof filters.isDead === 'boolean' ? filteredData.length : total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get a single device stock item by ID
     */
    async findById(id: number, tenantId?: number): Promise<DeviceStockItem | null> {
        const conditions: any[] = [eq(stock_device_ids.id, id)];

        if (typeof tenantId === 'number') {
            conditions.push(eq(stock_device_ids.tenant_id, tenantId));
        }

        const [row] = await this.database
            .select({
                id: stock_device_ids.id,
                deviceId: devices.id,
                imei: devices.imei,
                serial: devices.serial,
                sku: stock.sku,
                grade: devices.grade,
                modelName: devices.model_name,
                storage: devices.storage,
                color: devices.color,
                editedColor: devices.edited_color,
                warehouseId: warehouses.id,
                warehouseName: warehouses.name,
                createdAt: stock_device_ids.created_at,
            })
            .from(stock_device_ids)
            .innerJoin(stock, eq(stock_device_ids.stock_id, stock.id))
            .innerJoin(devices, eq(stock_device_ids.device_id, devices.id))
            .innerJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
            .where(and(...conditions));

        if (!row) return null;

        // Check dead status
        const [deadEvent] = await this.database
            .select({ id: device_events.id })
            .from(device_events)
            .where(
                and(
                    eq(device_events.device_id, row.deviceId),
                    eq(device_events.event_type, 'DEAD_IMEI'),
                    eq(device_events.status, true)
                )
            )
            .limit(1);

        return {
            id: row.id,
            deviceId: row.deviceId,
            imei: row.imei,
            serial: row.serial,
            sku: row.sku,
            grade: row.grade,
            modelName: row.modelName,
            storage: row.storage,
            colorName: row.editedColor || row.color,
            warehouseId: row.warehouseId,
            warehouseName: row.warehouseName,
            isDead: !!deadEvent,
            createdAt: row.createdAt?.toISOString() ?? null,
        };
    }

    /**
     * Get available filter options based on current stock
     */
    async getFilters(params: { warehouseId?: number; shopId?: number; isDead?: boolean; tenantId?: number }): Promise<DeviceStockFilters> {
        const conditions: any[] = [];

        if (typeof params.tenantId === 'number') {
            conditions.push(eq(stock_device_ids.tenant_id, params.tenantId));
        }

        if (typeof params.warehouseId === 'number') {
            conditions.push(eq(stock.warehouse_id, params.warehouseId));
        }

        if (typeof params.shopId === 'number') {
            conditions.push(eq(warehouses.shop_id, params.shopId));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get distinct values for each filter
        const [modelNames, storageValues, colorNames, skus, grades] = await Promise.all([
            this.database
                .selectDistinct({ value: devices.model_name })
                .from(stock_device_ids)
                .innerJoin(stock, eq(stock_device_ids.stock_id, stock.id))
                .innerJoin(devices, eq(stock_device_ids.device_id, devices.id))
                .innerJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
                .where(whereClause),

            this.database
                .selectDistinct({ value: devices.storage })
                .from(stock_device_ids)
                .innerJoin(stock, eq(stock_device_ids.stock_id, stock.id))
                .innerJoin(devices, eq(stock_device_ids.device_id, devices.id))
                .innerJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
                .where(whereClause),

            this.database
                .selectDistinct({ value: devices.color })
                .from(stock_device_ids)
                .innerJoin(stock, eq(stock_device_ids.stock_id, stock.id))
                .innerJoin(devices, eq(stock_device_ids.device_id, devices.id))
                .innerJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
                .where(whereClause),

            this.database
                .selectDistinct({ value: stock.sku })
                .from(stock_device_ids)
                .innerJoin(stock, eq(stock_device_ids.stock_id, stock.id))
                .innerJoin(devices, eq(stock_device_ids.device_id, devices.id))
                .innerJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
                .where(whereClause),

            this.database
                .selectDistinct({ value: devices.grade })
                .from(stock_device_ids)
                .innerJoin(stock, eq(stock_device_ids.stock_id, stock.id))
                .innerJoin(devices, eq(stock_device_ids.device_id, devices.id))
                .innerJoin(warehouses, eq(stock.warehouse_id, warehouses.id))
                .where(whereClause),
        ]);

        return {
            modelNames: modelNames.map(m => m.value).filter((v): v is string => v !== null),
            storage: storageValues.map(s => s.value).filter((v): v is string => v !== null),
            colorNames: colorNames.map(c => c.value).filter((v): v is string => v !== null),
            skus: skus.map(s => s.value).filter((v): v is string => v !== null),
            grades: grades.map(g => g.value).filter((v): v is string => v !== null),
        };
    }

    private getSortColumn(sortBy?: string): any {
        switch (sortBy) {
            case 'imei':
                return devices.imei;
            case 'serial':
                return devices.serial;
            case 'sku':
                return stock.sku;
            case 'modelName':
                return devices.model_name;
            case 'storage':
                return devices.storage;
            case 'colorName':
                return devices.color;
            case 'grade':
                return devices.grade;
            case 'warehouseName':
                return warehouses.name;
            case 'createdAt':
            default:
                return stock_device_ids.created_at;
        }
    }
}

// Export singleton instance
export const deviceStockRepository = new DeviceStockRepository(db);
