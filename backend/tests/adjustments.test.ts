import { describe, it, expect, beforeEach } from 'bun:test'
import { buildApp } from '../src/app'
import { ensureRole, ensureTenant, ensureWarehouse, resetDb, createStock, createDevice } from './utils/db'
import { getToken } from './utils/auth'

describe('Stock Adjustments routes', () => {
	beforeEach(async () => {
		await resetDb()
		await ensureRole('super_admin')
		await ensureRole('stock_manager')
		await ensureTenant('t1')
	})

	it('should require auth for adjustment operations', async () => {
		const app = buildApp()
		const server = app.handle

		const unauth = await server(new Request('http://localhost/api/v1/stock/adjustments'))
		expect(unauth.status).toBe(401)
	})

	it('should create stock adjustment and update stock', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		// Create initial stock
		await createStock('SKU001', warehouseId, 50, tenantId, false)

		// Create positive adjustment
		const adjustment = await server(new Request('http://localhost/api/v1/stock/adjustments', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001',
				warehouse_id: warehouseId,
				quantity_adjustment: 25,
				reason: 'manual_correction',
				notes: 'Test adjustment',
				actor_id: userId
			})
		}))
		expect(adjustment.status).toBe(200)
		const adjustmentBody = await adjustment.json()
		expect(adjustmentBody.status).toBe(201)
		expect(adjustmentBody.data.adjustment.sku).toBe('SKU001')
		expect(adjustmentBody.data.adjustment.quantity_adjustment).toBe(25)
		expect(adjustmentBody.data.movement_created).toBe(true)
		expect(adjustmentBody.data.stock_updated).toBe(true)

		// Verify stock was updated
		const stock = await server(new Request(`http://localhost/api/v1/stock/stock/sku/SKU001/warehouse/${warehouseId}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const stockBody = await stock.json()
		expect(stockBody.data.quantity).toBe(75) // 50 + 25
	})

	it('should create negative adjustment (write-down)', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		await createStock('SKU001', warehouseId, 50, tenantId, false)

		// Create negative adjustment
		const adjustment = await server(new Request('http://localhost/api/v1/stock/adjustments', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001',
				warehouse_id: warehouseId,
				quantity_adjustment: -15,
				reason: 'inventory_loss',
				notes: 'Damaged items',
				actor_id: userId
			})
		}))
		expect(adjustment.status).toBe(200)
		const adjustmentBody = await adjustment.json()
		expect(adjustmentBody.status).toBe(201)
		expect(adjustmentBody.data.adjustment.quantity_adjustment).toBe(-15)

		// Verify stock was updated
		const stock = await server(new Request(`http://localhost/api/v1/stock/stock/sku/SKU001/warehouse/${warehouseId}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const stockBody = await stock.json()
		expect(stockBody.data.quantity).toBe(35) // 50 - 15
	})

	it('should create dead IMEI write-off', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)
		const deviceId = await createDevice('SKU001', 'DEAD-IMEI-001', tenantId, warehouseId)

		await createStock('SKU001', warehouseId, 10, tenantId, false)

		// Write off dead IMEI
		const writeOff = await server(new Request('http://localhost/api/v1/stock/adjustments/dead-imei', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				device_id: deviceId,
				sku: 'SKU001',
				warehouse_id: warehouseId,
				reason_notes: 'Device IMEI is dead',
				actor_id: userId
			})
		}))
		expect(writeOff.status).toBe(200)
		const writeOffBody = await writeOff.json()
		expect(writeOffBody.status).toBe(201)
		expect(writeOffBody.data.adjustment.reason).toBe('dead_imei')
		expect(writeOffBody.data.adjustment.quantity_adjustment).toBe(-1)
		expect(writeOffBody.data.device_event_created).toBe(true)
		expect(writeOffBody.message).toBe('Dead IMEI write-off completed successfully')

		// Verify stock was decremented
		const stock = await server(new Request(`http://localhost/api/v1/stock/stock/sku/SKU001/warehouse/${warehouseId}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const stockBody = await stock.json()
		expect(stockBody.data.quantity).toBe(9) // 10 - 1
	})

	it('should create bulk adjustments', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		// Create initial stock for multiple SKUs
		await createStock('SKU001', warehouseId, 50, tenantId, false)
		await createStock('SKU002', warehouseId, 30, tenantId, false)
		await createStock('PART001', warehouseId, 100, tenantId, true)

		// Create bulk adjustments
		const bulkAdjustment = await server(new Request('http://localhost/api/v1/stock/adjustments/bulk', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				adjustments: [
					{
						sku: 'SKU001',
						warehouse_id: warehouseId,
						quantity_adjustment: 10,
						reason: 'manual_correction',
						actor_id: userId
					},
					{
						sku: 'SKU002',
						warehouse_id: warehouseId,
						quantity_adjustment: -5,
						reason: 'damage',
						actor_id: userId
					},
					{
						sku: 'PART001',
						warehouse_id: warehouseId,
						quantity_adjustment: 25,
						reason: 'manual_correction',
						actor_id: userId
					}
				],
				batch_notes: 'Monthly inventory adjustment'
			})
		}))
		expect(bulkAdjustment.status).toBe(200)
		const bulkBody = await bulkAdjustment.json()
		expect(bulkBody.status).toBe(200)
		expect(bulkBody.data.successful_adjustments).toBe(3)
		expect(bulkBody.data.failed_adjustments).toBe(0)
		expect(bulkBody.data.total_quantity_adjusted).toBe(30) // 10 + (-5) + 25

		// Verify stock updates
		const stock1 = await server(new Request(`http://localhost/api/v1/stock/stock/sku/SKU001/warehouse/${warehouseId}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const stock1Body = await stock1.json()
		expect(stock1Body.data.quantity).toBe(60) // 50 + 10

		const stock2 = await server(new Request(`http://localhost/api/v1/stock/stock/sku/SKU002/warehouse/${warehouseId}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const stock2Body = await stock2.json()
		expect(stock2Body.data.quantity).toBe(25) // 30 - 5

		const part1 = await server(new Request(`http://localhost/api/v1/stock/stock/sku/PART001/warehouse/${warehouseId}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const part1Body = await part1.json()
		expect(part1Body.data.quantity).toBe(125) // 100 + 25
	})

	it('should get adjustment history', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		await createStock('SKU001', warehouseId, 50, tenantId, false)

		// Create some adjustments
		await server(new Request('http://localhost/api/v1/stock/adjustments', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001', warehouse_id: warehouseId, quantity_adjustment: 10,
				reason: 'manual_correction', actor_id: userId
			})
		}))
		await server(new Request('http://localhost/api/v1/stock/adjustments', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001', warehouse_id: warehouseId, quantity_adjustment: -5,
				reason: 'damage', actor_id: userId
			})
		}))

		const history = await server(new Request('http://localhost/api/v1/stock/adjustments', { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(history.status).toBe(200)
		const historyBody = await history.json()
		expect(historyBody.data.length).toBe(2)
		expect(historyBody.data.every((adj: any) => adj.reason === 'adjustment')).toBe(true)
	})

	it('should get dead IMEI history', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)
		const deviceId = await createDevice('SKU001', 'DEAD-001', tenantId, warehouseId)

		await createStock('SKU001', warehouseId, 10, tenantId, false)

		// Create dead IMEI write-off
		await server(new Request('http://localhost/api/v1/stock/adjustments/dead-imei', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				device_id: deviceId, sku: 'SKU001', warehouse_id: warehouseId,
				reason_notes: 'Dead IMEI', actor_id: userId
			})
		}))

		const deadHistory = await server(new Request('http://localhost/api/v1/stock/adjustments/dead-imei', { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(deadHistory.status).toBe(200)
		const deadBody = await deadHistory.json()
		expect(deadBody.data.length).toBe(1)
		expect(deadBody.data[0].sku).toBe('SKU001')
		expect(deadBody.data[0].quantity_adjustment).toBe(1) // Absolute value in history
	})

	it('should validate adjustment quantity', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		// Try to create adjustment with zero quantity
		const zeroAdjustment = await server(new Request('http://localhost/api/v1/stock/adjustments', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001',
				warehouse_id: warehouseId,
				quantity_adjustment: 0,
				reason: 'manual_correction',
				actor_id: userId
			})
		}))
		expect(zeroAdjustment.status).toBe(200)
		const zeroBody = await zeroAdjustment.json()
		expect(zeroBody.status).toBe(400)
		expect(zeroBody.message).toBe('Adjustment quantity cannot be zero')
	})

	it('should handle adjustment with device event creation', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)
		const deviceId = await createDevice('SKU001', 'TEST-001', tenantId, warehouseId)

		await createStock('SKU001', warehouseId, 20, tenantId, false)

		// Create adjustment with device_id
		const adjustment = await server(new Request('http://localhost/api/v1/stock/adjustments', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001',
				warehouse_id: warehouseId,
				quantity_adjustment: -1,
				reason: 'damage',
				notes: 'Device damaged during testing',
				device_id: deviceId,
				actor_id: userId
			})
		}))
		expect(adjustment.status).toBe(200)
		const adjustmentBody = await adjustment.json()
		expect(adjustmentBody.status).toBe(201)
		expect(adjustmentBody.data.device_event_created).toBe(true)
	})

	it('should filter adjustments by warehouse', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouse1Id = await ensureWarehouse('WH1', tenantId)
		const warehouse2Id = await ensureWarehouse('WH2', tenantId)

		await createStock(`SKU001-WH${warehouse1Id}`, warehouse1Id, 50, tenantId, false)
		await createStock(`SKU001-WH${warehouse2Id}`, warehouse2Id, 30, tenantId, false)

		// Create adjustments in different warehouses
		await server(new Request('http://localhost/api/v1/stock/adjustments', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: `SKU001-WH${warehouse1Id}`, warehouse_id: warehouse1Id, quantity_adjustment: 10,
				reason: 'manual_correction', actor_id: userId
			})
		}))
		await server(new Request('http://localhost/api/v1/stock/adjustments', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: `SKU001-WH${warehouse2Id}`, warehouse_id: warehouse2Id, quantity_adjustment: 5,
				reason: 'manual_correction', actor_id: userId
			})
		}))

		// Filter by warehouse
		const warehouse1Adjustments = await server(new Request(`http://localhost/api/v1/stock/adjustments?warehouse_id=${warehouse1Id}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const wh1Body = await warehouse1Adjustments.json()
		expect(wh1Body.data.length).toBe(1)
		expect(wh1Body.data[0].warehouse_id).toBe(warehouse1Id)
	})

	it('should forbid cross-tenant access', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenant1Id = await ensureTenant('t1')
		const tenant2Id = await ensureTenant('t2')
		const warehouse1Id = await ensureWarehouse('WH1', tenant1Id)
		const warehouse2Id = await ensureWarehouse('WH2', tenant2Id)

		// Create stock in tenant2
		await createStock('SKU-T2', warehouse2Id, 50, tenant2Id, false)

		// User from tenant1 should not see tenant2 adjustments
		const history = await server(new Request('http://localhost/api/v1/stock/adjustments', { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const historyBody = await history.json()
		expect(historyBody.data.every((adj: any) => adj.tenant_id === tenant1Id)).toBe(true)
	})
})
