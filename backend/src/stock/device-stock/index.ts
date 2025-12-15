import Elysia, { t } from "elysia";
import { requireRole } from "../../auth";
import { deviceStockController } from "./controller";
import { DeviceStockQuery } from "./types";

export const device_stock_routes = new Elysia({ prefix: '/device-stock' })
    .use(requireRole([]))

    // List device stock with filtering and pagination
    .get('/', async (ctx) => {
        const { query, currentRole, currentTenantId } = ctx as any;
        const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId;
        return deviceStockController.list(query as any, tenantScoped);
    }, {
        query: DeviceStockQuery,
        detail: {
            tags: ['Stock Management'],
            summary: 'List device stock',
            description: 'Get paginated list of devices in stock with filtering by warehouse, model, storage, color, SKU, and dead status',
        },
    })

    // Get available filter options
    .get('/filters', async (ctx) => {
        const { query, currentRole, currentTenantId } = ctx as any;
        const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId;

        const params = {
            warehouseId: query.warehouseId ? Number(query.warehouseId) : undefined,
            shopId: query.shopId ? Number(query.shopId) : undefined,
            isDead: query.isDead !== undefined ? query.isDead === 'true' || query.isDead === true : undefined,
        };

        return deviceStockController.getFilters(params, tenantScoped);
    }, {
        query: t.Object({
            warehouseId: t.Optional(t.Union([t.Number(), t.String()])),
            shopId: t.Optional(t.Union([t.Number(), t.String()])),
            isDead: t.Optional(t.Union([t.Boolean(), t.String()])),
        }),
        detail: {
            tags: ['Stock Management'],
            summary: 'Get stock filter options',
            description: 'Get available filter options (model names, storage, colors, SKUs) based on current stock',
        },
    })

    // Get a single device stock item by ID
    .get('/:id', async (ctx) => {
        const { params, currentRole, currentTenantId } = ctx as any;
        const id = Number(params.id);

        if (isNaN(id) || id <= 0) {
            return {
                data: null,
                message: 'Invalid ID provided',
                status: 400,
                error: 'ID must be a positive number',
            };
        }

        const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId;
        return deviceStockController.getById(id, tenantScoped);
    }, {
        detail: {
            tags: ['Stock Management'],
            summary: 'Get device stock item by ID',
            description: 'Get a specific device stock item by its ID',
        },
    });

export default device_stock_routes;
