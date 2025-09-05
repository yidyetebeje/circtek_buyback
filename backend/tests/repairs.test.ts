import { describe, it, expect, beforeEach } from 'bun:test'
import { buildApp } from '../src/app'
import { ensureRole, ensureTenant, ensureWarehouse, resetDb, createDevice, ensureRepairReason, createPurchase, createPurchaseItem } from './utils/db'
import { db } from '../src/db'
import { stock, purchase_items } from '../src/db/circtek.schema'
import { eq } from 'drizzle-orm'
import { getToken } from './utils/auth'

describe('Repairs routes', () => {
  beforeEach(async () => {
    await resetDb()
    await ensureRole('super_admin')
    await ensureRole('repair_technician')
    await ensureTenant('t1')
  })

  it('should require auth for repair operations', async () => {
    const app = buildApp()
    const server = app.handle

    const unauth = await server(new Request('http://localhost/api/v1/stock/repairs'))
    expect(unauth.status).toBe(401)
  })

  it('should create repair and consume parts with costs allocated from purchases', async () => {
    const app = buildApp()
    const server = app.handle
    const { token, userId } = await getToken(server, 'repair_technician')
    const tenantId = await ensureTenant('t1')
    const warehouseId = await ensureWarehouse('WH1', tenantId)

    // Create device
    const deviceId = await createDevice('DEVICE-SKU-1', 'SER-001', tenantId, warehouseId)
    
    // Create purchase with items and receive them to stock
    const po = await server(new Request('http://localhost/api/v1/stock/purchases/with-items', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        purchase: {
          purchase_order_no: `PO-A-${Date.now()}`,
          supplier_name: 'Supplier A',
          supplier_order_no: `SO-A-${Date.now()}`,
          expected_delivery_date: new Date().toISOString(),
          warehouse_id: warehouseId
        },
        items: [
          { sku: 'SCREEN-001', quantity: 10, price: 75.5, is_part: true },
          { sku: 'BATTERY-001', quantity: 5, price: 45.0, is_part: true },
        ]
      })
    }))
    const poBody = await po.json()
    expect(poBody.status).toBe(201)
    const purchaseId = poBody.data.purchase.id as number
    const purchaseItems = poBody.data.items as Array<any>

    // Receive items to stock
    const recv = await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseId}/receive`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        purchase_id: purchaseId,
        items: [
          { purchase_item_id: purchaseItems.find((i:any)=>i.sku==='SCREEN-001').id, sku: 'SCREEN-001', quantity_received: 10 },
          { purchase_item_id: purchaseItems.find((i:any)=>i.sku==='BATTERY-001').id, sku: 'BATTERY-001', quantity_received: 5 },
        ],
        warehouse_id: warehouseId,
        actor_id: userId,
      })
    }))
    const recvBody = await recv.json()
    expect(recvBody.status).toBe(200)

    const reasonId = await ensureRepairReason('Screen Replacement', tenantId)

    // Create repair
    const create = await server(new Request('http://localhost/api/v1/stock/repairs', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ device_id: deviceId, device_sku: 'DEVICE-SKU-1', reason_id: reasonId, remarks: 'Cracked screen', actor_id: userId })
    }))
    expect(create.status).toBe(200)
    const createBody = await create.json()
    expect(createBody.status).toBe(201)
    const repairId = createBody.data.id as number

    // Consume parts (no cost fields; costs are derived)
    const consume = await server(new Request(`http://localhost/api/v1/stock/repairs/${repairId}/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        items: [
          { sku: 'SCREEN-001', quantity: 1 },
          { sku: 'BATTERY-001', quantity: 1 }
        ],
        notes: 'Repair consumption',
        actor_id: userId
      })
    }))
    expect(consume.status).toBe(200)
    const consumeBody = await consume.json()
    expect(consumeBody.status).toBe(200)
    expect(consumeBody.data.repair_id).toBe(repairId)
    expect(consumeBody.data.items_count).toBe(2)

    // Verify stock decreased
    const screenStock = await server(new Request(`http://localhost/api/v1/stock/stock/sku/SCREEN-001/warehouse/${warehouseId}`, { headers: { authorization: `Bearer ${token}` } }))
    const screenBody = await screenStock.json()
    expect(screenBody.data.quantity).toBe(9)

    const batteryStock = await server(new Request(`http://localhost/api/v1/stock/stock/sku/BATTERY-001/warehouse/${warehouseId}`, { headers: { authorization: `Bearer ${token}` } }))
    const batteryBody = await batteryStock.json()
    expect(batteryBody.data.quantity).toBe(4)

    // Get repair with items
    const get = await server(new Request(`http://localhost/api/v1/stock/repairs/${repairId}`, { headers: { authorization: `Bearer ${token}` } }))
    expect(get.status).toBe(200)
    const getBody = await get.json()
    expect(getBody.status).toBe(200)
    expect(getBody.data.items.length).toBeGreaterThanOrEqual(2)
    // Costs persisted on repair_items should match purchase prices
    const screenItem = getBody.data.items.find((it:any)=>it.sku==='SCREEN-001')
    const batteryItem = getBody.data.items.find((it:any)=>it.sku==='BATTERY-001')
    expect(screenItem.cost).toBeCloseTo(75.5, 5)
    expect(batteryItem.cost).toBeCloseTo(45.0, 5)
  })
  it('should allocate across multiple purchase batches for a single SKU', async () => {
    const app = buildApp()
    const server = app.handle
    const { token, userId } = await getToken(server, 'repair_technician')
    const tenantId = await ensureTenant('t1')
    const warehouseId = await ensureWarehouse('WH1', tenantId)
    const deviceId = await createDevice('DEVICE-SKU-3', 'SER-003', tenantId, warehouseId)
    const reasonId = await ensureRepairReason('Battery Replacement', tenantId)

    // Create two purchases for same SKU with different prices
    const po1 = await server(new Request('http://localhost/api/v1/stock/purchases/with-items', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        purchase: { purchase_order_no: `PO-B1-${Date.now()}`, supplier_name: 'S1', supplier_order_no: `SO-B1-${Date.now()}`, expected_delivery_date: new Date().toISOString(), warehouse_id: warehouseId },
        items: [ { sku: 'CABLE-USB', quantity: 2, price: 5.00, is_part: true } ]
      })
    }))
    const po1Body = await po1.json()
    const purchaseId1 = po1Body.data.purchase.id
    const item1 = po1Body.data.items[0]
    const po2 = await server(new Request('http://localhost/api/v1/stock/purchases/with-items', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        purchase: { purchase_order_no: `PO-B2-${Date.now()}`, supplier_name: 'S2', supplier_order_no: `SO-B2-${Date.now()}`, expected_delivery_date: new Date().toISOString(), warehouse_id: warehouseId },
        items: [ { sku: 'CABLE-USB', quantity: 3, price: 4.50, is_part: true } ]
      })
    }))
    const po2Body = await po2.json()
    const purchaseId2 = po2Body.data.purchase.id
    const item2 = po2Body.data.items[0]

    // Receive both
    await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseId1}/receive`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ purchase_id: purchaseId1, items: [ { purchase_item_id: item1.id, sku: 'CABLE-USB', quantity_received: 2 } ], warehouse_id: warehouseId, actor_id: userId })
    }))
    await server(new Request(`http://localhost/api/v1/stock/purchases/${purchaseId2}/receive`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ purchase_id: purchaseId2, items: [ { purchase_item_id: item2.id, sku: 'CABLE-USB', quantity_received: 3 } ], warehouse_id: warehouseId, actor_id: userId })
    }))

    // Create repair and consume 4 units -> should allocate 2 from first (5.00) and 2 from second (4.50)
    const create = await server(new Request('http://localhost/api/v1/stock/repairs', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ device_id: deviceId, device_sku: 'DEVICE-SKU-3', reason_id: reasonId, actor_id: userId })
    }))
    const repairId = (await create.json()).data.id

    const consume = await server(new Request(`http://localhost/api/v1/stock/repairs/${repairId}/consume`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ warehouse_id: warehouseId, items: [ { sku: 'CABLE-USB', quantity: 4 } ], actor_id: userId })
    }))
    const consumeBody = await consume.json()
    expect(consumeBody.status).toBe(200)
    expect(consumeBody.data.total_quantity_consumed).toBe(4)
    // Verify persisted repair_items split and have unit costs 5.00 and 4.50
    const get = await server(new Request(`http://localhost/api/v1/stock/repairs/${repairId}`, { headers: { authorization: `Bearer ${token}` } }))
    const getBody = await get.json()
    const items = getBody.data.items.filter((it:any)=>it.sku==='CABLE-USB')
    const costs = items.map((it:any)=>Number(it.cost)).sort()
    expect(items.reduce((s:any,i:any)=>s+i.quantity, 0)).toBe(4)
    expect(costs[0]).toBeCloseTo(4.5, 5)
    expect(costs[costs.length-1]).toBeCloseTo(5.0, 5)
  })

  it('should reject consumption when purchase availability is insufficient and leave state unchanged', async () => {
    const app = buildApp()
    const server = app.handle
    const { token, userId } = await getToken(server, 'repair_technician')
    const tenantId = await ensureTenant('t1')
    const warehouseId = await ensureWarehouse('WH1', tenantId)
    const deviceId = await createDevice('DEVICE-SKU-4', 'SER-004', tenantId, warehouseId)
    const reasonId = await ensureRepairReason('Other', tenantId)

    const poId = await createPurchase(tenantId)
    const piId = await createPurchaseItem(poId, 'PART-X', 2, 10.0, tenantId)

    // Receive only 1 unit to make availability = 1
    const recv = await server(new Request(`http://localhost/api/v1/stock/purchases/${poId}/receive`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ purchase_id: poId, items: [ { purchase_item_id: piId, sku: 'PART-X', quantity_received: 1 } ], warehouse_id: warehouseId, actor_id: userId })
    }))
    expect((await recv.json()).status).toBe(200)

    const create = await server(new Request('http://localhost/api/v1/stock/repairs', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ device_id: deviceId, device_sku: 'DEVICE-SKU-4', reason_id: reasonId, actor_id: userId })
    }))
    const repairId = (await create.json()).data.id

    // Try to consume 2 while only 1 available -> should 400 and not modify quantity_used_for_repair
    const consume = await server(new Request(`http://localhost/api/v1/stock/repairs/${repairId}/consume`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ warehouse_id: warehouseId, items: [ { sku: 'PART-X', quantity: 2 } ], actor_id: userId })
    }))
    expect(consume.status).toBe(200)
    const body = await consume.json()
    expect(body.status).toBe(400)

    // Verify quantity_used_for_repair remains 0
    const [pi] = await db.select().from(purchase_items).where(eq(purchase_items.id, piId) as any)
    expect(Number(pi.quantity_used_for_repair)).toBe(0)
  })

  it('should rollback allocations if stock movement fails after allocation', async () => {
    const app = buildApp()
    const server = app.handle
    const { token, userId } = await getToken(server, 'repair_technician')
    const tenantId = await ensureTenant('t1')
    const warehouseId = await ensureWarehouse('WH1', tenantId)
    const deviceId = await createDevice('DEVICE-SKU-5', 'SER-005', tenantId, warehouseId)
    const reasonId = await ensureRepairReason('Test Rollback', tenantId)

    // Create and receive 1 unit so allocation will succeed
    const poId = await createPurchase(tenantId)
    const piId = await createPurchaseItem(poId, 'PART-Y', 1, 12.34, tenantId)
    await server(new Request(`http://localhost/api/v1/stock/purchases/${poId}/receive`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ purchase_id: poId, items: [ { purchase_item_id: piId, sku: 'PART-Y', quantity_received: 1 } ], warehouse_id: warehouseId, actor_id: userId })
    }))

    // Force stock to 0 to trigger movement failure (insufficient stock)
    await db.update(stock).set({ quantity: 0 }).where(eq(stock.sku, 'PART-Y') as any)

    const create = await server(new Request('http://localhost/api/v1/stock/repairs', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ device_id: deviceId, device_sku: 'DEVICE-SKU-5', reason_id: reasonId, actor_id: userId })
    }))
    const repairId = (await create.json()).data.id

    const consume = await server(new Request(`http://localhost/api/v1/stock/repairs/${repairId}/consume`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ warehouse_id: warehouseId, items: [ { sku: 'PART-Y', quantity: 1 } ], actor_id: userId })
    }))
    const body = await consume.json()
    expect(body.status).toBe(500)

    // Allocation should be deallocated
    const [pi] = await db.select().from(purchase_items).where(eq(purchase_items.id, piId) as any)
    expect(Number(pi.quantity_used_for_repair)).toBe(0)
  })

  it('should list repairs and filter by device/reason', async () => {
    const app = buildApp()
    const server = app.handle
    const { token, userId } = await getToken(server, 'repair_technician')
    const tenantId = await ensureTenant('t1')
    const warehouseId = await ensureWarehouse('WH1', tenantId)
    const deviceId = await createDevice('DEVICE-SKU-2', 'SER-002', tenantId, warehouseId)
    const reasonId = await ensureRepairReason('Battery Replacement', tenantId)

    // Create multiple repairs
    for (let i = 0; i < 3; i++) {
      await server(new Request('http://localhost/api/v1/stock/repairs', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ device_id: deviceId, device_sku: 'DEVICE-SKU-2', reason_id: reasonId, actor_id: userId })
      }))
    }

    const list = await server(new Request('http://localhost/api/v1/stock/repairs', { headers: { authorization: `Bearer ${token}` } }))
    expect(list.status).toBe(200)
    const listBody = await list.json()
    expect(listBody.status).toBe(200)
    expect(listBody.data.length).toBe(3)

    const filtered = await server(new Request(`http://localhost/api/v1/stock/repairs?reason_id=${reasonId}`, { headers: { authorization: `Bearer ${token}` } }))
    const filteredBody = await filtered.json()
    expect(filteredBody.data.length).toBe(3)
  })
})


