// Dead IMEI models matching backend types
export interface DeadIMEIRecord {
  id: number;
  sku: string;
  warehouse_id: number;
  warehouse_name?: string;
  quantity_adjustment: number;
  reason: string;
  notes: string | null;
  device_id: number | null;
  device_serial?: string;
  device_imei?: string;
  actor_id: number;
  actor_name?: string;
  created_at: Date | null;
  tenant_id: number;
}

export interface DeadIMEICreateInput {
  device_id: number;
  sku: string;
  warehouse_id: number;
  reason_notes?: string;
  actor_id: number;
}

export interface DeadIMEIQueryInput {
  warehouse_id?: number;
  sku?: string;
  device_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DeadIMEIResult {
  adjustment: DeadIMEIRecord;
  movement_created: boolean;
  stock_updated: boolean;
  device_event_created: boolean;
}
