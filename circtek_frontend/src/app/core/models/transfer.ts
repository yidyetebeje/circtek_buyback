export interface TransferItemRecord {
  id: number;
  transfer_id: number;
  sku: string;
  device_id: number;
  is_part: boolean | null;
  quantity: number | null;
  status: boolean | null;
  tenant_id: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface TransferWithDetails {
  id: number;
  from_warehouse_id: number;
  from_warehouse_name?: string;
  to_warehouse_id: number;
  to_warehouse_name?: string;
  status: boolean | null;
  created_by: number;
  created_by_name?: string;
  completed_by?: number | null;
  completed_at?: string | null;
  tenant_id: number;
  created_at: string | null;
  updated_at: string | null;
  items: Array<TransferItemRecord & {
    device_sku?: string;
    device_model?: string;
  }>;
  total_items: number;
  total_quantity: number;
  is_completed: boolean;
}

export interface TransferCompletionResult {
  transfer_id: number;
  movements_created: number;
  total_items_transferred: number;
  total_quantity_transferred: number;
  from_warehouse_id: number;
  to_warehouse_id: number;
  device_events_created: number;
}

export interface TransferSummary {
  total_transfers: number;
  pending_transfers: number;
  completed_transfers: number;
  total_items_in_transit: number;
  by_warehouse: Record<string, {
    outbound: number;
    inbound: number;
  }>;
}
