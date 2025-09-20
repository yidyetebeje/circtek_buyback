export interface SkuUsageAnalyticsItem {
  warehouse_name: string;
  warehouse_id: number;
  part_sku: string;
  quantity_used: number;
  current_stock: number;
  expected_days_until_empty: number | null;
  usage_per_day: number;
  period_start: string;
  period_end: string;
  period_days: number;
}

export interface SkuUsageAnalyticsSummary {
  total_parts_analyzed: number;
  total_quantity_used: number;
  average_usage_per_day: number;
  parts_at_risk: number;
  parts_with_zero_usage: number;
  warehouses_count: number;
}

export interface SkuUsageAnalyticsResult {
  items: SkuUsageAnalyticsItem[];
  summary: SkuUsageAnalyticsSummary;
  total: number;
  page: number;
  limit: number;
  period_info: {
    start_date: string;
    end_date: string;
    days: number;
  };
}

export interface SkuUsageAnalyticsQuery {
  period_days?: number;
  start_date?: string;
  end_date?: string;
  warehouse_id?: number;
  sku?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'warehouse_name' | 'part_sku' | 'quantity_used' | 'current_stock' | 'expected_days_until_empty' | 'usage_per_day';
  sort_dir?: 'asc' | 'desc';
  min_usage?: number;
  max_days_until_empty?: number;
  only_parts?: boolean;
}