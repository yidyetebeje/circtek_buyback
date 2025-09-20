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
    sku: t.String(),
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
    sku: t.String(),
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
