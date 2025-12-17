import Elysia, { t } from 'elysia'
import { shippingController } from './controller'
import {
    ShipmentCreate,
    ShipmentUpdate,
    ShipmentQuery,
    GenerateLabelRequest,
    SendcloudConfigCreate,
} from './types'
import { requireRole } from '../auth'

export const shipping_routes = new Elysia({ prefix: '/shipping' })
    // ============ SHIPMENTS ============

    // Create a new shipment (requires shop_id in body or query)
    .use(requireRole([]))
    .post('/', async (ctx) => {
        const { currentUserId, currentTenantId } = ctx as any
        const body = ctx.body as any
        const shop_id = body.shop_id || Number(ctx.query.shop_id)
        if (!shop_id) {
            return { data: null, message: 'shop_id is required', status: 400 }
        }
        return shippingController.createShipment(body, currentUserId, shop_id, currentTenantId)
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
        const { currentTenantId } = ctx as any
        const shop_id = Number(ctx.query.shop_id)
        if (!shop_id) {
            return { data: null, message: 'shop_id query parameter is required', status: 400 }
        }
        return shippingController.deleteShipment(Number(ctx.params.id), shop_id, currentTenantId)
    }, {
        detail: {
            tags: ['Shipping'],
            summary: 'Cancel a shipment',
            description: 'Cancel a shipment. If already sent to Sendcloud, will attempt to cancel there too. Requires shop_id query param.',
        },
    })

    // ============ LABELS ============

    // Generate shipping label for a shop
    .post('/shops/:shop_id/labels/generate', async (ctx) => {
        const { currentTenantId } = ctx as any
        const shop_id = Number(ctx.params.shop_id)
        return shippingController.generateLabel(ctx.body as any, shop_id, currentTenantId)
    }, {
        body: GenerateLabelRequest,
        detail: {
            tags: ['Shipping', 'Labels'],
            summary: 'Generate shipping label',
            description: 'Generate a shipping label via Sendcloud API for a specific shop',
        },
    })

    // Download label PDF
    .get('/shops/:shop_id/labels/:id/pdf', async (ctx) => {
        const { currentTenantId } = ctx as any
        const shop_id = Number(ctx.params.shop_id)
        const format = (ctx.query.format as 'a4' | 'a6') || 'a4'

        const result = await shippingController.downloadLabelPdf(
            Number(ctx.params.id),
            format,
            shop_id,
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
            description: 'Download the shipping label as a PDF file for a specific shop',
        },
    })

    // ============ SENDCLOUD INTEGRATION ============

    // Get available shipping methods (UPS) for a shop
    .get('/shops/:shop_id/methods', async (ctx) => {
        const { currentTenantId } = ctx as any
        const shop_id = Number(ctx.params.shop_id)
        return shippingController.getShippingMethods(shop_id, currentTenantId)
    }, {
        detail: {
            tags: ['Shipping', 'Sendcloud'],
            summary: 'Get shipping methods',
            description: 'Get available UPS shipping methods from Sendcloud for a specific shop',
        },
    })

    // Get available shipping options (V3) - valid codes for ship_with
    .get('/shops/:shop_id/shipping-options', async (ctx) => {
        const { currentTenantId } = ctx as any
        const shop_id = Number(ctx.params.shop_id)
        const { from_country, to_country } = ctx.query as any
        return shippingController.getShippingOptions(shop_id, currentTenantId, from_country, to_country)
    }, {
        detail: {
            tags: ['Shipping', 'Sendcloud'],
            summary: 'Get V3 shipping options',
            description: 'Get available shipping option codes from Sendcloud V3 API for a specific shop. Use from_country (e.g., ET) and to_country (e.g., NL) query params to filter.',
        },
    })

    // Get sender/return addresses from Sendcloud
    .get('/shops/:shop_id/sender-addresses', async (ctx) => {
        const { currentTenantId } = ctx as any
        const shop_id = Number(ctx.params.shop_id)
        return shippingController.getSenderAddresses(shop_id, currentTenantId)
    }, {
        detail: {
            tags: ['Shipping', 'Sendcloud'],
            summary: 'Get sender addresses',
            description: 'Get all sender/return addresses configured in Sendcloud account for a specific shop.',
        },
    })

    // Configure Sendcloud for a shop
    .post('/shops/:shop_id/config', async (ctx) => {
        const { currentTenantId } = ctx as any
        const shop_id = Number(ctx.params.shop_id)

        if (!currentTenantId) {
            return { data: null, message: 'Tenant ID is required', status: 401 }
        }

        const body = ctx.body as any
        // Ensure shop_id from URL is used
        return shippingController.configureSendcloud({ ...body, shop_id }, currentTenantId)
    }, {
        body: t.Object({
            public_key: t.String(),
            secret_key: t.Optional(t.String()), // Optional when updating existing config
            default_sender_address_id: t.Optional(t.Number()),
            default_shipping_method_id: t.Optional(t.Number()),
            default_shipping_option_code: t.Optional(t.String()),
            use_test_mode: t.Optional(t.Boolean()),
        }),
        detail: {
            tags: ['Shipping', 'Sendcloud'],
            summary: 'Configure Sendcloud for a shop',
            description: 'Set up Sendcloud API credentials for a specific shop',
        },
    })

    // Get Sendcloud config status for a shop
    .get('/shops/:shop_id/config', async (ctx) => {
        const { currentTenantId } = ctx as any
        const shop_id = Number(ctx.params.shop_id)
        return shippingController.getSendcloudConfig(shop_id, currentTenantId)
    }, {
        detail: {
            tags: ['Shipping', 'Sendcloud'],
            summary: 'Get Sendcloud config for a shop',
            description: 'Check if Sendcloud is configured for a specific shop',
        },
    })

// Re-export for use in main app
export { shippingController } from './controller'
export { shippingRepository } from './repository'
