import { db } from '../../src/db'
import { roles, users, warehouses, tenants, stock, stock_movements, purchases, purchase_items, transfers, transfer_items, devices, repair_reasons, sku_specs, system_config } from '../../src/db/circtek.schema'
import { eq, sql, and } from 'drizzle-orm'

export const resetDb = async () => {
	// Query table list with stable alias to avoid driver casing
	const result = await db.execute(sql`SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' AND table_name <> '__drizzle_migrations'`)
	// Handle driver returning [rows, fields] vs rows only
	const rows = Array.isArray(result) && Array.isArray((result as any)[0]) ? (result as any)[0] : (result as any)
	await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`)
	for (const row of rows as Array<any>) {
		const name = row?.name || row?.TABLE_NAME || row?.table_name
		if (!name) continue
		await db.execute(sql.raw(`TRUNCATE TABLE \`${name}\``))
	}
	await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`)
}

export const ensureRole = async (name: string) => {
	const [existing] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, name))
	if (existing) return existing.id
	await db.insert(roles).values({ name, description: `${name} role` })
	const [created] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, name))
	return created!.id
}

export const ensureTenant = async (name: string) => {
	const [existing] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.name, name))
	if (existing) return existing.id
	await db.insert(tenants).values({ name, description: `${name} tenant` })
	const [created] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.name, name))
	return created!.id
}



export const ensureWarehouse = async (name: string, tenantId: number) => {
	const [existing] = await db.select({ id: warehouses.id }).from(warehouses).where(eq(warehouses.name, name))
	if (existing) return existing.id
	await db.insert(warehouses).values({ name, description: `${name} warehouse`, tenant_id: tenantId })
	const [created] = await db.select({ id: warehouses.id }).from(warehouses).where(eq(warehouses.name, name))
	return created!.id
}

export const createStock = async (sku: string, warehouseId: number, quantity: number, tenantId: number, isPart: boolean = false) => {
	// Check if stock already exists and update instead of insert to avoid duplicate key error
	const [existingStock] = await db.select().from(stock).where(and(eq(stock.sku, sku), eq(stock.warehouse_id, warehouseId), eq(stock.tenant_id, tenantId)))
	if (existingStock) {
		await db.update(stock).set({ quantity }).where(eq(stock.id, existingStock.id))
		return existingStock.id
	}

	const [result] = await db.insert(stock).values({
		sku,
		warehouse_id: warehouseId,
		quantity,
		tenant_id: tenantId,
		is_part: isPart
	})
	return Number(result.insertId)
}

export const createDevice = async (sku: string, serial: string, tenantId: number, warehouseId: number = 1) => {
	// Create stock first if it doesn't exist (required for foreign key constraint)
	const [existingStock] = await db.select().from(stock).where(and(eq(stock.sku, sku), eq(stock.tenant_id, tenantId)))
	if (!existingStock) {
		await db.insert(stock).values({
			sku,
			quantity: 1,
			warehouse_id: warehouseId,
			tenant_id: tenantId,
			is_part: false
		})
	}

	const [result] = await db.insert(devices).values({
		sku,
		lpn: `LPN-${Date.now()}-${Math.random()}`,
		make: 'Apple',
		model_no: 'iPhone-15',
		model_name: 'iPhone 15',
		storage: '128GB',
		color: 'Black',
		device_type: 'iPhone',
		serial,
		imei: `${Date.now()}${Math.random()}`,
		description: 'Test device',
		tenant_id: tenantId,
		warehouse_id: warehouseId // Add the missing warehouse_id field
	})
	return Number(result.insertId)
}

export const createSkuSpec = async (sku: string, tenantId: number, overrides: Partial<{ make: string, model_no: string, model_name: string, storage: string, memory: string, color: string, device_type: 'iPhone'|'Macbook'|'Airpods'|'Android' }> = {}) => {
    try {
        const [existing] = await db.select().from(sku_specs).where(eq(sku_specs.sku, sku))
        if (existing) return existing.id
        const [result] = await db.insert(sku_specs).values({
            sku,
            make: overrides.make ?? 'Apple',
            model_no: overrides.model_no ?? 'A0000',
            model_name: overrides.model_name ?? 'Model X',
            storage: overrides.storage ?? '64GB',
            memory: overrides.memory ?? '4GB',
            color: overrides.color ?? 'Black',
            device_type: overrides.device_type ?? 'iPhone',
            tenant_id: tenantId
        })
        return Number(result.insertId)
    } catch (e) {
        // Table might not exist in test DB; ignore and return -1 to indicate no spec row
        return -1
    }
}

export const getDeviceById = async (id: number) => {
    const [row] = await db.select().from(devices).where(eq(devices.id, id))
    return row
}

export const ensureRepairReason = async (name: string, tenantId: number) => {
    const [existing] = await db.select({ id: repair_reasons.id }).from(repair_reasons).where(eq(repair_reasons.name, name))
    if (existing) return existing.id
    const [result] = await db.insert(repair_reasons).values({ name, description: `${name} repair`, tenant_id: tenantId })
    return Number(result.insertId)
}

export const createPurchase = async (tenantId: number, warehouseId?: number) => {
	// If no warehouse provided, create a default one
	const finalWarehouseId = warehouseId || await ensureWarehouse('Default-WH', tenantId)
	
	const [result] = await db.insert(purchases).values({
		purchase_order_no: `PO-${Date.now()}`,
		supplier_name: 'Test Supplier',
		supplier_order_no: `SO-${Date.now()}`,
		expected_delivery_date: new Date(),
		warehouse_id: finalWarehouseId,
		tenant_id: tenantId
	})
	return Number(result.insertId)
}

export const createPurchaseItem = async (purchaseId: number, sku: string, quantity: number, price: number, tenantId: number) => {
	const [result] = await db.insert(purchase_items).values({
		purchase_id: purchaseId,
		sku,
		quantity,
		price: price.toString(),
		tenant_id: tenantId
	})
	return Number(result.insertId)
}

export const createTransfer = async (fromWarehouseId: number, toWarehouseId: number, tenantId: number, createdBy: number) => {
	const [result] = await db.insert(transfers).values({
		from_warehouse_id: fromWarehouseId,
		to_warehouse_id: toWarehouseId,
		status: false, // pending
		created_by: createdBy,
		tenant_id: tenantId
	})
	return Number(result.insertId)
}

export const createTransferItem = async (transferId: number, sku: string, deviceId: number, tenantId: number) => {
	const [result] = await db.insert(transfer_items).values({
		transfer_id: transferId,
		sku,
		device_id: deviceId,
		quantity: 1,
		tenant_id: tenantId
	})
	return Number(result.insertId)
}

