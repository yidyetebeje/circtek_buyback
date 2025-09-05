import { describe, it, expect, beforeEach } from 'bun:test'
import { buildApp } from '../src/app'
import { ensureRole, ensureTenant, ensureWarehouse, resetDb, createStock } from './utils/db'
import { getToken } from './utils/auth'

describe('Stock routes', () => {
	beforeEach(async () => {
		await resetDb()
		await ensureRole('super_admin')
		await ensureRole('stock_manager')
		await ensureTenant('t1')
	})

	it('should require auth for stock operations', async () => {
		const app = buildApp()
		const server = app.handle

		const unauth = await server(new Request('http://localhost/api/v1/stock/stock'))
		expect(unauth.status).toBe(401)
	})

	it('should list stock with filtering and pagination', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		// Create test stock data
		await createStock('SKU001', warehouseId, 100, tenantId, false)
		await createStock('SKU002', warehouseId, 5, tenantId, true)

		// Test basic list
		const list = await server(new Request('http://localhost/api/v1/stock/stock', { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(list.status).toBe(200)
		const listBody = await list.json()
		expect(listBody.status).toBe(200)
		expect(listBody.data).toBeInstanceOf(Array)
		expect(listBody.data.length).toBe(2)

		// Test filtering by warehouse
		const filtered = await server(new Request(`http://localhost/api/v1/stock/stock?warehouse_id=${warehouseId}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(filtered.status).toBe(200)
		const filteredBody = await filtered.json()
		expect(filteredBody.data.length).toBe(2)

		// Test filtering by is_part
		const partsOnly = await server(new Request('http://localhost/api/v1/stock/stock?is_part=true', { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(partsOnly.status).toBe(200)
		const partsBody = await partsOnly.json()
		expect(partsBody.data.length).toBe(1)
		expect(partsBody.data[0].sku).toBe('SKU002')
	})

	it('should get stock summary', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		// Create test stock data
		await createStock('SKU001', warehouseId, 100, tenantId, false)
		await createStock('SKU002', warehouseId, 3, tenantId, true) // Low stock

		const summary = await server(new Request('http://localhost/api/v1/stock/stock/summary', { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(summary.status).toBe(200)
		const summaryBody = await summary.json()
		expect(summaryBody.status).toBe(200)
		expect(summaryBody.data.total_skus).toBe(2)
		expect(summaryBody.data.total_quantity).toBe(103)
		expect(summaryBody.data.low_stock_items).toBe(1)
		expect(summaryBody.data.warehouses_count).toBe(1)
	})

	it('should get low stock items', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		// Create test stock data
		await createStock('SKU001', warehouseId, 100, tenantId, false)
		await createStock('SKU002', warehouseId, 3, tenantId, true) // Low stock
		await createStock('SKU003', warehouseId, 2, tenantId, false) // Low stock

		const lowStock = await server(new Request('http://localhost/api/v1/stock/stock/low-stock?threshold=5', { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(lowStock.status).toBe(200)
		const lowStockBody = await lowStock.json()
		expect(lowStockBody.status).toBe(200)
		expect(lowStockBody.data.length).toBe(2)
		expect(lowStockBody.data.find((item: any) => item.sku === 'SKU002')).toBeDefined()
		expect(lowStockBody.data.find((item: any) => item.sku === 'SKU003')).toBeDefined()
	})

	it('should get stock by SKU and warehouse', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		await createStock('SKU001', warehouseId, 50, tenantId, false)

		const stockBySku = await server(new Request(`http://localhost/api/v1/stock/stock/sku/SKU001/warehouse/${warehouseId}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(stockBySku.status).toBe(200)
		const stockBody = await stockBySku.json()
		expect(stockBody.status).toBe(200)
		expect(stockBody.data.sku).toBe('SKU001')
		expect(stockBody.data.quantity).toBe(50)
		expect(stockBody.data.warehouse_id).toBe(warehouseId)
	})

	it('should get specific stock record by ID', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		const stockId = await createStock('SKU001', warehouseId, 25, tenantId, false)

		const getStock = await server(new Request(`http://localhost/api/v1/stock/stock/${stockId}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(getStock.status).toBe(200)
		const stockBody = await getStock.json()
		expect(stockBody.status).toBe(200)
		expect(stockBody.data.id).toBe(stockId)
		expect(stockBody.data.sku).toBe('SKU001')
		expect(stockBody.data.quantity).toBe(25)
	})

	it('should create stock record manually', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		const create = await server(new Request('http://localhost/api/v1/stock/stock', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU-NEW', 
				warehouse_id: warehouseId, 
				quantity: 15, 
				is_part: false 
			})
		}))
		expect(create.status).toBe(200)
		const createBody = await create.json()
		expect(createBody.status).toBe(201)
		expect(createBody.data.sku).toBe('SKU-NEW')
		expect(createBody.data.quantity).toBe(15)
	})

	it('should update stock record', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		const stockId = await createStock('SKU001', warehouseId, 25, tenantId, false)

		const update = await server(new Request(`http://localhost/api/v1/stock/stock/${stockId}`, {
			method: 'PATCH', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ quantity: 35 })
		}))
		expect(update.status).toBe(200)
		const updateBody = await update.json()
		expect(updateBody.status).toBe(200)
		expect(updateBody.data.quantity).toBe(35)
	})

	it('should delete stock record', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		const stockId = await createStock('SKU001', warehouseId, 25, tenantId, false)

		const del = await server(new Request(`http://localhost/api/v1/stock/stock/${stockId}`, {
			method: 'DELETE', 
			headers: { authorization: `Bearer ${token}` }
		}))
		expect(del.status).toBe(200)
		const delBody = await del.json()
		expect(delBody.status).toBe(200)
	})

	it('should validate negative quantities', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		const create = await server(new Request('http://localhost/api/v1/stock/stock', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU-INVALID', 
				warehouse_id: warehouseId, 
				quantity: -10, 
				is_part: false 
			})
		}))
		expect(create.status).toBe(200)
		const createBody = await create.json()
		expect(createBody.status).toBe(400)
		expect(createBody.message).toBe('Quantity cannot be negative')
	})

	it('should forbid cross-tenant access for non super_admin', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenant1Id = await ensureTenant('t1')
		const tenant2Id = await ensureTenant('t2')
		const warehouse1Id = await ensureWarehouse('WH1', tenant1Id)
		const warehouse2Id = await ensureWarehouse('WH2', tenant2Id)

		// Create stock in tenant2 
		await createStock('SKU-T2', warehouse2Id, 50, tenant2Id, false)
		// Create stock in tenant1
		await createStock('SKU-T1', warehouse1Id, 30, tenant1Id, false)

		// User from tenant1 should only see tenant1 stock
		const list = await server(new Request('http://localhost/api/v1/stock/stock', { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const { data } = await list.json()
		expect(data.find((x: any) => x.sku === 'SKU-T2')).toBeUndefined()
		expect(data.find((x: any) => x.sku === 'SKU-T1')).toBeDefined()
	})
})
