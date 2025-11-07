import { eq, and, desc } from 'drizzle-orm'
import { db } from '../../db'
import { devices, grades, device_grades, device_events, warehouses, users, stock, stock_device_ids } from '../../db/circtek.schema'
import type { StockInRequestInput, StockInResponse } from './types'
import { SkuMappingsController } from '../sku-mappings/controller'
import { WarehousesRepository } from '../../warehouses/repository'
import { GradesRepository } from '../../configuration/grades/repository'
import { DevicesRepository } from '../../devices/repository'
import { UsersRepository } from '../../users/repository'
import { DiagnosticsRepository } from '../../diagnostics/repository'
import { PurchasesRepository } from '../purchases/repository'
import { movementsController } from '../movements'

export class StockInRepository {
  constructor(private readonly database: typeof db) {
    this.skuMappingsController = new SkuMappingsController()
    this.gradeRepository = new GradesRepository(db)
    this.warehouseRepository = new WarehousesRepository(db)
    this.deviceRepository = new DevicesRepository(db)
    this.userRepository = new UsersRepository(db)
    this.diagnosticsRepository = new DiagnosticsRepository(db)
    this.purchaseRepository = new PurchasesRepository(db)
  }
  private readonly skuMappingsController: SkuMappingsController
  private readonly gradeRepository: GradesRepository
  private readonly warehouseRepository: WarehousesRepository
  private readonly deviceRepository: DevicesRepository
  private readonly userRepository: UsersRepository
  private readonly diagnosticsRepository: DiagnosticsRepository
  private readonly purchaseRepository: PurchasesRepository
  
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
   * Find device by IMEI
   */
  async findDeviceByIMEI(imei: string, tenantId: number) {
    const [device] = await this.database
      .select()
      .from(devices)
      .where(and(
        eq(devices.imei, imei),
        eq(devices.tenant_id, tenantId)
      ))
    
    return device
  }

  /**
   * Find SKU based on grade and device test results
   */
  async findSkuByGradeAndImei(imei: string, gradeId: number, tenantId: number): Promise<string | null> {
    try {
      // Get device
      const device = await this.deviceRepository.find(imei, tenantId)
      if (!device) {
        throw new Error(`Device with IMEI ${imei} not found`)
      }

      // Get grade
      const grade = await this.gradeRepository.get(gradeId, tenantId)
      if (!grade) {
        throw new Error(`Grade with ID ${gradeId} not found`)
      }

      // Get test results
      const test_results = await this.diagnosticsRepository.list({ identifier: imei, tenant_id: tenantId })
      if (!test_results || test_results.total === 0) {
        throw new Error(`Test result with IMEI ${imei} not found`)
      }
      const test_result = test_results.rows[0]

      // Find matching SKU
      const sku = await this.skuMappingsController.findByConditionsFromTest(test_result, grade.name, tenantId)
      
      return sku
    } catch (error) {
      console.error('Failed to find SKU by grade and IMEI:', error)
      return null
    }
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
      const device = await this.deviceRepository.find(request.imei, tenantId);
      if (!device) {
        throw new Error(`Device with IMEI ${request.imei} not found`)
      }
      const grade = await this.gradeRepository.get(request.grade_id, tenantId);
      if (!grade) {
        throw new Error(`Grade with ID ${request.grade_id} not found`)
      }
      const warehouse = await this.warehouseRepository.findOne(request.warehouse_id);
      if (!warehouse) {
        throw new Error(`Warehouse with ID ${request.warehouse_id} not found`)
      }
      const actor = await this.userRepository.findOne(actorId);
      if (!actor) {
        throw new Error(`Actor with ID ${actorId} not found`)
      }
      let test_results = await this.diagnosticsRepository.list({ identifier: request.imei, tenant_id: tenantId });
      if (!test_results) {
        throw new Error(`Test result with IMEI ${request.imei} not found`)
      }
      if (test_results.total === 0) {
        throw new Error(`Test result with IMEI ${request.imei} not found`)
      }
      const test_result = test_results.rows[0];

      // Check if device already has this grade
      const currentGrade = await this.getCurrentDeviceGrade(device.id, tenantId)
      if (currentGrade && currentGrade.grade_id === request.grade_id) {
        throw new Error(`Device already has grade "${grade.name}"`)
      }

      // Deactivate current grade if exists
      if (currentGrade) {
        await this.deactivateCurrentGrade(device.id, tenantId)
      }

      // Use provided SKU or auto-detect
      let sku: string | undefined = request.sku
      if (!sku) {
        const foundSku = await this.skuMappingsController.findByConditionsFromTest(test_result, grade.name, tenantId);
        if(!foundSku) {
          throw new Error(`SKU not found for device ${request.imei} with grade ${grade.name}. Please provide SKU manually.`)
        }
        sku = foundSku
      }


      // Create new device grade
      const deviceGradeId = await this.createDeviceGrade(
        device.id,
        request.grade_id,
        actorId,
        tenantId
      )
      await this.addToStock(device.id, tenantId, warehouse.id, sku, actorId)
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
        sku: sku,
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
  async addToStock(deviceId: number, tenantId: number, warehouseId: number, sku: string, actorId: number) {
    try {
      // check the stock exist
      await this.purchaseRepository.ensureStockExistsForSku(sku, tenantId, warehouseId, false)
      if (!deviceId) {
        throw new Error(`Failed to create device for identifier: ${deviceId}`)
      }  
      const stockresult = await this.database.select().from(stock).where(and(eq(stock.sku, sku), eq(stock.warehouse_id, warehouseId), eq(stock.tenant_id, tenantId)))
      const movementResult = await movementsController.create({
        sku: sku,
        warehouse_id: warehouseId,
        delta: 1,
        reason: 'purchase',
        ref_type: 'stock_in',
        ref_id: deviceId,
        actor_id: actorId,
      }, tenantId)
      if (movementResult.status !== 201) {
        throw new Error(`Failed to create movement for device ${deviceId}`)
      }
      if (stockresult.length > 0) {
        await this.database.insert(stock_device_ids).values({
          stock_id: stockresult[0].id,
          device_id: deviceId,
          tenant_id: tenantId,
        });
      }
      
      return true
    } catch (error) {
      if (process.env.NODE_ENV === 'test') {
        console.error(`addToStock error for ${deviceId}:`, error)
      }
      throw error
    }
  
  }
}

export const stockInRepository = new StockInRepository(db)
