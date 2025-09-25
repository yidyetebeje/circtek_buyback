import { eq, and, desc } from 'drizzle-orm'
import { db } from '../../db'
import { devices, grades, device_grades, device_events, warehouses, users } from '../../db/circtek.schema'
import type { StockInRequestInput, StockInResponse } from './types'

export class StockInRepository {
  constructor(private readonly database: typeof db) {}

  /**
   * Find device by IMEI within tenant scope
   */
  async findDeviceByIMEI(imei: string, tenantId: number) {
    const [device] = await this.database
      .select()
      .from(devices)
      .where(and(
        eq(devices.imei, imei),
        eq(devices.tenant_id, tenantId),
        eq(devices.status, true)
      ))
    
    return device
  }

  /**
   * Find grade by ID within tenant scope
   */
  async findGradeById(gradeId: number, tenantId: number) {
    const [grade] = await this.database
      .select()
      .from(grades)
      .where(and(
        eq(grades.id, gradeId),
        eq(grades.tenant_id, tenantId)
      ))
    
    return grade
  }

  /**
   * Find warehouse by ID within tenant scope
   */
  async findWarehouseById(warehouseId: number, tenantId: number) {
    const [warehouse] = await this.database
      .select()
      .from(warehouses)
      .where(and(
        eq(warehouses.id, warehouseId),
        eq(warehouses.tenant_id, tenantId),
        eq(warehouses.status, true)
      ))
    
    return warehouse
  }

  /**
   * Find user by ID within tenant scope
   */
  async findUserById(userId: number, tenantId: number) {
    const [user] = await this.database
      .select()
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.tenant_id, tenantId),
        eq(users.status, true)
      ))
    
    return user
  }

  /**
   * Get current active grade for a device
   */
  async getCurrentDeviceGrade(deviceId: number, tenantId: number) {
    const [currentGrade] = await this.database
      .select({
        id: device_grades.id,
        grade_id: device_grades.grade_id,
        grade_name: grades.name,
        grade_color: grades.color
      })
      .from(device_grades)
      .innerJoin(grades, eq(device_grades.grade_id, grades.id))
      .where(and(
        eq(device_grades.device_id, deviceId),
        eq(device_grades.tenant_id, tenantId),
        eq(device_grades.status, true)
      ))
      .orderBy(desc(device_grades.created_at))
    
    return currentGrade
  }

  /**
   * Deactivate current device grade
   */
  async deactivateCurrentGrade(deviceId: number, tenantId: number) {
    await this.database
      .update(device_grades)
      .set({ 
        status: false,
        updated_at: new Date()
      })
      .where(and(
        eq(device_grades.device_id, deviceId),
        eq(device_grades.tenant_id, tenantId),
        eq(device_grades.status, true)
      ))
  }

  /**
   * Create new device grade record
   */
  async createDeviceGrade(deviceId: number, gradeId: number, actorId: number, tenantId: number) {
    const [newGrade] = await this.database
      .insert(device_grades)
      .values({
        device_id: deviceId,
        grade_id: gradeId,
        actor_id: actorId,
        tenant_id: tenantId,
        status: true
      })
      .$returningId()
    
    return newGrade.id
  }

  /**
   * Create device event for stock in operation
   */
  async createStockInEvent(
    deviceId: number, 
    actorId: number, 
    tenantId: number, 
    gradeName: string, 
    gradeColor: string,
    warehouseName: string, 
    actorName: string,
    remarks?: string
  ) {
    const [event] = await this.database
      .insert(device_events)
      .values({
        device_id: deviceId,
        actor_id: actorId,
        event_type: 'TEST_COMPLETED',
        details: {
          action: 'stock_in',
          grade_name: gradeName,
          grade_color: gradeColor,
          warehouse_name: warehouseName,
          actor_name: actorName,
          remarks: remarks || 'Device graded and stocked in'
        },
        tenant_id: tenantId
      })
      .$returningId()
    
    return event.id
  }

  /**
   * Get device grade history
   */
  async getDeviceGradeHistory(deviceId: number, tenantId: number) {
    const history = await this.database
      .select({
        id: device_grades.id,
        grade_name: grades.name,
        grade_color: grades.color,
        actor_id: device_grades.actor_id,
        created_at: device_grades.created_at,
        status: device_grades.status
      })
      .from(device_grades)
      .innerJoin(grades, eq(device_grades.grade_id, grades.id))
      .where(and(
        eq(device_grades.device_id, deviceId),
        eq(device_grades.tenant_id, tenantId)
      ))
      .orderBy(desc(device_grades.created_at))

    return history
  }

  /**
   * Complete stock in process - combines all operations in a transaction
   */
  async processStockIn(
    request: StockInRequestInput,
    actorId: number,
    tenantId: number
  ): Promise<StockInResponse | null> {
    return await this.database.transaction(async (tx) => {
      // Find device by IMEI
      const device = await this.findDeviceByIMEI(request.imei, tenantId)
      if (!device) {
        throw new Error(`Device with IMEI ${request.imei} not found`)
      }

      // Find grade
      const grade = await this.findGradeById(request.grade_id, tenantId)
      if (!grade) {
        throw new Error(`Grade with ID ${request.grade_id} not found`)
      }

      // Find warehouse
      const warehouse = await this.findWarehouseById(request.warehouse_id, tenantId)
      if (!warehouse) {
        throw new Error(`Warehouse with ID ${request.warehouse_id} not found`)
      }

      // Find actor (user)
      const actor = await this.findUserById(actorId, tenantId)
      if (!actor) {
        throw new Error(`User with ID ${actorId} not found`)
      }

      // Check if device already has this grade
      const currentGrade = await this.getCurrentDeviceGrade(device.id, tenantId)
      if (currentGrade && currentGrade.grade_id === request.grade_id) {
        throw new Error(`Device already has grade "${grade.name}"`)
      }

      // Deactivate current grade if exists
      if (currentGrade) {
        await this.deactivateCurrentGrade(device.id, tenantId)
      }

      // Create new device grade
      const deviceGradeId = await this.createDeviceGrade(
        device.id,
        request.grade_id,
        actorId,
        tenantId
      )

      // Create device event with warehouse information
      const eventId = await this.createStockInEvent(
        device.id,
        actorId,
        tenantId,
        grade.name,
        grade.color,
        warehouse.name,
        actor.name,
        request.remarks
      )

      return {
        device_id: device.id,
        imei: device.imei!,
        grade_id: grade.id,
        grade_name: grade.name,
        grade_color: grade.color,
        device_grade_id: deviceGradeId,
        event_id: eventId,
        warehouse_id: warehouse.id,
        warehouse_name: warehouse.name,
        actor_id: actor.id,
        actor_name: actor.name,
        message: `Device ${device.imei} successfully graded as "${grade.name}" and stocked in at ${warehouse.name} by ${actor.name}`
      }
    })
  }
}

export const stockInRepository = new StockInRepository(db)
