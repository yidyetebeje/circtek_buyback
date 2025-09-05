import type { response } from '../../types/response'
import { DiagnosticsStatsRepository } from './repository'
import type { OverviewStats, TimeSeriesPoint, WarehouseThroughput, TesterThroughput, DeviceTypeDistribution } from './types'

export class DiagnosticsStatsController {
  constructor(private readonly repo: DiagnosticsStatsRepository) {}

  async overview(tenantId?: number): Promise<response<OverviewStats>> {
    const data = await this.repo.overview(tenantId)
    return { data, message: 'OK', status: 200 }
  }

  async timeSeries(from?: string, to?: string, interval: 'day' | 'week' = 'day', tenantId?: number, deviceType?: string): Promise<response<TimeSeriesPoint[]>> {
    const data = await this.repo.timeSeries(from, to, interval, tenantId, deviceType)
    return { data, message: 'OK', status: 200 }
  }

  async warehouses(from?: string, to?: string, tenantId?: number): Promise<response<WarehouseThroughput[]>> {
    const data = await this.repo.byWarehouse(from, to, tenantId)
    return { data, message: 'OK', status: 200 }
  }

  async testers(from?: string, to?: string, tenantId?: number): Promise<response<TesterThroughput[]>> {
    const data = await this.repo.byTester(from, to, tenantId)
    return { data, message: 'OK', status: 200 }
  }

  async deviceTypeDistribution(from?: string, to?: string, tenantId?: number): Promise<response<DeviceTypeDistribution[]>> {
    const data = await this.repo.deviceTypeDistribution(from, to, tenantId)
    return { data, message: 'OK', status: 200 }
  }
}


