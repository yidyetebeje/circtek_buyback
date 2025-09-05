import { t, type Static } from "elysia"

// Stock movements specific types and validation schemas
export const MovementCreate = t.Object({
  sku: t.String(),
  warehouse_id: t.Number(),
  delta: t.Number(),
  reason: t.Union([
    t.Literal('purchase'),
    t.Literal('dead_imei'),
    t.Literal('transfer_out'),
    t.Literal('transfer_in'),
    t.Literal('repair'),
    t.Literal('adjustment'),
    t.Literal('buyback')
  ]),
  ref_type: t.String(),
  ref_id: t.Number(),
  actor_id: t.Number(),
})

export const MovementQuery = t.Object({
  warehouse_id: t.Optional(t.Number()),
  sku: t.Optional(t.String()),
  reason: t.Optional(t.String()),
  actor_id: t.Optional(t.Number()),
  ref_type: t.Optional(t.String()),
  ref_id: t.Optional(t.Number()),
  date_from: t.Optional(t.String()),
  date_to: t.Optional(t.String()),
  search: t.Optional(t.String()),
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
})

export type MovementCreateInput = Static<typeof MovementCreate>
export type MovementQueryInput = Static<typeof MovementQuery>

export type MovementWithDetails = {
  id: number
  sku: string
  warehouse_id: number
  warehouse_name?: string
  delta: number
  reason: string
  ref_type: string
  ref_id: number
  actor_id: number
  actor_name?: string
  created_at: Date | null
  updated_at: Date | null
  status: boolean
  tenant_id: number
}

export type MovementSummary = {
  total_movements: number
  total_inbound: number
  total_outbound: number
  net_change: number
  by_reason: Record<string, number>
  by_warehouse: Record<string, number>
}

export type MovementListResult = {
  rows: MovementWithDetails[]
  total: number
  page: number
  limit: number
  summary?: MovementSummary
}

// Audit trail specific types
export type StockAuditTrail = {
  sku: string
  warehouse_id: number
  movements: MovementWithDetails[]
  current_stock: number
  total_in: number
  total_out: number
}

export type MovementsByPeriod = {
  period: string
  movements_count: number
  total_delta: number
  reasons: Record<string, number>
}
