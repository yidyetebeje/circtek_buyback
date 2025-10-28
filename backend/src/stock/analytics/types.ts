import { t, type Static } from "elysia"

export const SkuUsageAnalyticsQuery = t.Object({
  // Time period filters
  period_days: t.Optional(t.Number({ default: 30, minimum: 1, maximum: 365 })),
  start_date: t.Optional(t.String({ format: 'date' })), // YYYY-MM-DD
  end_date: t.Optional(t.String({ format: 'date' })),   // YYYY-MM-DD
  
  // Filtering options
  warehouse_id: t.Optional(t.Number()),
  sku: t.Optional(t.String()),
  is_part: t.Optional(t.Boolean()),
  search: t.Optional(t.String()),
  
  // Pagination
  page: t.Optional(t.Number({ default: 1, minimum: 1 })),
  limit: t.Optional(t.Number({ default: 10, minimum: 1, maximum: 100 })),
  
  // Sorting
  sort_by: t.Optional(t.Union([
    t.Literal('warehouse_name'),
    t.Literal('part_sku'),
    t.Literal('quantity_used'),
    t.Literal('current_stock'),
    t.Literal('expected_days_until_empty'),
    t.Literal('usage_per_day')
  ])),
  sort_dir: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
  
  // Additional filters
  min_usage: t.Optional(t.Number({ minimum: 0 })),
  max_days_until_empty: t.Optional(t.Number({ minimum: 0 })),
  only_parts: t.Optional(t.Boolean({ default: true })), // Only show parts SKUs by default
  group_by_batch: t.Optional(t.Boolean({ default: false })) // Group SKUs by base pattern (exclude last batch number)
})

export type SkuUsageAnalyticsQueryInput = Static<typeof SkuUsageAnalyticsQuery>

export type SkuUsageAnalyticsItem = {
  warehouse_name: string
  warehouse_id: number
  part_sku: string
  quantity_used: number
  current_stock: number
  expected_days_until_empty: number | null // null means infinite (no usage) or not applicable
  usage_per_day: number
  period_start: string
  period_end: string
  period_days: number
}

export type SkuUsageAnalyticsSummary = {
  total_parts_analyzed: number
  total_quantity_used: number
  average_usage_per_day: number
  parts_at_risk: number // parts that will run out in next 30 days
  parts_with_zero_usage: number
  warehouses_count: number
}

export type SkuUsageAnalyticsResult = {
  items: SkuUsageAnalyticsItem[]
  summary: SkuUsageAnalyticsSummary
  total: number
  page: number
  limit: number
  period_info: {
    start_date: string
    end_date: string
    days: number
  }
}

// Internal types for calculations
export type SkuUsageCalculation = {
  warehouse_id: number
  warehouse_name: string
  sku: string
  total_used: number
  current_stock: number
  is_part: boolean
}

export type PeriodInfo = {
  start_date: Date
  end_date: Date
  days: number
}