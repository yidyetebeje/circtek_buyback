export interface StockWithWarehouse {
  id: number;
  sku: string;
  is_part: boolean;
  quantity: number;
  warehouse_id: number;
  warehouse_name?: string;
  status: boolean;
  tenant_id: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface StockSummary {
  total_skus: number;
  total_quantity: number;
  low_stock_items: number;
  warehouses_count: number;
}

export interface StockLevel {
  sku: string;
  warehouse_id: number;
  warehouse_name?: string;
  current_quantity: number;
  is_low_stock: boolean;
  is_part: boolean;
}
