import { t, type Static } from "elysia";

// Query parameters for device-level stock listing
export const DeviceStockQuery = t.Object({
    page: t.Optional(t.Number({ default: 1 })),
    limit: t.Optional(t.Number({ default: 20 })),
    search: t.Optional(t.String()), // Search by IMEI or serial
    warehouseId: t.Optional(t.Number()),
    shopId: t.Optional(t.Number()),
    isDead: t.Optional(t.Boolean()),
    modelName: t.Optional(t.String()),
    storage: t.Optional(t.String()),
    colorName: t.Optional(t.String()),
    sku: t.Optional(t.String()),
    grade: t.Optional(t.String()),
    sortBy: t.Optional(t.String()),
    sortDirection: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

export type DeviceStockQueryInput = Static<typeof DeviceStockQuery>;

// Device stock item returned from the API
export type DeviceStockItem = {
    id: number; // stock_device_ids.id
    imei: string | null;
    serial: string | null;
    sku: string | null;
    grade: string | null;
    modelName: string | null;
    storage: string | null;
    colorName: string | null;
    warehouseId: number;
    warehouseName: string | null;
    isDead: boolean;
    createdAt: string | null;
    deviceId: number;
};

// Filters available for the UI
export type DeviceStockFilters = {
    modelNames: string[];
    storage: string[];
    colorNames: string[];
    skus: string[];
    grades: string[];
};

// Paginated response
export type DeviceStockListResult = {
    data: DeviceStockItem[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    filters?: DeviceStockFilters;
};
