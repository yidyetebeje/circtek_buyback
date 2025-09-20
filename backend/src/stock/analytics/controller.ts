import { SkuUsageAnalyticsRepository } from './repository'
import { 
  SkuUsageAnalyticsQueryInput, 
  SkuUsageAnalyticsResult
} from './types'
import type { response } from '../../types/response'

export class SkuUsageAnalyticsController {
  constructor(private readonly repo: SkuUsageAnalyticsRepository) {}

  /**
   * Get SKU usage analytics for a given period
   */
  async getSkuUsageAnalytics(
    query: SkuUsageAnalyticsQueryInput, 
    tenant_id?: number
  ): Promise<response<SkuUsageAnalyticsResult | null>> {
    
    try {
      // Validate and calculate period info
      const periodInfo = this.repo.calculatePeriodInfo(query)
      
      // Validate period constraints
      if (periodInfo.days > 365) {
        return {
          data: null,
          message: 'Period cannot exceed 365 days',
          status: 400,
          error: 'Period too long'
        }
      }

      if (periodInfo.start_date >= periodInfo.end_date) {
        return {
          data: null,
          message: 'Start date must be before end date',
          status: 400,
          error: 'Invalid date range'
        }
      }

      // Execute the analytics query
      const result = await this.repo.getSkuUsageAnalytics({ ...query, tenant_id }, periodInfo)
      
      return {
        data: result,
        message: 'SKU usage analytics retrieved successfully',
        status: 200
      }

    } catch (error) {
      console.error('Error in getSkuUsageAnalytics:', error)
      return {
        data: null,
        message: 'Failed to retrieve SKU usage analytics',
        status: 500,
        error: (error as Error).message
      }
    }
  }

  /**
   * Get SKU usage analytics for parts at risk (running low)
   */
  async getPartsAtRisk(
    query: SkuUsageAnalyticsQueryInput, 
    tenant_id?: number,
    riskThreshold: number = 30
  ): Promise<response<SkuUsageAnalyticsResult | null>> {
    
    try {
      // Set filters for parts at risk
      const riskQuery: SkuUsageAnalyticsQueryInput = {
        ...query,
        max_days_until_empty: riskThreshold,
        min_usage: 1, // Only include parts with usage
        sort_by: 'expected_days_until_empty',
        sort_dir: 'asc'
      }

      return this.getSkuUsageAnalytics(riskQuery, tenant_id)

    } catch (error) {
      console.error('Error in getPartsAtRisk:', error)
      return {
        data: null,
        message: 'Failed to retrieve parts at risk',
        status: 500,
        error: (error as Error).message
      }
    }
  }

  /**
   * Get high usage parts (most consumed SKUs)
   */
  async getHighUsageParts(
    query: SkuUsageAnalyticsQueryInput, 
    tenant_id?: number,
    minUsage: number = 10
  ): Promise<response<SkuUsageAnalyticsResult | null>> {
    
    try {
      // Set filters for high usage parts
      const highUsageQuery: SkuUsageAnalyticsQueryInput = {
        ...query,
        min_usage: minUsage,
        sort_by: 'quantity_used',
        sort_dir: 'desc',
        limit: query.limit || 20 // Show top 20 by default
      }

      return this.getSkuUsageAnalytics(highUsageQuery, tenant_id)

    } catch (error) {
      console.error('Error in getHighUsageParts:', error)
      return {
        data: null,
        message: 'Failed to retrieve high usage parts',
        status: 500,
        error: (error as Error).message
      }
    }
  }

  /**
   * Get parts usage summary for a specific warehouse
   */
  async getWarehouseUsageSummary(
    warehouse_id: number,
    query: SkuUsageAnalyticsQueryInput, 
    tenant_id?: number
  ): Promise<response<SkuUsageAnalyticsResult | null>> {
    
    try {
      // Validate warehouse ID
      if (!warehouse_id || warehouse_id <= 0) {
        return {
          data: null,
          message: 'Invalid warehouse ID provided',
          status: 400,
          error: 'Warehouse ID must be a positive number'
        }
      }

      // Set warehouse filter
      const warehouseQuery: SkuUsageAnalyticsQueryInput = {
        ...query,
        warehouse_id
      }

      return this.getSkuUsageAnalytics(warehouseQuery, tenant_id)

    } catch (error) {
      console.error('Error in getWarehouseUsageSummary:', error)
      return {
        data: null,
        message: 'Failed to retrieve warehouse usage summary',
        status: 500,
        error: (error as Error).message
      }
    }
  }

  /**
   * Get usage analytics for a specific SKU across all warehouses
   */
  async getSkuUsageAcrossWarehouses(
    sku: string,
    query: SkuUsageAnalyticsQueryInput, 
    tenant_id?: number
  ): Promise<response<SkuUsageAnalyticsResult | null>> {
    
    try {
      // Validate SKU
      if (!sku || sku.trim().length === 0) {
        return {
          data: null,
          message: 'SKU cannot be empty',
          status: 400,
          error: 'Invalid SKU provided'
        }
      }

      // Set SKU filter
      const skuQuery: SkuUsageAnalyticsQueryInput = {
        ...query,
        sku: sku.trim(),
        sort_by: 'warehouse_name',
        sort_dir: 'asc'
      }

      return this.getSkuUsageAnalytics(skuQuery, tenant_id)

    } catch (error) {
      console.error('Error in getSkuUsageAcrossWarehouses:', error)
      return {
        data: null,
        message: 'Failed to retrieve SKU usage across warehouses',
        status: 500,
        error: (error as Error).message
      }
    }
  }

  /**
   * Validate query parameters and set defaults
   */
  private validateAndSetDefaults(query: SkuUsageAnalyticsQueryInput): SkuUsageAnalyticsQueryInput {
    return {
      period_days: query.period_days || 30,
      page: Math.max(1, query.page || 1),
      limit: Math.max(1, Math.min(100, query.limit || 10)),
      sort_by: query.sort_by || 'quantity_used',
      sort_dir: query.sort_dir || 'desc',
      only_parts: query.only_parts !== false, // Default to true
      ...query
    }
  }

  /**
   * Export usage data (for future CSV/Excel export functionality)
   */
  async exportUsageData(
    query: SkuUsageAnalyticsQueryInput, 
    tenant_id?: number,
    format: 'json' | 'csv' = 'json'
  ): Promise<response<any | null>> {
    
    try {
      // Get all data without pagination for export
      const exportQuery: SkuUsageAnalyticsQueryInput = {
        ...query,
        page: 1,
        limit: 10000 // Large limit for export
      }

      const result = await this.getSkuUsageAnalytics(exportQuery, tenant_id)
      
      if (!result.data) {
        return result
      }

      if (format === 'csv') {
        // Convert to CSV format (basic implementation)
        const csvData = this.convertToCSV(result.data.items)
        return {
          data: csvData,
          message: 'Usage data exported successfully',
          status: 200
        }
      }

      return {
        data: result.data,
        message: 'Usage data exported successfully',
        status: 200
      }

    } catch (error) {
      console.error('Error in exportUsageData:', error)
      return {
        data: null,
        message: 'Failed to export usage data',
        status: 500,
        error: (error as Error).message
      }
    }
  }

  /**
   * Convert analytics data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) {
      return 'No data available'
    }

    // Get headers from first object keys
    const headers = Object.keys(data[0])
    
    // Create CSV content
    let csv = headers.join(',') + '\n'
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header]
        // Handle null values and escape commas/quotes
        if (value === null || value === undefined) {
          return ''
        }
        const stringValue = String(value)
        // Escape values containing commas or quotes
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      csv += values.join(',') + '\n'
    })

    return csv
  }
}