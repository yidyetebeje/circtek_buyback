import Elysia from "elysia";
import { stock_routes } from "./stock";
import { movements_routes } from "./movements";
import { purchases_routes } from "./purchases";
import { transfers_routes } from "./transfers";
import { adjustments_routes } from "./adjustments";
import { consumption_routes } from "./consumption";
import { repairs_routes } from "./repairs";
import { sku_specs_routes } from "./sku-specs";
import { repair_reasons_routes } from "./repair-reasons";
import { device_events_routes } from "./device-events/index";
import { analytics_routes } from "./analytics";
import { stock_in_routes } from "./stock-in";
import { sku_mappings_routes } from "./sku-mappings";
import { device_stock_routes } from "./device-stock";

// Main stock management routes that combines all submodules
export const stock_management_routes = new Elysia({ prefix: '/stock' })
  // Current stock levels and management
  .use(stock_routes)

  // Stock movements ledger and audit trail
  .use(movements_routes)

  // Purchase orders and receiving
  .use(purchases_routes)

  // Inter-warehouse transfers
  .use(transfers_routes)

  // Stock adjustments and write-offs
  .use(adjustments_routes)

  // Parts consumption for repairs
  .use(consumption_routes)

  // Repairs module
  .use(repairs_routes)

  // SKU specifications management
  .use(sku_specs_routes)

  // Repair reasons management
  .use(repair_reasons_routes)

  // Device events history
  .use(device_events_routes)

  // Stock in with grading
  .use(stock_in_routes)

  // Stock analytics and reporting
  .use(analytics_routes)

  // SKU mapping rules management
  .use(sku_mappings_routes)

  // Device-level stock listing (for buyback frontend)
  .use(device_stock_routes)

  // Global stock dashboard endpoint
  .get('/dashboard', async (ctx: any) => {
    const { currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId

    try {
      // Import controllers
      const { stockController } = await import('./stock')
      const { movementsController } = await import('./movements')
      const { transfersController } = await import('./transfers')

      // Get summary data from each module
      const [
        stockSummary,
        movementSummary,
        transferSummary
      ] = await Promise.all([
        stockController.getStockSummary(tenantScoped),
        movementsController.getMovementSummary({}, tenantScoped),
        transfersController.getTransferSummary(tenantScoped)
      ])

      const dashboard = {
        stock: stockSummary.data,
        movements: movementSummary.data,
        transfers: transferSummary.data,
        last_updated: new Date().toISOString()
      }

      return {
        data: dashboard,
        message: 'Stock dashboard data retrieved successfully',
        status: 200
      }
    } catch (error) {
      return {
        data: null,
        message: 'Failed to fetch dashboard data',
        status: 500,
        error: (error as Error).message
      }
    }
  }, {
    detail: {
      tags: ['Stock Management'],
      summary: 'Get stock dashboard',
      description: 'Get comprehensive stock management dashboard with summaries from all modules'
    }
  })

  // Health check endpoint
  .get('/health', () => {
    return {
      data: {
        status: 'healthy',
        modules: [
          'stock',
          'movements',
          'purchases',
          'transfers',
          'adjustments',
          'consumption',
          'repairs',
          'sku-specs',
          'sku-mappings',
          'repair-reasons',
          'device-events',
          'stock-in',
          'analytics'
        ],
        timestamp: new Date().toISOString()
      },
      message: 'Stock management system is operational',
      status: 200
    }
  }, {
    detail: {
      tags: ['Stock Management'],
      summary: 'Health check',
      description: 'Check if the stock management system is operational'
    }
  });

// Export individual controllers for cross-module usage
export { stockController, stockRepository } from './stock'
export { movementsController, movementsRepository } from './movements'
export { purchasesController, purchasesRepository } from './purchases'
export { transfersController, transfersRepository } from './transfers'
export { adjustmentsController } from './adjustments'
export { consumptionController } from './consumption'
export { analyticsController, analyticsRepository } from './analytics'
export { skuMappingsController } from './sku-mappings'

// Export the main routes
export default stock_management_routes;
