import { and, between, count, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '../../db'
import { test_results, warehouses as warehousesTable, users as usersTable, devices } from '../../db/circtek.schema'
import { OverviewStats, TimeSeriesPoint, WarehouseThroughput, TesterThroughput, DeviceTypeDistribution } from './types'

export class DiagnosticsStatsRepository {
  constructor(private readonly database: typeof db) {}

  private parseDate(input?: string): Date | undefined {
    if (!input) return undefined
    const tryParse = (s: string) => {
      const d = new Date(s)
      return isNaN(d.getTime()) ? undefined : d
    }
    // Try raw first
    let d = tryParse(input)
    if (d) return d
    // Try decoding once if it was percent-encoded
    try {
      const decoded = decodeURIComponent(input)
      d = tryParse(decoded)
      if (d) return d
    } catch {}
    return undefined
  }

  private resolveDateRange(from?: string, to?: string) {
    const parsedTo = this.parseDate(to)
    const toDate = parsedTo ?? new Date()
    const parsedFrom = this.parseDate(from)
    const fromDate = parsedFrom ?? new Date(toDate.getTime() - 29 * 24 * 60 * 60 * 1000)
    return { fromDate, toDate }
  }

  async overview(tenantId?: number): Promise<OverviewStats> {
    const whereTenant = typeof tenantId === 'number' ? eq(test_results.tenant_id, tenantId) : undefined

    const [[allTime], [todayRow], [sevenRow], [thirtyRow], [unlabeled]] = await Promise.all([
      this.database.select({ c: count() }).from(test_results).where(whereTenant as any),
      this.database
        .select({ c: count() })
        .from(test_results)
        .where(and(whereTenant as any, gte(test_results.created_at, sql`DATE(NOW())`)) as any),
      this.database
        .select({ c: count() })
        .from(test_results)
        .where(and(whereTenant as any, gte(test_results.created_at, sql`DATE_SUB(DATE(NOW()), INTERVAL 6 DAY)`)) as any),
      this.database
        .select({ c: count() })
        .from(test_results)
        .where(and(whereTenant as any, gte(test_results.created_at, sql`DATE_SUB(DATE(NOW()), INTERVAL 29 DAY)`)) as any),
      this.database
        .select({ c: count() })
        .from(test_results)
        .where(and(whereTenant as any, eq(test_results.label_printed, false)) as any),
    ])

    return {
      total_all_time: allTime?.c ?? 0,
      today: todayRow?.c ?? 0,
      last_7_days: sevenRow?.c ?? 0,
      last_30_days: thirtyRow?.c ?? 0,
      unlabeled_all_time: unlabeled?.c ?? 0,
    }
  }

  async timeSeries(from?: string, to?: string, interval: 'day' | 'week' = 'day', tenantId?: number, deviceType?: string): Promise<TimeSeriesPoint[]> {
    const { fromDate, toDate } = this.resolveDateRange(from, to)
    const whereParts: any[] = [
      gte(test_results.created_at, fromDate as any),
      (to ? lte(test_results.created_at, toDate as any) : lte(test_results.created_at, sql`NOW()`)),
    ]
    if (typeof tenantId === 'number') whereParts.push(eq(test_results.tenant_id, tenantId))
    const joins: any[] = []
    if (deviceType) {
      joins.push(['devices', devices])
      whereParts.push(eq(devices.device_type as any, deviceType as any))
    }

    const bucketExpr = interval === 'week'
      ? sql`DATE_FORMAT(${test_results.created_at}, '%x-%v')`
      : sql`DATE_FORMAT(${test_results.created_at}, '%Y-%m-%d')`

    const qb = this.database
      .select({ bucket: bucketExpr as any, c: count() })
      .from(test_results)
    const rows = await (
      deviceType
        ? qb.leftJoin(devices, eq(test_results.device_id, devices.id)).where(and(...whereParts) as any)
        : qb.where(and(...whereParts) as any)
    )
      .groupBy(bucketExpr as any)
      .orderBy(bucketExpr as any)

    return rows.map(r => ({ bucket: (r as any).bucket, count: (r as any).c }))
  }

  async byWarehouse(from?: string, to?: string, tenantId?: number): Promise<WarehouseThroughput[]> {
    const { fromDate, toDate } = this.resolveDateRange(from, to)
    const whereParts: any[] = [
      gte(test_results.created_at, fromDate as any),
      (to ? lte(test_results.created_at, toDate as any) : lte(test_results.created_at, sql`NOW()`)),
    ]
    if (typeof tenantId === 'number') whereParts.push(eq(test_results.tenant_id, tenantId))

    const rows = await this.database
      .select({
        warehouse_id: test_results.warehouse_id,
        warehouse_name: warehousesTable.name,
        c: count(),
      })
      .from(test_results)
      .leftJoin(warehousesTable, eq(test_results.warehouse_id, warehousesTable.id))
      .where(and(...whereParts) as any)
      .groupBy(test_results.warehouse_id, warehousesTable.name)

    return rows.map(r => ({ warehouse_id: (r as any).warehouse_id, warehouse_name: (r as any).warehouse_name, count: (r as any).c }))
  }

  async byTester(from?: string, to?: string, tenantId?: number): Promise<TesterThroughput[]> {
    const { fromDate, toDate } = this.resolveDateRange(from, to)
    const whereParts: any[] = [
      gte(test_results.created_at, fromDate as any),
      (to ? lte(test_results.created_at, toDate as any) : lte(test_results.created_at, sql`NOW()`)),
    ]
    if (typeof tenantId === 'number') whereParts.push(eq(test_results.tenant_id, tenantId))

    const rows = await this.database
      .select({
        tester_id: test_results.tester_id,
        tester_username: usersTable.user_name,
        c: count(),
      })
      .from(test_results)
      .leftJoin(usersTable, eq(test_results.tester_id, usersTable.id))
      .where(and(...whereParts) as any)
      .groupBy(test_results.tester_id, usersTable.user_name)

    return rows.map(r => ({ tester_id: (r as any).tester_id, tester_username: (r as any).tester_username, count: (r as any).c }))
  }

  async deviceTypeDistribution(from?: string, to?: string, tenantId?: number): Promise<DeviceTypeDistribution[]> {
    const { fromDate, toDate } = this.resolveDateRange(from, to)
    const whereParts: any[] = [
      gte(test_results.created_at, fromDate as any),
      (to ? lte(test_results.created_at, toDate as any) : lte(test_results.created_at, sql`NOW()`)),
    ]
    if (typeof tenantId === 'number') whereParts.push(eq(test_results.tenant_id, tenantId))

    const rows = await this.database
      .select({
        device_type: devices.device_type,
        c: count(),
      })
      .from(test_results)
      .leftJoin(devices, eq(test_results.device_id, devices.id))
      .where(and(...whereParts) as any)
      .groupBy(devices.device_type)

    return rows.map(r => ({ device_type: String((r as any).device_type), count: (r as any).c }))
  }
}


