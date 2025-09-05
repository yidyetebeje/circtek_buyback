import { t, type Static } from "elysia"

// Common types used across stock submodules
export type StockFilters = {
  tenant_id?: number;
  warehouse_id?: number;
  sku?: string;
  is_part?: boolean;
  page?: number;
  limit?: number;
}

export type MovementFilters = {
  tenant_id?: number;
  warehouse_id?: number;
  sku?: string;
  reason?: string;
  actor_id?: number;
  ref_type?: string;
  ref_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

// Common validation schemas
export const PaginationQuery = t.Object({
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
})

export const StockListQuery = t.Object({
  tenant_id: t.Optional(t.Number()),
  warehouse_id: t.Optional(t.Number()),
  sku: t.Optional(t.String()),
  is_part: t.Optional(t.Boolean()),
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
})

export const MovementListQuery = t.Object({
  tenant_id: t.Optional(t.Number()),
  warehouse_id: t.Optional(t.Number()),
  sku: t.Optional(t.String()),
  reason: t.Optional(t.String()),
  actor_id: t.Optional(t.Number()),
  ref_type: t.Optional(t.String()),
  ref_id: t.Optional(t.Number()),
  date_from: t.Optional(t.String()),
  date_to: t.Optional(t.String()),
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
})

// Movement reasons enum matching database schema
export type StockMovementReason = 
  | 'purchase' 
  | 'dead_imei' 
  | 'transfer_out' 
  | 'transfer_in' 
  | 'repair' 
  | 'adjustment' 
  | 'buyback'

// Stock movement input for creating new movements
export const StockMovementCreate = t.Object({
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

export type StockMovementCreateInput = Static<typeof StockMovementCreate>;

// Common response types
export type StockRecord = {
  id: number
  sku: string
  is_part: boolean
  quantity: number
  warehouse_id: number
  status: boolean
  tenant_id: number
  created_at: Date | null
  updated_at: Date | null
}

export type StockMovementRecord = {
  id: number
  sku: string
  warehouse_id: number
  delta: number
  reason: StockMovementReason
  ref_type: string
  ref_id: number
  actor_id: number
  created_at: Date | null
  updated_at: Date | null
  status: boolean
  tenant_id: number
}

export type StockListResult = {
  rows: StockRecord[]
  total: number
  page: number
  limit: number
}

export type MovementListResult = {
  rows: StockMovementRecord[]
  total: number
  page: number
  limit: number
}

// Device event types for integration
export type DeviceEventType = 
  | 'DEAD_IMEI'
  | 'REPAIR_STARTED'
  | 'REPAIR_COMPLETED'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT'
  | 'TEST_COMPLETED'

export const DeviceEventCreate = t.Object({
  device_id: t.Number(),
  actor_id: t.Number(),
  event_type: t.Union([
    t.Literal('DEAD_IMEI'),
    t.Literal('REPAIR_STARTED'),
    t.Literal('REPAIR_COMPLETED'),
    t.Literal('TRANSFER_IN'),
    t.Literal('TRANSFER_OUT'),
    t.Literal('ADJUSTMENT'),
    t.Literal('TEST_COMPLETED')
  ]),
  details: t.Optional(t.Object({})),
  tenant_id: t.Number(),
})

export type DeviceEventCreateInput = Static<typeof DeviceEventCreate>;
