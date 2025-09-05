import { t, type Static } from "elysia"

// Transfer-related stock management types
export const TransferCreate = t.Object({
  from_warehouse_id: t.Number(),
  to_warehouse_id: t.Number(),
  tracking_number: t.Optional(t.String()),
  tracking_url: t.Optional(t.String()),
})

export const TransferItemCreate = t.Object({
  sku: t.String(),
  device_id: t.Number(),
  is_part: t.Optional(t.Boolean()),
  quantity: t.Optional(t.Number({ default: 1 })),
})

export const TransferWithItems = t.Object({
  transfer: TransferCreate,
  items: t.Array(TransferItemCreate),
})

export const CompleteTransferRequest = t.Object({
  transfer_id: t.Number(),
  actor_id: t.Number(),
})

export const TransferQuery = t.Object({
  from_warehouse_id: t.Optional(t.Number()),
  to_warehouse_id: t.Optional(t.Number()),
  status: t.Optional(t.String()),
  date_from: t.Optional(t.String()),
  date_to: t.Optional(t.String()),
  search: t.Optional(t.String()),
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
})

export type TransferCreateInput = Static<typeof TransferCreate>
export type TransferItemCreateInput = Static<typeof TransferItemCreate>
export type TransferWithItemsInput = Static<typeof TransferWithItems>
export type CompleteTransferRequestInput = Static<typeof CompleteTransferRequest>
export type TransferQueryInput = Static<typeof TransferQuery>

export type TransferRecord = {
  id: number
  from_warehouse_id: number
  to_warehouse_id: number
  status: boolean | null
  created_by: number
  completed_by: number | null
  completed_at: Date | null
  tenant_id: number
  created_at: Date | null
  updated_at: Date | null
}

export type TransferItemRecord = {
  id: number
  transfer_id: number
  sku: string
  device_id: number
  is_part: boolean | null
  quantity: number | null
  status: boolean | null
  tenant_id: number
  created_at: Date | null
  updated_at: Date | null
}

export type TransferWithDetails = {
  id: number
  from_warehouse_id: number
  from_warehouse_name?: string
  to_warehouse_id: number
  to_warehouse_name?: string
  status: boolean | null
  created_by: number
  completed_by?: number | null
  completed_at?: Date | null
  tenant_id: number
  created_at: Date | null
  updated_at: Date | null
  items: (TransferItemRecord & {
    device_sku?: string
    device_model?: string
  })[]
  total_items: number
  total_quantity: number
  is_completed: boolean
}

export type TransferListResult = {
  rows: TransferWithDetails[]
  total: number
  page: number
  limit: number
}

export type TransferCompletionResult = {
  transfer_id: number
  movements_created: number
  total_items_transferred: number
  total_quantity_transferred: number
  from_warehouse_id: number
  to_warehouse_id: number
  device_events_created: number
}

export type TransferSummary = {
  total_transfers: number
  pending_transfers: number
  completed_transfers: number
  total_items_in_transit: number
  by_warehouse: Record<string, {
    outbound: number
    inbound: number
  }>
}
