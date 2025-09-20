import Elysia from "elysia"
import { SkuUsageAnalyticsRepository } from "./repository"
import { SkuUsageAnalyticsController } from "./controller"
import { SkuUsageAnalyticsQuery } from "./types"
import { db } from "../../db"
import { requireRole } from "../../auth"

const repo = new SkuUsageAnalyticsRepository(db)
const controller = new SkuUsageAnalyticsController(repo)

export const analytics_routes = new Elysia({ prefix: '/analytics' })
  .use(requireRole([]))
  
  // Main SKU usage analytics endpoint
  .get('/sku-usage', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getSkuUsageAnalytics(query as any, tenantScoped)
  }, { 
    query: SkuUsageAnalyticsQuery, 
    detail: { 
      tags: ['Stock Analytics'], 
      summary: 'Get SKU usage analytics for repair parts',
      description: 'Retrieve detailed analytics about part SKU usage in repairs, including current stock levels, usage rates, and projected days until empty. Shows how many parts were used for repairs in a given period (e.g., last 30 days) and calculates when current stock will be depleted based on usage patterns.'
    } 
  })

  // Parts at risk - parts that will run out soon
  .get('/parts-at-risk', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    const riskThreshold = query?.risk_threshold ? Number(query.risk_threshold) : 30
    return controller.getPartsAtRisk(query as any, tenantScoped, riskThreshold)
  }, { 
    query: SkuUsageAnalyticsQuery, 
    detail: { 
      tags: ['Stock Analytics'], 
      summary: 'Get parts at risk of running out',
      description: 'Get parts that are at risk of running out based on current usage patterns. Default threshold is 30 days, but can be customized with risk_threshold query parameter.'
    } 
  })

  // High usage parts - most consumed parts
  .get('/high-usage-parts', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    const minUsage = query?.min_usage ? Number(query.min_usage) : 10
    return controller.getHighUsageParts(query as any, tenantScoped, minUsage)
  }, { 
    query: SkuUsageAnalyticsQuery, 
    detail: { 
      tags: ['Stock Analytics'], 
      summary: 'Get high usage parts',
      description: 'Get parts with high usage rates, sorted by quantity used. Default minimum usage is 10, but can be customized with min_usage query parameter.'
    } 
  })

  // Usage analytics for specific warehouse
  .get('/warehouse/:warehouseId/usage', async (ctx) => {
    const { params, query, currentRole, currentTenantId } = ctx as any
    const warehouseId = Number(params.warehouseId)
    
    // Validate warehouse ID parameter
    if (isNaN(warehouseId) || warehouseId <= 0) {
      return {
        data: null,
        message: 'Invalid warehouse ID provided',
        status: 400,
        error: 'Warehouse ID must be a positive number'
      }
    }
    
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getWarehouseUsageSummary(warehouseId, query as any, tenantScoped)
  }, { 
    query: SkuUsageAnalyticsQuery, 
    detail: { 
      tags: ['Stock Analytics'], 
      summary: 'Get usage analytics for specific warehouse',
      description: 'Get detailed usage analytics for all parts in a specific warehouse, including usage patterns and stock levels.'
    } 
  })

  // Usage analytics for specific SKU across warehouses
  .get('/sku/:sku/usage', async (ctx) => {
    const { params, query, currentRole, currentTenantId } = ctx as any
    const sku = params.sku
    
    // Validate SKU parameter
    if (!sku || sku.trim().length === 0) {
      return {
        data: null,
        message: 'Invalid SKU provided',
        status: 400,
        error: 'SKU cannot be empty'
      }
    }
    
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getSkuUsageAcrossWarehouses(sku, query as any, tenantScoped)
  }, { 
    query: SkuUsageAnalyticsQuery, 
    detail: { 
      tags: ['Stock Analytics'], 
      summary: 'Get usage analytics for specific SKU across warehouses',
      description: 'Get usage analytics for a specific SKU across all warehouses, showing how the part is being consumed in different locations.'
    } 
  })

  // Export usage data
  .get('/export/sku-usage', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    const format = query?.format === 'csv' ? 'csv' : 'json'
    return controller.exportUsageData(query as any, tenantScoped, format)
  }, { 
    query: SkuUsageAnalyticsQuery, 
    detail: { 
      tags: ['Stock Analytics'], 
      summary: 'Export SKU usage analytics data',
      description: 'Export usage analytics data in JSON or CSV format. Use format=csv query parameter for CSV export.'
    } 
  })

// Export the controller and repository for use by other modules
export { controller as analyticsController, repo as analyticsRepository }