import { t, type Static } from "elysia"

// Purchase-related stock management types
export const PurchaseCreate = t.Object({
  purchase_order_no: t.String(),
  supplier_name: t.String(),
  supplier_order_no: t.String(),
  expected_delivery_date: t.String(),
  customer_name: t.Optional(t.String()),
  remarks: t.Optional(t.String()),
  invoice: t.Optional(t.String()),
  transport_doc: t.Optional(t.String()),
  receiving_picture: t.Optional(t.String()),
  order_confirmation_doc: t.Optional(t.String()),
  tracking_number: t.Optional(t.String()),
  tracking_url: t.Optional(t.String()),
  warehouse_id: t.Number(),
})

export const PurchaseItemCreate = t.Object({
  sku: t.String(),
  quantity: t.Number(),
  price: t.Number(),
  is_part: t.Optional(t.Boolean()),
})

export const PurchaseWithItems = t.Object({
  purchase: PurchaseCreate,
  items: t.Array(PurchaseItemCreate),
})

export const ReceiveItemsRequest = t.Object({
  purchase_id: t.Number(),
  items: t.Array(t.Object({
    purchase_item_id: t.Number(),
    sku: t.String(),
    quantity_received: t.Number(),
  
    // Optional: receive specific devices by identifier(s) (IMEI or serial)
    identifiers: t.Optional(t.Array(t.String())),
  })),
  warehouse_id: t.Number(),
  actor_id: t.Number(),
})

export const PurchaseQuery = t.Object({
  supplier_name: t.Optional(t.String()),
  purchase_order_no: t.Optional(t.String()),
  status: t.Optional(t.String()),
  date_from: t.Optional(t.String()),
  date_to: t.Optional(t.String()),
  search: t.Optional(t.String()),
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
  sort_by: t.Optional(t.String()),
  sort_dir: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
})

export type PurchaseCreateInput = Static<typeof PurchaseCreate>
export type PurchaseItemCreateInput = Static<typeof PurchaseItemCreate>
export type PurchaseWithItemsInput = Static<typeof PurchaseWithItems>
export type ReceiveItemsRequestInput = Static<typeof ReceiveItemsRequest>
export type PurchaseQueryInput = Static<typeof PurchaseQuery>

export type PurchaseRecord = {
  id: number
  purchase_order_no: string
  supplier_name: string
  supplier_order_no: string
  expected_delivery_date: Date | null
  customer_name: string | null
  remarks: string | null
  invoice: string | null
  transport_doc: string | null
  receiving_picture: string | null
  order_confirmation_doc: string | null
  tracking_number: string | null
  tracking_url: string | null
  status: boolean | null
  warehouse_id: number
  tenant_id: number
  created_at: Date | null
  updated_at: Date | null
}

export type PurchaseItemRecord = {
  id: number
  purchase_id: number
  sku: string | null
  quantity: number
  quantity_used_for_repair: number | null
  price: number
  is_part: boolean | null
  status: boolean | null
  tenant_id: number
  created_at: Date | null
}

export type ReceivedItemRecord = {
  id: number
  purchase_id: number
  purchase_item_id: number | null
  sku: string | null
  device_id: number | null
  quantity: number
  received_at: Date | null
  status: boolean | null
  tenant_id: number
  created_at: Date | null
  updated_at: Date | null
}

export type PurchaseWithItemsAndReceived = {
  purchase: PurchaseRecord
  items: (PurchaseItemRecord & {
    received_quantity: number
    remaining_quantity: number
  })[]
  total_items: number
  total_received: number
  is_fully_received: boolean
}

export type PurchaseListResult = {
  rows: PurchaseRecord[]
  total: number
  page: number
  limit: number
}

export type PurchaseWithItems = {
  purchase: PurchaseRecord
  items: (PurchaseItemRecord & {
    received_quantity: number
    remaining_quantity: number
  })[]
}

export type PurchaseWithItemsListResult = {
  rows: PurchaseWithItems[]
  total: number
  page: number
  limit: number
}

export type ReceivingResult = {
  purchase_id: number
  received_items: ReceivedItemRecord[]
  stock_movements_created: number
  total_quantity_received: number
}
