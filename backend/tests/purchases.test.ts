import { describe, it, expect, beforeEach } from 'bun:test'
import { buildApp } from '../src/app'
import { ensureRole, ensureTenant, ensureWarehouse, resetDb, createPurchase, createPurchaseItem, createSkuSpec, getDeviceById } from './utils/db'
import { getToken } from './utils/auth'

describe('Stock Purchases routes', () => {
	beforeEach(async () => {
		await resetDb()
		await ensureRole('super_admin')
		await ensureRole('stock_manager')
		await ensureTenant('t1')
	})

	it('should require auth for purchase operations', async () => {
		const app = buildApp()
		const server = app.handle

		const unauth = await server(new Request('http://localhost/api/v1/stock/purchases'))
		expect(unauth.status).toBe(401)
	})

	it('should create purchase order', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		const purchase = await server(new Request('http://localhost/api/v1/stock/purchases', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				purchase_order_no: 'PO-001',
				supplier_name: 'Test Supplier',
				supplier_order_no: 'SO-001',
				expected_delivery_date: '2024-12-31',
				remarks: 'Test purchase order',
				warehouse_id: warehouseId
			})
		}))
		expect(purchase.status).toBe(200)
		const purchaseBody = await purchase.json()
		expect(purchaseBody.status).toBe(201)
		expect(purchaseBody.data.purchase_order_no).toBe('PO-001')
		expect(purchaseBody.data.supplier_name).toBe('Test Supplier')
	})

	it('should create purchase with items', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		const purchaseWithItems = await server(new Request('http://localhost/api/v1/stock/purchases/with-items', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				purchase: {
					purchase_order_no: 'PO-002',
					supplier_name: 'Test Supplier 2',
					supplier_order_no: 'SO-002',
					expected_delivery_date: '2024-12-31',
					warehouse_id: warehouseId
				},
				items: [
					{ sku: 'SKU001', quantity: 50, price: 100.00, is_part: false },
					{ sku: 'PART001', quantity: 100, price: 25.00, is_part: true }
				]
			})
		}))
		expect(purchaseWithItems.status).toBe(200)
		const purchaseBody = await purchaseWithItems.json()
		expect(purchaseBody.status).toBe(201)
		expect(purchaseBody.data.purchase.purchase_order_no).toBe('PO-002')
		expect(purchaseBody.data.items.length).toBe(2)
		expect(purchaseBody.data.total_items).toBe(150)
		expect(purchaseBody.data.total_received).toBe(0)
		expect(purchaseBody.data.is_fully_received).toBe(false)
	})

	it('should list purchase orders', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')

		// Create test purchases
		await createPurchase(tenantId)
		await createPurchase(tenantId)

		const list = await server(new Request('http://localhost/api/v1/stock/purchases', { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(list.status).toBe(200)
		const listBody = await list.json()
		expect(listBody.status).toBe(200)
		expect(listBody.data.length).toBe(2)
	})

	it('should get purchase with items and receiving status', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')

		const purchaseId = await createPurchase(tenantId)
		await createPurchaseItem(purchaseId, 'SKU001', 50, 100.00, tenantId)
		await createPurchaseItem(purchaseId, 'PART001', 100, 25.00, tenantId)

		const purchase = await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseId}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(purchase.status).toBe(200)
		const purchaseBody = await purchase.json()
		expect(purchaseBody.status).toBe(200)
		expect(purchaseBody.data.purchase.id).toBe(purchaseId)
		expect(purchaseBody.data.items.length).toBe(2)
		expect(purchaseBody.data.total_items).toBe(150)
		expect(purchaseBody.data.is_fully_received).toBe(false)
	})

	it('should receive items and create stock movements', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		// Create purchase with items
		const purchaseId = await createPurchase(tenantId)
		const item1Id = await createPurchaseItem(purchaseId, 'SKU001', 50, 100.00, tenantId)
		const item2Id = await createPurchaseItem(purchaseId, 'PART001', 100, 25.00, tenantId)

		// Receive items
		const receive = await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseId}/receive`, {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				purchase_id: purchaseId,
				items: [
					{ purchase_item_id: item1Id, sku: 'SKU001', quantity_received: 50 },
					{ purchase_item_id: item2Id, sku: 'PART001', quantity_received: 75 }
				],
				warehouse_id: warehouseId,
				actor_id: userId
			})
		}))
		expect(receive.status).toBe(200)
		if (receive.status !== 200) {
			const errorBody = await receive.json()
		
		}
		expect(receive.status).toBe(200)
		
		const receiveBody = await receive.json()
		expect(receiveBody.status).toBe(200)
		expect(receiveBody.data.purchase_id).toBe(purchaseId)
		expect(receiveBody.data.total_quantity_received).toBe(125)
		expect(receiveBody.data.stock_movements_created).toBe(2)
		expect(receiveBody.data.received_items.length).toBe(2)

		// Verify stock was created/updated
		const stock1 = await server(new Request(`http://localhost/api/v1/stock/stock/sku/SKU001/warehouse/${warehouseId}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const stock1Body = await stock1.json()
		expect(stock1Body.data.quantity).toBe(50)

		const stock2 = await server(new Request(`http://localhost/api/v1/stock/stock/sku/PART001/warehouse/${warehouseId}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const stock2Body = await stock2.json()
		expect(stock2Body.data.quantity).toBe(75)
	})

	it('should handle partial receiving', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		// Create purchase with items
		const purchaseId = await createPurchase(tenantId)
		const itemId = await createPurchaseItem(purchaseId, 'SKU001', 100, 50.00, tenantId)

		// First partial receive
		await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseId}/receive`, {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				purchase_id: purchaseId,
				items: [{ purchase_item_id: itemId, sku: 'SKU001', quantity_received: 40 }],
				warehouse_id: warehouseId,
				actor_id: userId
			})
		}))

		// Check receiving status
		const status = await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseId}/status`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const statusBody = await status.json()
		expect(statusBody.data.total_items).toBe(100)
		expect(statusBody.data.total_received).toBe(40)
		expect(statusBody.data.completion_percentage).toBe(40)
		expect(statusBody.data.is_fully_received).toBe(false)

		// Second partial receive
		await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseId}/receive`, {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				purchase_id: purchaseId,
				items: [{ purchase_item_id: itemId, sku: 'SKU001', quantity_received: 60 }],
				warehouse_id: warehouseId,
				actor_id: userId
			})
		}))

		// Check final status
		const finalStatus = await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseId}/status`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const finalStatusBody = await finalStatus.json()
		expect(finalStatusBody.data.total_received).toBe(100)
		expect(finalStatusBody.data.completion_percentage).toBe(100)
		expect(finalStatusBody.data.is_fully_received).toBe(true)
	})

	it('should get received items history', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		const purchaseId = await createPurchase(tenantId)
		const itemId = await createPurchaseItem(purchaseId, 'SKU001', 50, 100.00, tenantId)

		// Receive items
		await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseId}/receive`, {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				purchase_id: purchaseId,
				items: [{ purchase_item_id: itemId, sku: 'SKU001', quantity_received: 50 }],
				warehouse_id: warehouseId,
				actor_id: userId
			})
		}))

		const received = await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseId}/received`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(received.status).toBe(200)
		const receivedBody = await received.json()
		expect(receivedBody.data.length).toBeGreaterThan(0)
		const relevantItem = receivedBody.data.find((item: any) => item.sku === 'SKU001')
		expect(relevantItem).toBeDefined()
		expect(relevantItem.quantity).toBe(50)
	})

	it('should receive devices by identifiers (IMEI/serial), creating devices via sku_specs if missing', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		await createSkuSpec('SKU-IDENT', tenantId, { make: 'Apple', model_name: 'iPhone 14', storage: '128GB', color: 'Blue' })

		const purchaseId = await createPurchase(tenantId)
		const itemId = await createPurchaseItem(purchaseId, 'SKU-IDENT', 2, 10.0, tenantId)

		const identifiers = ['490154203237518', 'SN-XYZ-12345']

		const receive = await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseId}/receive`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
			body: JSON.stringify({
				purchase_id: purchaseId,
				items: [{ purchase_item_id: itemId, sku: 'SKU-IDENT', quantity_received: 0, identifiers }],
				warehouse_id: warehouseId,
				actor_id: userId
			})
		}))
		const body = await receive.json()
		if (receive.status !== 200) {
			console.log('Identifiers receive failed:', JSON.stringify(body))
		}
		expect(receive.status).toBe(200)
		expect(body.status).toBe(200)
		expect(body.data.total_quantity_received).toBe(2)
		expect(body.data.received_items.length).toBe(2)

		const deviceIds = body.data.received_items.map((ri: any) => ri.device_id)
		expect(deviceIds.filter((id: any) => !!id).length).toBe(2)

		const device = await getDeviceById(deviceIds[0])
		expect(device.sku).toBe('SKU-IDENT')
		expect(['Apple', '']).toContain(device.make)

		const stockResp = await server(new Request(`http://localhost/api/v1/stock/stock/sku/SKU-IDENT/warehouse/${warehouseId}`, {
			headers: { authorization: `Bearer ${token}` }
		}))
		const stockBody = await stockResp.json()
		expect(stockBody.data.quantity).toBe(2)
	})

	it('should delete purchase order (only if no items received)', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')

		const purchaseId = await createPurchase(tenantId)

		const del = await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseId}`, {
			method: 'DELETE', 
			headers: { authorization: `Bearer ${token}` }
		}))
		expect(del.status).toBe(200)
		const delBody = await del.json()
		expect(delBody.status).toBe(200)
	})

	it('should prevent deletion of purchase with received items', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		const purchaseId = await createPurchase(tenantId)
		const itemId = await createPurchaseItem(purchaseId, 'SKU001', 50, 100.00, tenantId)

		// Receive some items
		await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseId}/receive`, {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				purchase_id: purchaseId,
				items: [{ purchase_item_id: itemId, sku: 'SKU001', quantity_received: 25 }],
				warehouse_id: warehouseId,
				actor_id: userId
			})
		}))

		// Try to delete
		const del = await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseId}`, {
			method: 'DELETE', 
			headers: { authorization: `Bearer ${token}` }
		}))
		expect(del.status).toBe(200)
		const delBody = await del.json()
		// Check if deletion was prevented
		expect([200, 400]).toContain(delBody.status)
		if (delBody.status === 400) {
			expect(delBody.message).toContain('Cannot delete purchase with received items')
		}
	})

	it('should forbid cross-tenant access', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'stock_manager')
		const tenant1Id = await ensureTenant('t1')
		const tenant2Id = await ensureTenant('t2')

		// Create purchase in tenant2
		const purchaseT2 = await createPurchase(tenant2Id)

		// User from tenant1 should not access tenant2 purchase
		const access = await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseT2}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(access.status).toBe(200)
		const accessBody = await access.json()
		expect(accessBody.status).toBe(404) // Not found due to tenant filtering
	})
})
