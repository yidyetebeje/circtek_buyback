import Elysia, { t } from 'elysia'
import { repairReasonsController } from './controller'
import { requireRole } from "../../auth";

export const repair_reasons_routes = new Elysia({ prefix: '/repair-reasons' })
  .use(requireRole([]))
  .get('/', async (ctx) => {
    const { currentRole, currentTenantId, query } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    
    const result = await repairReasonsController.list(query, tenantScoped)
    return result
  }, {
    query: t.Object({
      page: t.Optional(t.Number()),
      limit: t.Optional(t.Number()),
      search: t.Optional(t.String()),
      status: t.Optional(t.Boolean())
    }),
    detail: {
      tags: ['Repair Reasons'],
      summary: 'List repair reasons',
      description: 'Get a paginated list of repair reasons with optional filtering'
    }
  })

  .get('/:id', async (ctx) => {
    const { currentRole, currentTenantId, params } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    
    const result = await repairReasonsController.getById(parseInt(params.id), tenantScoped)
    return result
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      tags: ['Repair Reasons'],
      summary: 'Get repair reason by ID',
      description: 'Get a specific repair reason by its ID'
    }
  })

  .post('/', async (ctx) => {
    const { currentTenantId, body } = ctx as any
    
    const result = await repairReasonsController.create(body, currentTenantId)
    return result
  }, {
    body: t.Object({
      name: t.String({
        minLength: 2,
        maxLength: 100,
        pattern: '^[a-zA-ZÀ-ÿ\\s\'\-]+$',
        description: 'Name must contain only letters, spaces, apostrophes, and hyphens (2-100 characters)'
      }),
      description: t.Optional(t.String({
        maxLength: 500,
        pattern: '^[a-zA-ZÀ-ÿ\\s\'\-]*$',
        description: 'Description must contain only letters, spaces, apostrophes, and hyphens (max 500 characters)'
      })),
      fixed_price: t.Optional(t.Number({
        minimum: 0,
        description: 'Optional fixed price for service-only repairs (must be >= 0)'
      })),
      status: t.Optional(t.Boolean())
    }),
    detail: {
      tags: ['Repair Reasons'],
      summary: 'Create repair reason',
      description: 'Create a new repair reason'
    }
  })

  .put('/:id', async (ctx) => {
    const { currentRole, currentTenantId, params, body } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    
    const result = await repairReasonsController.update(parseInt(params.id), body, tenantScoped)
    return result
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      name: t.Optional(t.String({
        minLength: 2,
        maxLength: 100,
        pattern: '^[a-zA-ZÀ-ÿ\\s\'\-]+$',
        description: 'Name must contain only letters, spaces, apostrophes, and hyphens (2-100 characters)'
      })),
      description: t.Optional(t.String({
        maxLength: 500,
        pattern: '^[a-zA-ZÀ-ÿ\\s\'\-]*$',
        description: 'Description must contain only letters, spaces, apostrophes, and hyphens (max 500 characters)'
      })),
      fixed_price: t.Optional(t.Number({
        minimum: 0,
        description: 'Optional fixed price for service-only repairs (must be >= 0)'
      })),
      status: t.Optional(t.Boolean())
    }),
    detail: {
      tags: ['Repair Reasons'],
      summary: 'Update repair reason',
      description: 'Update an existing repair reason'
    }
  })

  .delete('/:id', async (ctx) => {
    const { currentRole, currentTenantId, params } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    
    const result = await repairReasonsController.delete(parseInt(params.id), tenantScoped)
    return result
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      tags: ['Repair Reasons'],
      summary: 'Delete repair reason',
      description: 'Delete a repair reason by ID'
    }
  })

  // Model-specific pricing routes
  .get('/:id/with-model-prices', async (ctx) => {
    const { currentRole, currentTenantId, params } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    
    const result = await repairReasonsController.getByIdWithModelPrices(parseInt(params.id), tenantScoped)
    return result
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      tags: ['Repair Reasons'],
      summary: 'Get repair reason with model prices',
      description: 'Get a repair reason by ID including all model-specific prices'
    }
  })

  .get('/:id/model-prices', async (ctx) => {
    const { currentRole, currentTenantId, params } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    
    const result = await repairReasonsController.getModelPrices(parseInt(params.id), tenantScoped)
    return result
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      tags: ['Repair Reasons'],
      summary: 'Get model-specific prices',
      description: 'Get all model-specific prices for a repair reason'
    }
  })

  .post('/:id/model-prices', async (ctx) => {
    const { currentTenantId, params, body } = ctx as any
    
    const payload = {
      ...body,
      repair_reason_id: parseInt(params.id)
    }
    
    const result = await repairReasonsController.createModelPrice(payload, currentTenantId)
    return result
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      model_name: t.String({
        minLength: 1,
        maxLength: 255,
        description: 'Device model name (e.g., iPhone 14 Pro, iPhone 15)'
      }),
      fixed_price: t.Number({
        minimum: 0,
        description: 'Fixed price for this model (must be >= 0)'
      }),
      status: t.Optional(t.Boolean())
    }),
    detail: {
      tags: ['Repair Reasons'],
      summary: 'Create model-specific price',
      description: 'Create a model-specific price for a repair reason'
    }
  })

  .put('/model-prices/:priceId', async (ctx) => {
    const { currentRole, currentTenantId, params, body } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    
    const result = await repairReasonsController.updateModelPrice(parseInt(params.priceId), body, tenantScoped)
    return result
  }, {
    params: t.Object({
      priceId: t.String()
    }),
    body: t.Object({
      model_name: t.Optional(t.String({
        minLength: 1,
        maxLength: 255,
        description: 'Device model name'
      })),
      fixed_price: t.Optional(t.Number({
        minimum: 0,
        description: 'Fixed price for this model (must be >= 0)'
      })),
      status: t.Optional(t.Boolean())
    }),
    detail: {
      tags: ['Repair Reasons'],
      summary: 'Update model-specific price',
      description: 'Update a model-specific price'
    }
  })

  .delete('/model-prices/:priceId', async (ctx) => {
    const { currentRole, currentTenantId, params } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    
    const result = await repairReasonsController.deleteModelPrice(parseInt(params.priceId), tenantScoped)
    return result
  }, {
    params: t.Object({
      priceId: t.String()
    }),
    detail: {
      tags: ['Repair Reasons'],
      summary: 'Delete model-specific price',
      description: 'Delete a model-specific price by ID'
    }
  })
