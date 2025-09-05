import { t, type Static } from "elysia"

// Adjustment types for stock write-offs, dead IMEI, and manual corrections
export const AdjustmentCreate = t.Object({
  sku: t.String(),
  warehouse_id: t.Number(),
  quantity_adjustment: t.Number(), // Can be positive or negative
  reason: t.Union([
    t.Literal('dead_imei'),
    t.Literal('inventory_loss'),
    t.Literal('manual_correction'),
    t.Literal('damage'),
    t.Literal('theft'),
    t.Literal('expired'),
    t.Literal('return_to_supplier'),
  ]),
  notes: t.Optional(t.String()),
  device_id: t.Optional(t.Number()), // For device-specific adjustments
  actor_id: t.Number(),
})

export const DeadIMEIWriteOff = t.Object({
  device_id: t.Number(),
  sku: t.String(),
  warehouse_id: t.Number(),
  reason_notes: t.Optional(t.String()),
  actor_id: t.Number(),
})

export const BulkAdjustment = t.Object({
  adjustments: t.Array(AdjustmentCreate),
  batch_notes: t.Optional(t.String()),
})

export const AdjustmentQuery = t.Object({
  warehouse_id: t.Optional(t.Number()),
  sku: t.Optional(t.String()),
  reason: t.Optional(t.String()),
  actor_id: t.Optional(t.Number()),
  device_id: t.Optional(t.Number()),
  date_from: t.Optional(t.String()),
  date_to: t.Optional(t.String()),
  search: t.Optional(t.String()),
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
})

// Change device SKU request
export const ChangeSkuRequest = t.Object({
  device_id: t.Number(),
  from_sku: t.String(),
  to_sku: t.String(),
  warehouse_id: t.Number(),
  actor_id: t.Number(),
  notes: t.Optional(t.String()),
})

export type AdjustmentCreateInput = Static<typeof AdjustmentCreate>
export type DeadIMEIWriteOffInput = Static<typeof DeadIMEIWriteOff>
export type BulkAdjustmentInput = Static<typeof BulkAdjustment>
export type AdjustmentQueryInput = Static<typeof AdjustmentQuery>
export type ChangeSkuInput = Static<typeof ChangeSkuRequest>

export type AdjustmentRecord = {
  id: number
  sku: string
  warehouse_id: number
  warehouse_name?: string
  quantity_adjustment: number
  reason: string
  notes: string | null
  device_id: number | null
  device_serial?: string
  actor_id: number
  actor_name?: string
  created_at: Date | null
  tenant_id: number
}

export type AdjustmentSummary = {
  total_adjustments: number
  total_writeoffs: number
  total_corrections: number
  net_adjustment: number
  by_reason: Record<string, {
    count: number
    total_quantity: number
  }>
  by_warehouse: Record<string, {
    count: number
    net_adjustment: number
  }>
}

export type AdjustmentResult = {
  adjustment: AdjustmentRecord
  movement_created: boolean
  stock_updated: boolean
  device_event_created: boolean
}

export type BulkAdjustmentResult = {
  successful_adjustments: number
  failed_adjustments: number
  total_quantity_adjusted: number
  results: AdjustmentResult[]
}

export type AdjustmentListResult = {
  rows: AdjustmentRecord[]
  total: number
  page: number
  limit: number
}

export type ChangeSkuResult = {
  device_id: number
  from_sku: string
  to_sku: string
  warehouse_id: number
  movement_out_created: boolean
  movement_in_created: boolean
  device_updated: boolean
}
