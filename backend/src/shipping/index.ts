import Elysia from 'elysia'
import { shippingController } from './controller'
import {
    ShipmentCreate,
    ShipmentUpdate,
    ShipmentQuery,
    GenerateLabelRequest,
    SendcloudConfigCreate,
} from './types'

export const shipping_routes = new Elysia({ prefix: '/shipping' })
    // ============ SHIPMENTS ============

    // Create a new shipment
    .post('/', async (ctx) => {
        const { currentUserId, currentTenantId } = ctx as any
        return shippingController.createShipment(ctx.body as any, currentUserId, currentTenantId)
    }, {
        body: ShipmentCreate,
        detail: {
            tags: ['Shipping'],
            summary: 'Create a new shipment',
            description: 'Create a shipment with items. Set request_label=true to immediately generate a shipping label.',
        },
    })

    // List shipments
    .get('/', async (ctx) => {
        const { currentRole, currentTenantId } = ctx as any
        const tenant_id = currentRole === 'super_admin' ? undefined : currentTenantId
        return shippingController.listShipments(ctx.query as any, tenant_id)
    }, {
        query: ShipmentQuery,
        detail: {
            tags: ['Shipping'],
            summary: 'List shipments',
            description: 'Get a paginated list of shipments with optional filters',
        },
    })

    // Get a single shipment
    .get('/:id', async (ctx) => {
        const { currentRole, currentTenantId } = ctx as any
        const tenant_id = currentRole === 'super_admin' ? undefined : currentTenantId
        return shippingController.getShipment(Number(ctx.params.id), tenant_id)
    }, {
        detail: {
            tags: ['Shipping'],
            summary: 'Get shipment details',
            description: 'Get full details of a shipment including items',
        },
    })

    // Update a shipment
    .put('/:id', async (ctx) => {
        const { currentRole, currentTenantId } = ctx as any
        const tenant_id = currentRole === 'super_admin' ? undefined : currentTenantId
        return shippingController.updateShipment(Number(ctx.params.id), ctx.body as any, tenant_id)
    }, {
        body: ShipmentUpdate,
        detail: {
            tags: ['Shipping'],
            summary: 'Update a shipment',
            description: 'Update shipment details or status',
        },
    })

    // Delete (cancel) a shipment
    .delete('/:id', async (ctx) => {
        const { currentRole, currentTenantId } = ctx as any
        const tenant_id = currentRole === 'super_admin' ? undefined : currentTenantId
        return shippingController.deleteShipment(Number(ctx.params.id), tenant_id)
    }, {
        detail: {
            tags: ['Shipping'],
            summary: 'Cancel a shipment',
            description: 'Cancel a shipment. If already sent to Sendcloud, will attempt to cancel there too.',
        },
    })

    // ============ LABELS ============

    // Generate shipping label
    .post('/labels/generate', async (ctx) => {
        const { currentTenantId } = ctx as any
        return shippingController.generateLabel(ctx.body as any, currentTenantId)
    }, {
        body: GenerateLabelRequest,
        detail: {
            tags: ['Shipping', 'Labels'],
            summary: 'Generate shipping label',
            description: 'Generate a shipping label via Sendcloud API',
        },
    })

    // Download label PDF
    .get('/labels/:id/pdf', async (ctx) => {
        const { currentTenantId } = ctx as any
        const format = (ctx.query.format as 'a4' | 'a6') || 'a4'

        const result = await shippingController.downloadLabelPdf(
            Number(ctx.params.id),
            format,
            currentTenantId
        )

        if (result.status !== 200 || !result.data) {
            return result
        }

        // Return PDF as download
        ctx.set.headers['Content-Type'] = 'application/pdf'
        ctx.set.headers['Content-Disposition'] = `attachment; filename="label-${ctx.params.id}.pdf"`
        return result.data
    }, {
        detail: {
            tags: ['Shipping', 'Labels'],
            summary: 'Download label PDF',
            description: 'Download the shipping label as a PDF file',
        },
    })

    // ============ SENDCLOUD INTEGRATION ============

    // Get available shipping methods (UPS)
    .get('/methods', async (ctx) => {
        const { currentTenantId } = ctx as any
        return shippingController.getShippingMethods(currentTenantId)
    }, {
        detail: {
            tags: ['Shipping', 'Sendcloud'],
            summary: 'Get shipping methods',
            description: 'Get available UPS shipping methods from Sendcloud',
        },
    })

    // Get sender addresses
    .get('/sender-addresses', async (ctx) => {
        const { currentTenantId } = ctx as any
        return shippingController.getSenderAddresses(currentTenantId)
    }, {
        detail: {
            tags: ['Shipping', 'Sendcloud'],
            summary: 'Get sender addresses',
            description: 'Get configured sender addresses from Sendcloud',
        },
    })

    // Configure Sendcloud
    .post('/config', async (ctx) => {
        const { currentTenantId } = ctx as any
        return shippingController.configureSendcloud(ctx.body as any, currentTenantId)
    }, {
        body: SendcloudConfigCreate,
        detail: {
            tags: ['Shipping', 'Sendcloud'],
            summary: 'Configure Sendcloud',
            description: 'Set up Sendcloud API credentials for the tenant',
        },
    })

    // Get Sendcloud config status
    .get('/config', async (ctx) => {
        const { currentTenantId } = ctx as any
        return shippingController.getSendcloudConfig(currentTenantId)
    }, {
        detail: {
            tags: ['Shipping', 'Sendcloud'],
            summary: 'Get Sendcloud config',
            description: 'Check if Sendcloud is configured for the tenant',
        },
    })

// Re-export for use in main app
export { shippingController } from './controller'
export { shippingRepository } from './repository'
