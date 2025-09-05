import { t, type Static } from "elysia"

// Consumption types for repair parts usage
export const ConsumptionCreate = t.Object({
  repair_id: t.Number(),
  sku: t.String(),
  warehouse_id: t.Number(),
  quantity_consumed: t.Number(),
  notes: t.Optional(t.String()),
  actor_id: t.Number(),
})

export const BulkConsumption = t.Object({
  repair_id: t.Number(),
  warehouse_id: t.Number(),
  items: t.Array(t.Object({
    sku: t.String(),
    quantity_consumed: t.Number(),
  })),
  notes: t.Optional(t.String()),
  actor_id: t.Number(),
})

export const ConsumptionQuery = t.Object({
  repair_id: t.Optional(t.Number()),
  warehouse_id: t.Optional(t.Number()),
  sku: t.Optional(t.String()),
  actor_id: t.Optional(t.Number()),
  date_from: t.Optional(t.String()),
  date_to: t.Optional(t.String()),
  search: t.Optional(t.String()),
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
})

export type ConsumptionCreateInput = Static<typeof ConsumptionCreate>
export type BulkConsumptionInput = Static<typeof BulkConsumption>
export type ConsumptionQueryInput = Static<typeof ConsumptionQuery>

export type ConsumptionRecord = {
  id: number
  repair_id: number
  sku: string
  warehouse_id: number
  warehouse_name?: string
  quantity_consumed: number
  cost: number | null
  notes: string | null
  actor_id: number
  actor_name?: string
  created_at: Date | null
  tenant_id: number
}

export type ConsumptionResult = {
  consumption: ConsumptionRecord
  movement_created: boolean
  stock_updated: boolean
  repair_item_created: boolean
}

export type BulkConsumptionResult = {
  repair_id: number
  successful_consumptions: number
  failed_consumptions: number
  total_quantity_consumed: number
  total_cost: number
  results: ConsumptionResult[]
}

export type ConsumptionSummary = {
  total_consumptions: number
  total_quantity_consumed: number
  total_cost: number
  by_sku: Record<string, {
    quantity: number
    cost: number
    repairs_count: number
  }>
  by_warehouse: Record<string, {
    quantity: number
    cost: number
  }>
  by_repair: Record<number, {
    items_count: number
    total_quantity: number
    total_cost: number
  }>
}
