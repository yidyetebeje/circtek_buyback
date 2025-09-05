import Elysia from 'elysia'
import { db } from '../../db'
import { DiagnosticsStatsRepository } from './repository'
import { DiagnosticsStatsController } from './controller'
import { StatsOverviewQuery, TimeSeriesQuery, StatsRangeQuery } from './types'
import { requireRole } from '../../auth'

const repo = new DiagnosticsStatsRepository(db)
const controller = new DiagnosticsStatsController(repo)

export const diagnostics_stats_routes = new Elysia({ prefix: '/stats' })
  .use(requireRole([]))
  .get('/overview', async (ctx) => {
    const { currentTenantId, currentRole, query } = ctx as any
    const effectiveTenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? undefined) : Number(currentTenantId)
    return controller.overview(effectiveTenantId)
  }, { query: StatsOverviewQuery, detail: { tags: ['Diagnostics'], summary: 'Diagnostics overview KPIs' } })
  .get('/timeseries', async (ctx) => {
    const { currentTenantId, currentRole, query } = ctx as any
    const effectiveTenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? undefined) : Number(currentTenantId)
    const interval = (query?.interval as any) ?? 'day'
    const deviceType = query?.device_type as any
    return controller.timeSeries(query?.from, query?.to, interval, effectiveTenantId, deviceType)
  }, { query: TimeSeriesQuery, detail: { tags: ['Diagnostics'], summary: 'Diagnostics time-series count' } })
  .get('/warehouses', async (ctx) => {
    const { currentTenantId, currentRole, query } = ctx as any
    const effectiveTenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? undefined) : Number(currentTenantId)
    return controller.warehouses(query?.from, query?.to, effectiveTenantId)
  }, { query: StatsRangeQuery, detail: { tags: ['Diagnostics'], summary: 'Throughput by warehouse' } })
  .get('/testers', async (ctx) => {
    const { currentTenantId, currentRole, query } = ctx as any
    const effectiveTenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? undefined) : Number(currentTenantId)
    return controller.testers(query?.from, query?.to, effectiveTenantId)
  }, { query: StatsRangeQuery, detail: { tags: ['Diagnostics'], summary: 'Throughput by tester' } })
  .get('/device-types', async (ctx) => {
    const { currentTenantId, currentRole, query } = ctx as any
    const effectiveTenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? undefined) : Number(currentTenantId)
    return controller.deviceTypeDistribution(query?.from, query?.to, effectiveTenantId)
  }, { query: StatsRangeQuery, detail: { tags: ['Diagnostics'], summary: 'Distribution by device_type' } })


