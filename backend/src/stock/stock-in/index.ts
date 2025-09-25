import Elysia, { t } from 'elysia'
import { requireRole } from '../../auth'
import { stockInController } from './controller'
import { StockInRequest } from './types'

export const stock_in_routes = new Elysia({ prefix: '/stock-in' })
  .use(requireRole([]))
  .post('/', async (ctx) => {
    const { body, currentUserId, currentTenantId } = ctx as any
    
    if (!currentUserId || !currentTenantId) {
      return {
        data: null,
        message: 'Missing authentication context',
        status: 401
      }
    }

    const result = await stockInController.stockIn(
      body,
      currentUserId,
      currentTenantId
    )

    return result
  }, {
    body: StockInRequest,
    detail: {
      tags: ['Stock Management'],
      summary: 'Stock in device with grade',
      description: 'Record a tested device IMEI with its grade. This creates a device grade record and fires a device event for history tracking.'
    }
  })
  .get('/history/:imei', async (ctx) => {
    const { params, currentTenantId } = ctx as any
    
    if (!currentTenantId) {
      return {
        data: null,
        message: 'Missing authentication context',
        status: 401
      }
    }

    const result = await stockInController.getDeviceGradeHistory(
      params.imei,
      currentTenantId
    )

    return result
  }, {
    params: t.Object({
      imei: t.String({ description: 'Device IMEI' })
    }),
    detail: {
      tags: ['Stock Management'],
      summary: 'Get device grade history',
      description: 'Retrieve the grading history for a device by its IMEI.'
    }
  })

export default stock_in_routes
