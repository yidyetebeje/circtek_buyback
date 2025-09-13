import { t, type Static } from "elysia"

// Stock-specific types and validation schemas
export const StockCreate = t.Object({
  sku: t.String(),
  is_part: t.Optional(t.Boolean()),
  quantity: t.Number(),
  warehouse_id: t.Number(),
})

export const StockUpdate = t.Object({
  quantity: t.Optional(t.Number()),
  is_part: t.Optional(t.Boolean()),
  status: t.Optional(t.Boolean()),
})

export const StockQuery = t.Object({
  warehouse_id: t.Optional(t.Number()),
  sku: t.Optional(t.String()),
  is_part: t.Optional(t.Boolean()),
  search: t.Optional(t.String()),
  low_stock_threshold: t.Optional(t.Number()),
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
  sort_by: t.Optional(t.String()),
  sort_dir: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
})

export type StockCreateInput = Static<typeof StockCreate>
export type StockUpdateInput = Static<typeof StockUpdate>
export type StockQueryInput = Static<typeof StockQuery>

export type StockWithWarehouse = {
  id: number
  sku: string
  is_part: boolean | null
  quantity: number
  warehouse_id: number
  warehouse_name: string | null
  status: boolean | null
  tenant_id: number
  created_at: Date | null
  updated_at: Date | null
}

export type StockSummary = {
  total_skus: number
  total_quantity: number
  low_stock_items: number
  warehouses_count: number
}

export type StockLevel = {
  sku: string
  warehouse_id: number
  warehouse_name?: string
  current_quantity: number
  is_low_stock: boolean
  is_part: boolean
}

export type StockListResult = {
  rows: StockWithWarehouse[]
  total: number
  page: number
  limit: number
  summary?: StockSummary
}
