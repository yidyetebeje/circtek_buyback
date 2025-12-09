import { t, type Static } from 'elysia'

export const DashboardStatsQuery = t.Object({
  tenant_id: t.Optional(t.Number()),
  from: t.Optional(t.String()),
  to: t.Optional(t.String()),
})

export type DashboardStatsQuery = Static<typeof DashboardStatsQuery>

export type DashboardOverviewStats = {
  // Diagnostics stats
  total_diagnostics: number
  diagnostics_today: number
  diagnostics_this_week: number
  diagnostics_this_month: number

  // Device stats
  total_devices: number
  devices_by_type: DeviceTypeCount[]
  test_devices_by_type: TestDeviceTypeCount[]

  // Stock stats
  total_stock_items: number
  low_stock_alerts: number

  // User stats
  total_users: number
  active_users: number

  // Warehouse stats
  total_warehouses: number

  // Tenant stats (super admin only)
  total_tenants?: number

  // Purchase stats
  total_purchases: number
  pending_purchases: number

  // Transfer stats
  total_transfers: number
  pending_transfers: number

  // Repair stats
  total_repairs: number
  active_repairs: number
  repairs_today: number
  repairs_this_week: number
  repairs_this_month: number
}

export type DeviceTypeCount = {
  device_type: string
  count: number
}

export type TestDeviceTypeCount = {
  device_type: string
  test_count: number
}

export type StockAlert = {
  sku: string
  warehouse_name: string
  current_quantity: number
  threshold: number
}

export type RecentActivity = {
  id: number
  report: string
  tested: string
  imei: string
}

export type WarehouseStats = {
  warehouse_id: number
  warehouse_name: string
  device_type_counts: TestDeviceTypeCount[]
}

export type MonthlyTrend = {
  month: string
  diagnostics: number
}

export type DiagnosticsMonthlyTrend = {
  month: string
  diagnostics_count: number
}
