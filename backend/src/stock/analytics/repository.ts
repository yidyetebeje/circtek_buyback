import { and, count, desc, asc, eq, gte, lte, like, or, sql, sum, isNull, isNotNull } from "drizzle-orm"
import { db } from "../../db"
import { repair_items, repairs, warehouses, stock } from "../../db/circtek.schema"
import { 
  SkuUsageAnalyticsQueryInput, 
  SkuUsageCalculation, 
  PeriodInfo,
  SkuUsageAnalyticsItem,
  SkuUsageAnalyticsSummary,
  SkuUsageAnalyticsResult 
} from "./types"

export class SkuUsageAnalyticsRepository {
  constructor(private readonly database: typeof db) {}

  /**
   * Extract base SKU by removing the last segment (batch number)
   * Example: GSM-TI-BAT-11-290 -> GSM-TI-BAT-11
   */
  private getBaseSku(sku: string): string {
    const parts = sku.split('-')
    if (parts.length <= 1) {
      return sku // No batch segment to remove
    }
    return parts.slice(0, -1).join('-')
  }

  /**
   * Get SKU usage analytics for a given period
   */
  async getSkuUsageAnalytics(
    filters: SkuUsageAnalyticsQueryInput & { tenant_id?: number }, 
    periodInfo: PeriodInfo
  ): Promise<SkuUsageAnalyticsResult> {
    
    // Step 1: Get usage data from repair_items within the period
    const usageData = await this.getUsageData(filters, periodInfo)
    
    // Step 2: Get current stock levels for all SKUs that had usage
    const stockData = await this.getCurrentStockLevels(usageData, filters.tenant_id, filters.group_by_batch)
    
    // Step 3: Combine usage and stock data
    const combinedData = this.combineUsageAndStock(usageData, stockData, periodInfo)
    
    // Step 4: Apply additional filters and sorting
    const filteredData = this.applyFiltersAndSort(combinedData, filters)
    
    // Step 5: Apply pagination
    const paginatedResult = this.applyPagination(filteredData, filters)
    
    // Step 6: Calculate summary
    const summary = this.calculateSummary(combinedData)
    
    return {
      items: paginatedResult.items,
      total: filteredData.length,
      page: filters.page || 1,
      limit: filters.limit || 10,
      period_info: {
        start_date: periodInfo.start_date.toISOString().split('T')[0],
        end_date: periodInfo.end_date.toISOString().split('T')[0],
        days: periodInfo.days
      },
      summary
    }
  }

  /**
   * Get usage data from repair_items joined with repairs and warehouses
   */
  private async getUsageData(
    filters: SkuUsageAnalyticsQueryInput & { tenant_id?: number },
    periodInfo: PeriodInfo
  ): Promise<SkuUsageCalculation[]> {
    
    const conditions: any[] = []
    
    // Date range filter
    conditions.push(gte(repairs.created_at, periodInfo.start_date))
    conditions.push(lte(repairs.created_at, periodInfo.end_date))
    
    // Tenant filter
    if (typeof filters.tenant_id === 'number') {
      conditions.push(eq(repair_items.tenant_id, filters.tenant_id))
    }
    
    // Warehouse filter
    if (typeof filters.warehouse_id === 'number') {
      conditions.push(eq(repairs.warehouse_id, filters.warehouse_id))
    }
    
    // SKU filter - handle both full SKU and base SKU (batch) filtering
    if (filters.sku) {
      if (filters.group_by_batch) {
        // When batch grouping is enabled, match SKUs that start with the base pattern
        const pattern = `${filters.sku}%`
        conditions.push(like(repair_items.sku, pattern))
      } else {
        conditions.push(eq(repair_items.sku, filters.sku))
      }
    }
    
    // Search filter
    if (filters.search) {
      const pattern = `%${filters.search}%`
      conditions.push(like(repair_items.sku, pattern))
    }
    
    // Only parts filter (repair items are typically parts)
    if (filters.only_parts !== false) {
      // Add condition to ensure we're only looking at parts
      // This might need adjustment based on how parts are identified in your system
      conditions.push(isNotNull(repair_items.sku))
    }
    
    // Active repair items only
    conditions.push(eq(repair_items.status, true))
    conditions.push(eq(repairs.status, true))

    const results = await this.database
      .select({
        warehouse_id: repairs.warehouse_id,
        warehouse_name: warehouses.name,
        sku: repair_items.sku,
        total_used: sum(repair_items.quantity).as('total_used')
      })
      .from(repair_items)
      .innerJoin(repairs, eq(repair_items.repair_id, repairs.id))
      .innerJoin(warehouses, eq(repairs.warehouse_id, warehouses.id))
      .where(and(...conditions))
      .groupBy(repairs.warehouse_id, warehouses.name, repair_items.sku)

    // If batch grouping is enabled, aggregate by base SKU
    if (filters.group_by_batch) {
      const batchAggregated = new Map<string, SkuUsageCalculation>()
      
      results.forEach(row => {
        const baseSku = this.getBaseSku(row.sku || '')
        const key = `${row.warehouse_id}:${baseSku}`
        
        const existing = batchAggregated.get(key)
        if (existing) {
          existing.total_used += Number(row.total_used) || 0
        } else {
          batchAggregated.set(key, {
            warehouse_id: row.warehouse_id,
            warehouse_name: row.warehouse_name || 'Unknown Warehouse',
            sku: baseSku,
            total_used: Number(row.total_used) || 0,
            current_stock: 0, // Will be filled later
            is_part: true
          })
        }
      })
      
      return Array.from(batchAggregated.values())
    }

    return results.map(row => ({
      warehouse_id: row.warehouse_id,
      warehouse_name: row.warehouse_name || 'Unknown Warehouse',
      sku: row.sku || '',
      total_used: Number(row.total_used) || 0,
      current_stock: 0, // Will be filled later
      is_part: true // Assuming repair items are parts
    }))
  }

  /**
   * Get current stock levels for specific SKUs and warehouses
   */
  private async getCurrentStockLevels(
    usageData: SkuUsageCalculation[],
    tenant_id?: number,
    groupByBatch: boolean = false
  ): Promise<Map<string, number>> {
    
    if (usageData.length === 0) {
      return new Map()
    }

    // If grouping by batch, we need to get stock for all SKUs that match the base pattern
    if (groupByBatch) {
      const stockMap = new Map<string, number>()
      
      // For each usage data item (which has base SKU), query stock for all matching SKUs
      for (const item of usageData) {
        const baseSku = item.sku
        const pattern = `${baseSku}-%` // Match any SKU starting with base pattern
        
        const conditions: any[] = [
          eq(stock.warehouse_id, item.warehouse_id),
          like(stock.sku, pattern)
        ]
        
        if (typeof tenant_id === 'number') {
          conditions.push(eq(stock.tenant_id, tenant_id))
        }
        
        const stockResults = await this.database
          .select({
            warehouse_id: stock.warehouse_id,
            sku: stock.sku,
            quantity: stock.quantity
          })
          .from(stock)
          .where(and(...conditions))
        
        // Aggregate stock for all SKUs in the same batch
        const key = `${item.warehouse_id}:${baseSku}`
        const totalStock = stockResults.reduce((sum, s) => sum + s.quantity, 0)
        stockMap.set(key, (stockMap.get(key) || 0) + totalStock)
      }
      
      return stockMap
    }

    // Original logic for non-batch grouping
    // Create unique combinations of warehouse_id and sku
    const stockKeys = usageData.map(item => ({
      warehouse_id: item.warehouse_id,
      sku: item.sku
    }))

    // Build conditions for OR query
    const stockConditions = stockKeys.map(key => 
      and(
        eq(stock.warehouse_id, key.warehouse_id),
        eq(stock.sku, key.sku)
      )
    )

    const conditions: any[] = [or(...stockConditions)]
    
    if (typeof tenant_id === 'number') {
      conditions.push(eq(stock.tenant_id, tenant_id))
    }

    const stockResults = await this.database
      .select({
        warehouse_id: stock.warehouse_id,
        sku: stock.sku,
        quantity: stock.quantity
      })
      .from(stock)
      .where(and(...conditions))

    // Create a map with warehouse_id:sku as key and quantity as value
    const stockMap = new Map<string, number>()
    stockResults.forEach(item => {
      const key = `${item.warehouse_id}:${item.sku}`
      stockMap.set(key, item.quantity)
    })

    return stockMap
  }

  /**
   * Combine usage data with stock levels and calculate metrics
   */
  private combineUsageAndStock(
    usageData: SkuUsageCalculation[],
    stockData: Map<string, number>,
    periodInfo: PeriodInfo
  ): SkuUsageAnalyticsItem[] {
    
    return usageData.map(usage => {
      const stockKey = `${usage.warehouse_id}:${usage.sku}`
      const currentStock = stockData.get(stockKey) || 0
      const usagePerDay = usage.total_used / periodInfo.days
      
      let expectedDaysUntilEmpty: number | null = null
      
      if (usagePerDay > 0) {
        expectedDaysUntilEmpty = Math.floor(currentStock / usagePerDay)
      }

      return {
        warehouse_name: usage.warehouse_name,
        warehouse_id: usage.warehouse_id,
        part_sku: usage.sku,
        quantity_used: usage.total_used,
        current_stock: currentStock,
        expected_days_until_empty: expectedDaysUntilEmpty,
        usage_per_day: Math.round(usagePerDay * 100) / 100, // Round to 2 decimal places
        period_start: periodInfo.start_date.toISOString().split('T')[0],
        period_end: periodInfo.end_date.toISOString().split('T')[0],
        period_days: periodInfo.days
      }
    })
  }

  /**
   * Apply additional filters and sorting to the combined data
   */
  private applyFiltersAndSort(
    data: SkuUsageAnalyticsItem[],
    filters: SkuUsageAnalyticsQueryInput
  ): SkuUsageAnalyticsItem[] {
    
    let filtered = data

    // Apply min_usage filter
    if (typeof filters.min_usage === 'number') {
      filtered = filtered.filter(item => item.quantity_used >= filters.min_usage!)
    }

    // Apply max_days_until_empty filter
    if (typeof filters.max_days_until_empty === 'number') {
      filtered = filtered.filter(item => 
        item.expected_days_until_empty !== null && 
        item.expected_days_until_empty <= filters.max_days_until_empty!
      )
    }

    // Apply sorting
    const sortBy = filters.sort_by || 'quantity_used'
    const sortDir = filters.sort_dir || 'desc'

    filtered.sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortBy) {
        case 'warehouse_name':
          aVal = a.warehouse_name
          bVal = b.warehouse_name
          break
        case 'part_sku':
          aVal = a.part_sku
          bVal = b.part_sku
          break
        case 'quantity_used':
          aVal = a.quantity_used
          bVal = b.quantity_used
          break
        case 'current_stock':
          aVal = a.current_stock
          bVal = b.current_stock
          break
        case 'expected_days_until_empty':
          aVal = a.expected_days_until_empty ?? Infinity
          bVal = b.expected_days_until_empty ?? Infinity
          break
        case 'usage_per_day':
          aVal = a.usage_per_day
          bVal = b.usage_per_day
          break
        default:
          aVal = a.quantity_used
          bVal = b.quantity_used
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      
      if (sortDir === 'asc') {
        return aVal - bVal
      } else {
        return bVal - aVal
      }
    })

    return filtered
  }

  /**
   * Apply pagination to the filtered data
   */
  private applyPagination(
    data: SkuUsageAnalyticsItem[],
    filters: SkuUsageAnalyticsQueryInput
  ): { items: SkuUsageAnalyticsItem[], total: number } {
    
    const page = Math.max(1, filters.page || 1)
    const limit = Math.max(1, Math.min(100, filters.limit || 10))
    const offset = (page - 1) * limit

    const items = data.slice(offset, offset + limit)
    
    return { items, total: data.length }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(data: SkuUsageAnalyticsItem[]): SkuUsageAnalyticsSummary {
    
    const totalPartsAnalyzed = data.length
    const totalQuantityUsed = data.reduce((sum, item) => sum + item.quantity_used, 0)
    const averageUsagePerDay = data.length > 0 
      ? data.reduce((sum, item) => sum + item.usage_per_day, 0) / data.length 
      : 0
    
    const partsAtRisk = data.filter(item => 
      item.expected_days_until_empty !== null && 
      item.expected_days_until_empty <= 30
    ).length
    
    const partsWithZeroUsage = data.filter(item => item.quantity_used === 0).length
    
    const uniqueWarehouses = new Set(data.map(item => item.warehouse_id))
    const warehousesCount = uniqueWarehouses.size

    return {
      total_parts_analyzed: totalPartsAnalyzed,
      total_quantity_used: totalQuantityUsed,
      average_usage_per_day: Math.round(averageUsagePerDay * 100) / 100,
      parts_at_risk: partsAtRisk,
      parts_with_zero_usage: partsWithZeroUsage,
      warehouses_count: warehousesCount
    }
  }

  /**
   * Calculate period info based on query parameters
   */
  calculatePeriodInfo(filters: SkuUsageAnalyticsQueryInput): PeriodInfo {
    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (filters.start_date && filters.end_date) {
      // Use provided date range
      startDate = new Date(filters.start_date)
      endDate = new Date(filters.end_date)
    } else if (filters.period_days) {
      // Use period_days from now
      endDate = now
      startDate = new Date(now.getTime() - (filters.period_days * 24 * 60 * 60 * 1000))
    } else {
      // Default to last 30 days
      endDate = now
      startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
    }

    // Ensure end date is not in the future
    if (endDate > now) {
      endDate = now
    }

    // Calculate days between start and end
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)))

    return {
      start_date: startDate,
      end_date: endDate,
      days
    }
  }
}