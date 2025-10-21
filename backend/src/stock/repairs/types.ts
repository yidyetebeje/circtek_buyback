import { t, type Static } from "elysia"

export const RepairCreate = t.Object({
  device_id: t.Number(),
  remarks: t.Optional(t.String()),
  warehouse_id: t.Number(),
})

export const RepairQuery = t.Object({
  device_id: t.Optional(t.Number()),
  status: t.Optional(t.Boolean()),
  date_from: t.Optional(t.String()),
  date_to: t.Optional(t.String()),
  search: t.Optional(t.String()),
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
})

export const RepairConsumeItems = t.Object({
  warehouse_id: t.Number(),
  items: t.Array(t.Object({
    sku: t.String(), // Can be actual SKU or "fixed_price" for service-only repairs
    quantity: t.Number(),
    reason_id: t.Number(),
  })),
  notes: t.Optional(t.String()),
})

export type RepairCreateInput = Static<typeof RepairCreate>
export type RepairQueryInput = Static<typeof RepairQuery>
export type RepairConsumeItemsInput = Static<typeof RepairConsumeItems>

export type RepairRecord = {
  id: number
  device_id: number
  device_sku: string
  remarks: string | null
  status: boolean
  actor_id: number
  tenant_id: number
  warehouse_id: number
  warehouse_name?: string
  repairer_username?: string
  consumed_parts?: string[]
  repair_reasons?: string[]
  created_at: Date | null
  updated_at: Date | null
}

export type RepairItemRecord = {
  id: number
  repair_id: number
  sku: string
  quantity: number
  cost: number
  reason_id: number
  reason_name?: string
  purchase_items_id: number | null
  status: boolean
  tenant_id: number
  created_at: Date | null
  updated_at: Date | null
}

export type RepairWithItems = {
  repair: RepairRecord
  items: RepairItemRecord[]
  total_items: number
  total_quantity: number
  total_cost: number
}

export type RepairListResult = {
  rows: RepairRecord[]
  total: number
  page: number
  limit: number
}

export type ConsumeResultItem = {
  sku: string
  quantity: number
  cost: number | null
  success: boolean
  movement_status: number
}

export type RepairConsumeResult = {
  repair_id: number
  items_count: number
  total_quantity_consumed: number
  total_cost: number
  results: ConsumeResultItem[]
}


export const RepairCreateWithConsume = t.Object({
  // Repair information
  device_id: t.Number(),
  remarks: t.Optional(t.String()),
  // Consumption information
  warehouse_id: t.Number(),
  items: t.Array(t.Object({
    sku: t.String(), // Can be actual SKU or "fixed_price" for service-only repairs
    quantity: t.Number(),
    reason_id: t.Number(),
  })),
  notes: t.Optional(t.String()),
})

export type RepairCreateWithConsumeInput = Static<typeof RepairCreateWithConsume>

export type RepairCreateWithConsumeResult = {
  repair: RepairRecord
  consume_result: RepairConsumeResult
}

// Analytics types
export const RepairAnalyticsQuery = t.Object({
  date_from: t.Optional(t.String()),
  date_to: t.Optional(t.String()),
  warehouse_id: t.Optional(t.Number()),
  model_name: t.Optional(t.String()),
  reason_id: t.Optional(t.Number()),
})

export type RepairAnalyticsQueryInput = Static<typeof RepairAnalyticsQuery>

// Warehouse-level analytics
export type WarehouseAnalytics = {
  warehouse_id: number
  warehouse_name: string
  total_repairs: number
  total_parts_used: number
  total_quantity_consumed: number
  total_cost: number
  average_cost_per_repair: number
}

// Reason-level analytics
export type ReasonAnalytics = {
  reason_id: number
  reason_name: string
  total_repairs: number
  total_parts_used: number
  total_quantity_consumed: number
  total_cost: number
  average_cost_per_repair: number
}

// SKU usage details
export type SkuUsage = {
  sku: string
  usage_count: number
  total_quantity: number
  total_cost: number
}

// Model-level analytics (per warehouse or overall)
export type ModelAnalytics = {
  model_name: string
  warehouse_id: number | null
  warehouse_name: string | null
  total_repairs: number
  unique_devices: number
  total_parts_used: number
  total_quantity_consumed: number
  total_cost: number
  average_cost_per_repair: number
  most_common_parts: SkuUsage[]
}

// Combined analytics response
export type RepairAnalytics = {
  summary: {
    total_repairs: number
    total_parts_used: number
    total_quantity_consumed: number
    total_cost: number
    average_cost_per_repair: number
  }
  by_warehouse: WarehouseAnalytics[]
  by_model: ModelAnalytics[]
  by_reason: ReasonAnalytics[]
}

// IMEI analytics query
export const IMEIAnalyticsQuery = t.Object({
  date_from: t.Optional(t.String()),
  date_to: t.Optional(t.String()),
  warehouse_id: t.Optional(t.Number()),
  model_name: t.Optional(t.String()),
  reason_id: t.Optional(t.Number()),
  search: t.Optional(t.String()),
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
})

export type IMEIAnalyticsQueryInput = Static<typeof IMEIAnalyticsQuery>

// IMEI-level analytics
export type IMEIAnalytics = {
  device_id: number
  device_imei: string
  device_serial: string | null
  device_sku: string
  model_name: string | null
  warehouse_name: string | null
  total_repairs: number
  total_parts_used: number
  total_quantity_consumed: number
  total_cost: number
  parts_breakdown: SkuUsage[]
}

export type IMEIAnalyticsResult = {
  items: IMEIAnalytics[]
  total: number
  page: number
  limit: number
}
