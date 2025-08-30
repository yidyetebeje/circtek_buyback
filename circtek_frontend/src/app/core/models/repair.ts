export interface RepairRecord {
  id: number;
  device_id: number;
  device_sku: string;
  reason_id: number;
  remarks: string | null;
  status: boolean;
  actor_id: number;
  tenant_id: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface RepairItemRecord {
  id: number;
  repair_id: number;
  sku: string;
  quantity: number;
  cost: number;
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
  device_sku: string;
  reason_id: number;
  remarks?: string;
  actor_id: number;
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
  actor_id: number;
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

export interface RepairListResult {
  rows: RepairRecord[];
  total: number;
  page: number;
  limit: number;
}
