export interface DashboardOverviewStats {
  // Diagnostics stats
  total_diagnostics: number;
  diagnostics_today: number;
  diagnostics_this_week: number;
  diagnostics_this_month: number;
  
  // Device stats
  total_devices: number;
  devices_by_type: DeviceTypeCount[];
  test_devices_by_type: TestDeviceTypeCount[];
  
  // Stock stats
  total_stock_items: number;
  low_stock_alerts: number;
  
  // User stats
  total_users: number;
  active_users: number;
  
  // Warehouse stats
  total_warehouses: number;
  
  // Tenant stats (super admin only)
  total_tenants?: number;
  
  // Purchase stats
  total_purchases: number;
  pending_purchases: number;
  
  // Transfer stats
  total_transfers: number;
  pending_transfers: number;
  
  // Repair stats
  total_repairs: number;
  active_repairs: number;
}

export interface DeviceTypeCount {
  device_type: string;
  count: number;
}

export interface TestDeviceTypeCount {
  device_type: string;
  test_count: number;
}

export interface StockAlert {
  sku: string;
  warehouse_name: string;
  current_quantity: number;
  threshold: number;
}

export interface RecentActivity {
  id: number;
  report: string;
  tested: string;
  imei: string;
}

export interface TestDeviceTypeCount {
  device_type: string;
  test_count: number;
}

export interface WarehouseStats {
  warehouse_id: number;
  warehouse_name: string;
  device_type_counts: TestDeviceTypeCount[];
}

export interface MonthlyTrend {
  month: string;
  diagnostics: number;
}
