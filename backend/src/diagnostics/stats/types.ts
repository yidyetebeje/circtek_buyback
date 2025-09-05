import { t, type Static } from 'elysia'

export const StatsOverviewQuery = t.Object({
  tenant_id: t.Optional(t.Number()),
})

export type StatsOverviewQueryInput = Static<typeof StatsOverviewQuery>

export const StatsRangeQuery = t.Object({
  from: t.Optional(t.String()),
  to: t.Optional(t.String()),
  tenant_id: t.Optional(t.Number()),
})

export type StatsRangeQueryInput = Static<typeof StatsRangeQuery>

export const TimeSeriesQuery = t.Object({
  from: t.Optional(t.String()),
  to: t.Optional(t.String()),
  interval: t.Optional(t.Union([t.Literal('day'), t.Literal('week')])),
  device_type: t.Optional(t.String()),
  tenant_id: t.Optional(t.Number()),
})

export type TimeSeriesQueryInput = Static<typeof TimeSeriesQuery>

export type OverviewStats = {
  total_all_time: number
  today: number
  last_7_days: number
  last_30_days: number
  unlabeled_all_time: number
}

export type TimeSeriesPoint = {
  bucket: string
  count: number
}

export type WarehouseThroughput = {
  warehouse_id: number
  warehouse_name: string | null
  count: number
}

export type TesterThroughput = {
  tester_id: number
  tester_username: string | null
  count: number
}

export type DeviceTypeDistribution = {
  device_type: string
  count: number
}


