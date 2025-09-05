import Elysia from 'elysia'
import { db } from '../../db'
import { DashboardStatsRepository } from './repository'
import { DashboardStatsController } from './controller'
import { DashboardStatsQuery } from './types'
import { requireRole } from '../../auth'

const repo = new DashboardStatsRepository(db)
const controller = new DashboardStatsController(repo)

export const dashboard_stats_routes = new Elysia({ prefix: '/dashboard' })
  .use(requireRole([]))
  .get('/overview', async (ctx) => {
    const { currentTenantId, currentRole, query } = ctx as any
    const effectiveTenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? undefined) : Number(currentTenantId)
    return controller.getOverviewStats(effectiveTenantId, query?.from, query?.to)
  }, { 
    query: DashboardStatsQuery, 
    detail: { 
      tags: ['Dashboard'], 
      summary: 'Get comprehensive dashboard overview statistics' 
    } 
  })
  .get('/warehouses', async (ctx) => {
    const { currentTenantId, currentRole, query } = ctx as any
    const effectiveTenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? undefined) : Number(currentTenantId)
    return controller.getWarehouseStats(effectiveTenantId)
  }, { 
    query: DashboardStatsQuery, 
    detail: { 
      tags: ['Dashboard'], 
      summary: 'Get warehouse statistics for dashboard' 
    } 
  })
  .get('/activity', async (ctx) => {
    const { currentTenantId, currentRole, query } = ctx as any
    const effectiveTenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? undefined) : Number(currentTenantId)
    return controller.getRecentActivity(effectiveTenantId, 15)
  }, { 
    query: DashboardStatsQuery, 
    detail: { 
      tags: ['Dashboard'], 
      summary: 'Get recent activity for dashboard' 
    } 
  })
  .get('/trends', async (ctx) => {
    const { currentTenantId, currentRole, query } = ctx as any
    const effectiveTenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? undefined) : Number(currentTenantId)
    return controller.getMonthlyTrends(effectiveTenantId, 6, query?.from, query?.to)
  }, { 
    query: DashboardStatsQuery, 
    detail: { 
      tags: ['Dashboard'], 
      summary: 'Get monthly trends for dashboard charts with optional date range' 
    } 
  })
