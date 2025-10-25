export interface RepairRecord {
  id: number;
  device_id: number;
  reason_id?: number;
  remarks: string | null;
  status: boolean;
  actor_id: number;
  tenant_id: number;
  warehouse_id: number;
  warehouse_name?: string;
  repairer_username?: string;
  device_sku?: string;
  device_imei?: string;
  device_serial?: string;
  consumed_items?: Array<{
    part_sku: string;
    reason: string | null;
  }>;
  created_at: string | null;
  updated_at: string | null;
}

export interface RepairItemRecord {
  id: number;
  repair_id: number;
  sku: string;
  quantity: number;
  cost: number;
  reason_id?: number;
  reason_name?: string;
  purchase_items_id: number | null;
  status: boolean;
  tenant_id: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface RepairWithItems {
  repair: RepairRecord;
  items: RepairItemRecord[];
  total_items: number;
  total_quantity: number;
  total_cost: number;
}

export interface RepairCreateInput {
  device_id: number;
  reason_id: number;
  remarks?: string;
}

export interface RepairQueryInput {
  device_id?: number;
  reason_id?: number;
  status?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RepairConsumeItemsInput {
  warehouse_id: number;
  items: Array<{
    sku: string;
    quantity: number;
  }>;
  notes?: string;
}

export interface ConsumeResultItem {
  sku: string;
  quantity: number;
  cost: number | null;
  success: boolean;
  movement_status: number;
}

export interface RepairConsumeResult {
  repair_id: number;
  items_count: number;
  total_quantity_consumed: number;
  total_cost: number;
  results: ConsumeResultItem[];
}

export interface RepairCreateWithConsumeInput {
  // Repair information
  device_id: number;
  remarks?: string;
  // Consumption information
  warehouse_id: number;
  items: Array<{
    sku: string;
    quantity: number;
    reason_id: number;
  }>;
  notes?: string;
}

export interface RepairCreateWithConsumeResult {
  repair: RepairRecord;
  consume_result: RepairConsumeResult;
}

export interface RepairListResult {
  rows: RepairRecord[];
  total: number;
  page: number;
  limit: number;
}

// Analytics types
export interface RepairAnalyticsQueryInput {
  date_from?: string;
  date_to?: string;
  warehouse_id?: number;
  model_name?: string;
  reason_id?: number;
}

export interface WarehouseAnalytics {
  warehouse_id: number;
  warehouse_name: string;
  total_repairs: number;
  total_parts_used: number;
  total_quantity_consumed: number;
  total_cost: number;
  average_cost_per_repair: number;
}

export interface ReasonAnalytics {
  reason_id: number;
  reason_name: string;
  total_repairs: number;
  total_parts_used: number;
  total_quantity_consumed: number;
  total_cost: number;
  average_cost_per_repair: number;
}

export interface SkuUsage {
  sku: string;
  usage_count: number;
  total_quantity: number;
  total_cost: number;
}

export interface ModelAnalytics {
  model_name: string;
  warehouse_id: number | null;
  warehouse_name: string | null;
  total_repairs: number;
  unique_devices: number;
  total_parts_used: number;
  total_quantity_consumed: number;
  total_cost: number;
  average_cost_per_repair: number;
  most_common_parts: SkuUsage[];
}

export interface RepairAnalytics {
  summary: {
    total_repairs: number;
    total_parts_used: number;
    total_quantity_consumed: number;
    total_cost: number;
    average_cost_per_repair: number;
  };
  by_warehouse: WarehouseAnalytics[];
  by_model: ModelAnalytics[];
  by_reason: ReasonAnalytics[];
}

export interface IMEIAnalyticsQueryInput {
  date_from?: string;
  date_to?: string;
  warehouse_id?: number;
  model_name?: string;
  reason_id?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IMEIAnalytics {
  device_id: number;
  device_imei: string;
  device_serial: string | null;
  device_sku: string;
  model_name: string | null;
  warehouse_name: string | null;
  total_repairs: number;
  total_parts_used: number;
  total_quantity_consumed: number;
  total_cost: number;
  parts_breakdown: SkuUsage[];
}

export interface IMEIAnalyticsResult {
  items: IMEIAnalytics[];
  total: number;
  page: number;
  limit: number;
}
