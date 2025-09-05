import type { MySql2Database } from 'drizzle-orm/mysql2'
import { and, count, eq, gte, lte, sql, desc, max } from 'drizzle-orm'
import { 
  test_results, 
  devices, 
  users, 
  warehouses, 
  tenants,
  stock,
  purchases,
  transfers,
  repairs
} from '../../db/circtek.schema'
import type { 
  DashboardOverviewStats, 
  DeviceTypeCount, 
  TestDeviceTypeCount,
  StockAlert, 
  RecentActivity, 
  WarehouseStats, 
  MonthlyTrend,
  DiagnosticsMonthlyTrend
} from './types'

export class DashboardStatsRepository {
  constructor(private readonly db: MySql2Database<any>) {}

  async getOverviewStats(tenantId?: number, from?: string, to?: string): Promise<DashboardOverviewStats> {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const toDate = to ? new Date(to) : new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Base conditions
    const tenantCondition = tenantId ? eq(test_results.tenant_id, tenantId) : undefined

    // Diagnostics stats
    const [totalDiagnostics] = await this.db
      .select({ count: count() })
      .from(test_results)
      .where(tenantCondition)

    const [diagnosticsToday] = await this.db
      .select({ count: count() })
      .from(test_results)
      .where(and(
        tenantCondition,
        gte(test_results.created_at, today)
      ))

    const [diagnosticsThisWeek] = await this.db
      .select({ count: count() })
      .from(test_results)
      .where(and(
        tenantCondition,
        gte(test_results.created_at, weekAgo)
      ))

    const [diagnosticsThisMonth] = await this.db
      .select({ count: count() })
      .from(test_results)
      .where(and(
        tenantCondition,
        gte(test_results.created_at, monthAgo)
      ))

    // Device stats
    const deviceCondition = tenantId ? eq(devices.tenant_id, tenantId) : undefined
    
    const [totalDevices] = await this.db
      .select({ count: count() })
      .from(devices)
      .where(deviceCondition)

    const devicesByType = await this.db
      .select({
        device_type: devices.device_type,
        count: count()
      })
      .from(devices)
      .where(deviceCondition)
      .groupBy(devices.device_type)

    // Test device type distribution (from test_results)
    const testDevicesByType = await this.db
      .select({
        device_type: sql<string>`COALESCE(${devices.device_type}, 'Unknown')`.as('device_type'),
        test_count: count()
      })
      .from(test_results)
      .leftJoin(devices, eq(devices.id, test_results.device_id))
      .where(tenantCondition)
      .groupBy(devices.device_type)

    // Stock stats
    const stockCondition = tenantId ? eq(stock.tenant_id, tenantId) : undefined
    
    const [totalStockItems] = await this.db
      .select({ count: count() })
      .from(stock)
      .where(stockCondition)

    const [lowStockAlerts] = await this.db
      .select({ count: count() })
      .from(stock)
      .where(and(
        stockCondition,
        lte(stock.quantity, 10) // Consider items with quantity <= 10 as low stock
      ))

    // User stats
    const userCondition = tenantId ? eq(users.tenant_id, tenantId) : undefined
    
    const [totalUsers] = await this.db
      .select({ count: count() })
      .from(users)
      .where(userCondition)

    const [activeUsers] = await this.db
      .select({ count: count() })
      .from(users)
      .where(and(
        userCondition,
        eq(users.status, true)
      ))

    // Warehouse stats
    const warehouseCondition = tenantId ? eq(warehouses.tenant_id, tenantId) : undefined
    
    const [totalWarehouses] = await this.db
      .select({ count: count() })
      .from(warehouses)
      .where(warehouseCondition)

    // Purchase stats
    const purchaseCondition = tenantId ? eq(purchases.tenant_id, tenantId) : undefined
    
    const [totalPurchases] = await this.db
      .select({ count: count() })
      .from(purchases)
      .where(purchaseCondition)

    const [pendingPurchases] = await this.db
      .select({ count: count() })
      .from(purchases)
      .where(and(
        purchaseCondition,
        eq(purchases.status, true)
      ))

    // Transfer stats
    const transferCondition = tenantId ? eq(transfers.tenant_id, tenantId) : undefined
    
    const [totalTransfers] = await this.db
      .select({ count: count() })
      .from(transfers)
      .where(transferCondition)

    const [pendingTransfers] = await this.db
      .select({ count: count() })
      .from(transfers)
      .where(and(
        transferCondition,
        eq(transfers.status, false)
      ))

    // Repair stats
    const repairCondition = tenantId ? eq(repairs.tenant_id, tenantId) : undefined
    
    const [totalRepairs] = await this.db
      .select({ count: count() })
      .from(repairs)
      .where(repairCondition)

    const [activeRepairs] = await this.db
      .select({ count: count() })
      .from(repairs)
      .where(and(
        repairCondition,
        eq(repairs.status, true)
      ))

    // Tenant stats (super admin only)
    let totalTenants: number | undefined
    if (!tenantId) {
      const [tenantsCount] = await this.db
        .select({ count: count() })
        .from(tenants)
      totalTenants = tenantsCount.count
    }

    return {
      total_diagnostics: totalDiagnostics.count,
      diagnostics_today: diagnosticsToday.count,
      diagnostics_this_week: diagnosticsThisWeek.count,
      diagnostics_this_month: diagnosticsThisMonth.count,
      total_devices: totalDevices.count,
      devices_by_type: devicesByType.map(d => ({
        device_type: d.device_type || 'Unknown',
        count: d.count
      })),
      test_devices_by_type: testDevicesByType.map(d => ({
        device_type: d.device_type,
        test_count: d.test_count
      })),
      total_stock_items: totalStockItems.count,
      low_stock_alerts: lowStockAlerts.count,
      total_users: totalUsers.count,
      active_users: activeUsers.count,
      total_warehouses: totalWarehouses.count,
      total_tenants: totalTenants,
      total_purchases: totalPurchases.count,
      pending_purchases: pendingPurchases.count,
      total_transfers: totalTransfers.count,
      pending_transfers: pendingTransfers.count,
      total_repairs: totalRepairs.count,
      active_repairs: activeRepairs.count
    }
  }

  async getWarehouseStats(tenantId?: number): Promise<WarehouseStats[]> {
    const tenantCondition = tenantId ? eq(warehouses.tenant_id, tenantId) : undefined

    // Get device type counts per warehouse
    const warehouseDeviceTypes = await this.db
      .select({
        warehouse_id: warehouses.id,
        warehouse_name: warehouses.name,
        device_type: sql<string>`COALESCE(${devices.make}, 'Unknown')`.as('device_type'),
        test_count: count(test_results.id)
      })
      .from(warehouses)
      .leftJoin(test_results, eq(test_results.warehouse_id, warehouses.id))
      .leftJoin(devices, eq(devices.id, test_results.device_id))
      .where(tenantCondition)
      .groupBy(warehouses.id, warehouses.name, sql`COALESCE(${devices.make}, 'Unknown')`)

    // Group by warehouse
    const warehouseMap = new Map<number, WarehouseStats>()
    
    for (const row of warehouseDeviceTypes) {
      if (!warehouseMap.has(row.warehouse_id)) {
        warehouseMap.set(row.warehouse_id, {
          warehouse_id: row.warehouse_id,
          warehouse_name: row.warehouse_name,
          device_type_counts: []
        })
      }
      
      if (row.test_count > 0) {
        warehouseMap.get(row.warehouse_id)!.device_type_counts.push({
          device_type: row.device_type,
          test_count: row.test_count
        })
      }
    }

    return Array.from(warehouseMap.values())
  }

  async getRecentActivity(tenantId?: number, limit: number = 5): Promise<RecentActivity[]> {
    // Get recent test results with device information
    const recentTests = await this.db
      .select({
        id: test_results.id,
        imei: test_results.imei,
        tested: test_results.created_at,
        passed_components: test_results.passed_components,
        failed_components: test_results.failed_components
      })
      .from(test_results)
      .where(tenantId ? eq(test_results.tenant_id, tenantId) : undefined)
      .orderBy(desc(test_results.created_at))
      .limit(limit)

    return recentTests.map(test => {
      const hasPassedComponents = test.passed_components && test.passed_components !== ''
      const hasFailedComponents = test.failed_components && test.failed_components !== ''
      
      let report = 'Unknown'
      
     if (hasFailedComponents) {
        report = 'Fail'
      } else {
        report = 'Pass'
      }

      return {
        id: test.id,
        report,
        tested: test.tested?.toISOString().split('T')[0] || '',
        imei: test.imei || 'N/A'
      }
    })
  }

  async getMonthlyTrends(tenantId?: number, months: number = 6, from?: string, to?: string): Promise<MonthlyTrend[]> {
    const trends: MonthlyTrend[] = []
    
    // If date range is provided, use it; otherwise use default months
    if (from && to) {
      const startDate = new Date(from)
      const endDate = new Date(to)
      
      // Generate monthly data for the date range
      const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      const end = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0)
      
      while (current <= end) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1)
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59)
        const monthName = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

        const [diagnosticsCount] = await this.db
          .select({ count: count() })
          .from(test_results)
          .where(and(
            tenantId ? eq(test_results.tenant_id, tenantId) : undefined,
            gte(test_results.created_at, monthStart),
            lte(test_results.created_at, monthEnd)
          ))

        trends.push({
          month: monthName,
          diagnostics: diagnosticsCount.count
        })
        
        current.setMonth(current.getMonth() + 1)
      }
    } else {
      // Default behavior - current month only
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

      const [diagnosticsCount] = await this.db
        .select({ count: count() })
        .from(test_results)
        .where(and(
          tenantId ? eq(test_results.tenant_id, tenantId) : undefined,
          gte(test_results.created_at, monthStart),
          lte(test_results.created_at, monthEnd)
        ))

      trends.push({
        month: monthName,
        diagnostics: diagnosticsCount.count
      })
    }

    return trends
  }
}
