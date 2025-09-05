import type { response } from '../../types/response'
import { DashboardStatsRepository } from './repository'
import type { 
  DashboardOverviewStats, 
  WarehouseStats, 
  RecentActivity, 
  MonthlyTrend 
} from './types'

export class DashboardStatsController {
  constructor(private readonly repo: DashboardStatsRepository) {}

  async getOverviewStats(tenantId?: number, from?: string, to?: string): Promise<response<DashboardOverviewStats>> {
    const data = await this.repo.getOverviewStats(tenantId, from, to)
    return { data, message: 'OK', status: 200 }
  }

  async getWarehouseStats(tenantId?: number): Promise<response<WarehouseStats[]>> {
    const data = await this.repo.getWarehouseStats(tenantId)
    return { data, message: 'OK', status: 200 }
  }

  async getRecentActivity(tenantId?: number, limit?: number): Promise<response<RecentActivity[]>> {
    const data = await this.repo.getRecentActivity(tenantId, limit)
    return { data, message: 'OK', status: 200 }
  }

  async getMonthlyTrends(tenantId?: number, months?: number, from?: string, to?: string): Promise<response<MonthlyTrend[]>> {
    const data = await this.repo.getMonthlyTrends(tenantId, months, from, to)
    return { data, message: 'OK', status: 200 }
  }
}
