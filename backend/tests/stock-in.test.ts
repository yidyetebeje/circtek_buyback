import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../src/db'
import { devices, grades, device_grades, device_events, tenants, warehouses, users } from '../src/db/circtek.schema'
import { stockInRepository } from '../src/stock/stock-in/repository'
import { eq, and } from 'drizzle-orm'

describe('Stock In Functionality', () => {
  let testTenantId: number
  let testWarehouseId: number
  let testUserId: number
  let testDeviceId: number
  let testGradeId: number
  let testIMEI: string

  beforeAll(async () => {
    // Create test tenant
    const [tenant] = await db.insert(tenants).values({
      name: 'Test Tenant Stock In',
      description: 'Test tenant for stock in tests'
    }).$returningId()
    testTenantId = tenant.id

    // Create test warehouse
    const [warehouse] = await db.insert(warehouses).values({
      name: 'Test Warehouse',
      description: 'Test warehouse',
      tenant_id: testTenantId
    }).$returningId()
    testWarehouseId = warehouse.id

    // Create test user
    const [user] = await db.insert(users).values({
      name: 'Test User',
      user_name: 'testuser_stockin',
      password: 'password',
      tenant_id: testTenantId,
      warehouse_id: testWarehouseId
    }).$returningId()
    testUserId = user.id

    // Create test grade
    const [grade] = await db.insert(grades).values({
      name: 'A+',
      color: '#00ff00',
      tenant_id: testTenantId
    }).$returningId()
    testGradeId = grade.id

    // Create test device
    testIMEI = `TEST${Date.now()}`
    const [device] = await db.insert(devices).values({
      sku: 'TEST-SKU',
      make: 'Apple',
      model_name: 'iPhone 15',
      device_type: 'iPhone',
      imei: testIMEI,
      tenant_id: testTenantId,
      warehouse_id: testWarehouseId
    }).$returningId()
    testDeviceId = device.id
  })

  afterAll(async () => {
    // Clean up test data
    await db.delete(device_events).where(eq(device_events.tenant_id, testTenantId))
    await db.delete(device_grades).where(eq(device_grades.tenant_id, testTenantId))
    await db.delete(devices).where(eq(devices.tenant_id, testTenantId))
    await db.delete(grades).where(eq(grades.tenant_id, testTenantId))
    await db.delete(users).where(eq(users.tenant_id, testTenantId))
    await db.delete(warehouses).where(eq(warehouses.tenant_id, testTenantId))
    await db.delete(tenants).where(eq(tenants.id, testTenantId))
  })

  it('should find device by IMEI', async () => {
    const device = await stockInRepository.findDeviceByIMEI(testIMEI, testTenantId)
    expect(device).toBeDefined()
    expect(device?.id).toBe(testDeviceId)
    expect(device?.imei).toBe(testIMEI)
  })

  it('should find grade by ID', async () => {
    const grade = await stockInRepository.findGradeById(testGradeId, testTenantId)
    expect(grade).toBeDefined()
    expect(grade?.id).toBe(testGradeId)
    expect(grade?.name).toBe('A+')
    expect(grade?.color).toBe('#00ff00')
  })

  it('should process stock in successfully', async () => {
    const request = {
      imei: testIMEI,
      grade_id: testGradeId,
      warehouse_id: testWarehouseId,
      remarks: 'Test stock in operation'
    }

    const result = await stockInRepository.processStockIn(request, testUserId, testTenantId)
    
    expect(result).toBeDefined()
    expect(result?.device_id).toBe(testDeviceId)
    expect(result?.imei).toBe(testIMEI)
    expect(result?.grade_id).toBe(testGradeId)
    expect(result?.grade_name).toBe('A+')
    expect(result?.grade_color).toBe('#00ff00')
    expect(result?.device_grade_id).toBeDefined()
    expect(result?.event_id).toBeDefined()
  })

  it('should create device grade record', async () => {
    const deviceGrades = await db
      .select()
      .from(device_grades)
      .where(and(
        eq(device_grades.device_id, testDeviceId),
        eq(device_grades.tenant_id, testTenantId),
        eq(device_grades.status, true)
      ))

    expect(deviceGrades).toHaveLength(1)
    expect(deviceGrades[0].grade_id).toBe(testGradeId)
    expect(deviceGrades[0].actor_id).toBe(testUserId)
  })

  it('should create device event', async () => {
    const events = await db
      .select()
      .from(device_events)
      .where(and(
        eq(device_events.device_id, testDeviceId),
        eq(device_events.tenant_id, testTenantId),
        eq(device_events.event_type, 'TEST_COMPLETED')
      ))

    expect(events).toHaveLength(1)
    expect(events[0].actor_id).toBe(testUserId)
    expect(events[0].details).toBeDefined()
    
    const details = events[0].details as any
    expect(details.action).toBe('stock_in')
    expect(details.grade_id).toBe(testGradeId)
  })

  it('should prevent duplicate grading', async () => {
    const request = {
      imei: testIMEI,
      grade_id: testGradeId,
      warehouse_id: testWarehouseId,
      remarks: 'Duplicate test'
    }

    await expect(
      stockInRepository.processStockIn(request, testUserId, testTenantId)
    ).rejects.toThrow('already has grade')
  })

  it('should handle device not found', async () => {
    const request = {
      imei: 'NONEXISTENT123',
      grade_id: testGradeId,
      warehouse_id: testWarehouseId,
      remarks: 'Test'
    }

    await expect(
      stockInRepository.processStockIn(request, testUserId, testTenantId)
    ).rejects.toThrow('Device with IMEI NONEXISTENT123 not found')
  })

  it('should handle grade not found', async () => {
    const request = {
      imei: testIMEI,
      grade_id: 99999,
      warehouse_id: testWarehouseId,
      remarks: 'Test'
    }

    await expect(
      stockInRepository.processStockIn(request, testUserId, testTenantId)
    ).rejects.toThrow('Grade with ID 99999 not found')
  })

  it('should retrieve grade history', async () => {
    const history = await stockInRepository.getDeviceGradeHistory(testDeviceId, testTenantId)
    
    expect(history).toHaveLength(1)
    expect(history[0].grade_name).toBe('A+')
    expect(history[0].grade_color).toBe('#00ff00')
    expect(history[0].actor_id).toBe(testUserId)
    expect(history[0].status).toBe(true)
  })

  it('should handle grade change (deactivate old, create new)', async () => {
    // Create another grade
    const [newGrade] = await db.insert(grades).values({
      name: 'B+',
      color: '#ffff00',
      tenant_id: testTenantId
    }).$returningId()

    const request = {
      imei: testIMEI,
      grade_id: newGrade.id,
      warehouse_id: testWarehouseId,
      remarks: 'Grade change test'
    }

    const result = await stockInRepository.processStockIn(request, testUserId, testTenantId)
    
    expect(result).toBeDefined()
    expect(result?.grade_name).toBe('B+')

    // Check that old grade is deactivated
    const oldGrades = await db
      .select()
      .from(device_grades)
      .where(and(
        eq(device_grades.device_id, testDeviceId),
        eq(device_grades.grade_id, testGradeId),
        eq(device_grades.tenant_id, testTenantId)
      ))

    expect(oldGrades[0].status).toBe(false)

    // Check that new grade is active
    const newGrades = await db
      .select()
      .from(device_grades)
      .where(and(
        eq(device_grades.device_id, testDeviceId),
        eq(device_grades.grade_id, newGrade.id),
        eq(device_grades.tenant_id, testTenantId)
      ))

    expect(newGrades[0].status).toBe(true)

    // Clean up
    await db.delete(grades).where(eq(grades.id, newGrade.id))
  })
})
