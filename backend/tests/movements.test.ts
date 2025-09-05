import { describe, it, expect, beforeEach } from 'bun:test'
import { buildApp } from '../src/app'
import { ensureRole, ensureTenant, ensureWarehouse, resetDb, createStock } from './utils/db'
import { getToken } from './utils/auth'

describe('Stock Movements routes', () => {
	beforeEach(async () => {
		await resetDb()
		await ensureRole('super_admin')
		await ensureRole('stock_manager')
		await ensureTenant('t1')
	})

	it('should require auth for movement operations', async () => {
		const app = buildApp()
		const server = app.handle

		const unauth = await server(new Request('http://localhost/api/v1/stock/movements'))
		expect(unauth.status).toBe(401)
	})

	it('should create stock movement and update stock', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		// Create initial stock
		await createStock('SKU001', warehouseId, 50, tenantId, false)

		// Create movement (increase stock by 25)
		const movement = await server(new Request('http://localhost/api/v1/stock/movements', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001',
				warehouse_id: warehouseId,
				delta: 25,
				reason: 'adjustment',
				ref_type: 'manual_adjustment',
				ref_id: 123,
				actor_id: userId
			})
		}))
		expect(movement.status).toBe(200)
		const movementBody = await movement.json()
		expect(movementBody.status).toBe(201)
		expect(movementBody.data.sku).toBe('SKU001')
		expect(movementBody.data.delta).toBe(25)

		// Verify stock was updated
		const stock = await server(new Request(`http://localhost/api/v1/stock/stock/sku/SKU001/warehouse/${warehouseId}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const stockBody = await stock.json()
		expect(stockBody.data.quantity).toBe(75) // 50 + 25
	})

	it('should list movements with filtering', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		await createStock('SKU001', warehouseId, 50, tenantId, false)

		// Create multiple movements
		await server(new Request('http://localhost/api/v1/stock/movements', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001', warehouse_id: warehouseId, delta: 10, reason: 'purchase',
				ref_type: 'purchases', ref_id: 1, actor_id: userId
			})
		}))
		await server(new Request('http://localhost/api/v1/stock/movements', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001', warehouse_id: warehouseId, delta: -5, reason: 'repair',
				ref_type: 'repairs', ref_id: 2, actor_id: userId
			})
		}))

		// Test basic list
		const list = await server(new Request('http://localhost/api/v1/stock/movements', { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(list.status).toBe(200)
		const listBody = await list.json()
		expect(listBody.data.length).toBe(2)

		// Test filtering by reason
		const purchaseMovements = await server(new Request('http://localhost/api/v1/stock/movements?reason=purchase', { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const purchaseBody = await purchaseMovements.json()
		expect(purchaseBody.data.length).toBe(1)
		expect(purchaseBody.data[0].reason).toBe('purchase')

		// Test filtering by SKU
		const skuMovements = await server(new Request('http://localhost/api/v1/stock/movements?sku=SKU001', { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		const skuBody = await skuMovements.json()
		expect(skuBody.data.length).toBe(2)
	})

	it('should get movement summary', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		await createStock('SKU001', warehouseId, 50, tenantId, false)

		// Create movements
		await server(new Request('http://localhost/api/v1/stock/movements', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001', warehouse_id: warehouseId, delta: 20, reason: 'purchase',
				ref_type: 'purchases', ref_id: 1, actor_id: userId
			})
		}))
		await server(new Request('http://localhost/api/v1/stock/movements', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001', warehouse_id: warehouseId, delta: -10, reason: 'repair',
				ref_type: 'repairs', ref_id: 2, actor_id: userId
			})
		}))

		const summary = await server(new Request('http://localhost/api/v1/stock/movements/summary', { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(summary.status).toBe(200)
		const summaryBody = await summary.json()
		expect(summaryBody.data.total_movements).toBe(2)
		expect(summaryBody.data.total_inbound).toBe(20)
		expect(summaryBody.data.total_outbound).toBe(10)
		expect(summaryBody.data.net_change).toBe(10)
		expect(summaryBody.data.by_reason.purchase).toBe(1)
		expect(summaryBody.data.by_reason.repair).toBe(1)
	})

	it('should get audit trail for specific SKU and warehouse', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		await createStock('SKU001', warehouseId, 50, tenantId, false)

		// Create movements for audit trail
		await server(new Request('http://localhost/api/v1/stock/movements', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001', warehouse_id: warehouseId, delta: 25, reason: 'purchase',
				ref_type: 'purchases', ref_id: 1, actor_id: userId
			})
		}))
		await server(new Request('http://localhost/api/v1/stock/movements', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001', warehouse_id: warehouseId, delta: -15, reason: 'repair',
				ref_type: 'repairs', ref_id: 2, actor_id: userId
			})
		}))

		const auditTrail = await server(new Request(`http://localhost/api/v1/stock/movements/audit/SKU001/warehouse/${warehouseId}`, { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(auditTrail.status).toBe(200)
		const auditBody = await auditTrail.json()
		expect(auditBody.data.sku).toBe('SKU001')
		expect(auditBody.data.warehouse_id).toBe(warehouseId)
		expect(auditBody.data.movements.length).toBe(2)
		expect(auditBody.data.current_stock).toBe(60) // 50 + 25 - 15
		expect(auditBody.data.total_in).toBe(25)
		expect(auditBody.data.total_out).toBe(15)
	})

	it('should get movements by reference', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		await createStock('SKU001', warehouseId, 50, tenantId, false)

		// Create movements with same reference
		await server(new Request('http://localhost/api/v1/stock/movements', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001', warehouse_id: warehouseId, delta: 10, reason: 'purchase',
				ref_type: 'purchases', ref_id: 123, actor_id: userId
			})
		}))
		await server(new Request('http://localhost/api/v1/stock/movements', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001', warehouse_id: warehouseId, delta: 5, reason: 'purchase',
				ref_type: 'purchases', ref_id: 123, actor_id: userId
			})
		}))

		const byReference = await server(new Request('http://localhost/api/v1/stock/movements/reference/purchases/123', { 
			headers: { authorization: `Bearer ${token}` } 
		}))
		expect(byReference.status).toBe(200)
		const refBody = await byReference.json()
		expect(refBody.data.length).toBe(2)
		expect(refBody.data.every((m: any) => m.ref_type === 'purchases' && m.ref_id === 123)).toBe(true)
	})

	it('should validate movement data', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		await createStock('SKU001', warehouseId, 10, tenantId, false)

		// Try to create movement with invalid reason
		const invalidMovement = await server(new Request('http://localhost/api/v1/stock/movements', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001', warehouse_id: warehouseId, delta: 5, reason: 'invalid_reason',
				ref_type: 'test', ref_id: 1, actor_id: userId
			})
		}))
		expect(invalidMovement.status).toBe(422) // Validation error
	})

	it('should prevent negative stock through movements', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId } = await getToken(server, 'stock_manager')
		const tenantId = await ensureTenant('t1')
		const warehouseId = await ensureWarehouse('WH1', tenantId)

		await createStock('SKU001', warehouseId, 10, tenantId, false)

		// Try to create movement that would make stock negative
		const negativeMovement = await server(new Request('http://localhost/api/v1/stock/movements', {
			method: 'POST', 
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, 
			body: JSON.stringify({ 
				sku: 'SKU001', warehouse_id: warehouseId, delta: -15, reason: 'adjustment',
				ref_type: 'manual_adjustment', ref_id: 1, actor_id: userId
			})
		}))
		expect(negativeMovement.status).toBe(200) // Request succeeds
		const moveBody = await negativeMovement.json()
		// Movement should fail due to insufficient stock (would go negative)
		expect(moveBody.status).toBe(500)
	})
})
