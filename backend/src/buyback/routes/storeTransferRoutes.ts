import { Elysia, t } from "elysia";
import { storeTransferController } from "../controller/storeTransferController";
import { requireRole } from "../../auth";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors";

const createTransferSchema = t.Object({
    orderIds: t.Array(t.String({ minLength: 1 }), { minItems: 1, error: "At least one order ID is required" }),
    toWarehouseId: t.Number({ minimum: 1, error: "Destination warehouse is required" }),
    originAddressId: t.Optional(t.Number({ minimum: 1 })),
    deliveryAddressId: t.Optional(t.Number({ minimum: 1 })),
});

const getCandidatesQuerySchema = t.Object({
    days: t.Optional(t.Numeric({ minimum: 1, maximum: 90 })), // default 7
    shopId: t.Optional(t.Numeric({ minimum: 1 })),
});

export const storeTransferRoutes = new Elysia({ prefix: "/store-transfers" })
    .use(requireRole(["admin", "super_admin", "shop_manager"]))
    .onError(({ error, code, set }) => {
        // Handle validation errors
        if (code === "VALIDATION") {
            set.status = 400;
            const errorMessage = error instanceof Error ? error.message : "Validation failed";
            return {
                success: false,
                error: errorMessage,
                type: "ValidationError",
            };
        }

        // Handle custom application errors with proper status codes
        if (error instanceof ForbiddenError) {
            set.status = 403;
            return {
                success: false,
                error: error.message,
                type: "ForbiddenError",
            };
        }

        if (error instanceof BadRequestError) {
            set.status = 400;
            return {
                success: false,
                error: error.message,
                type: "BadRequestError",
            };
        }

        if (error instanceof NotFoundError) {
            set.status = 404;
            return {
                success: false,
                error: error.message,
                type: "NotFoundError",
            };
        }

        // Log unexpected errors and return generic message
        console.error("[StoreTransferRoutes] Unhandled error:", error);
        set.status = 500;
        return {
            success: false,
            error: "An unexpected error occurred",
            type: "InternalServerError",
        };
    })
    // Get transfer candidates (orders from last N days that can be transferred)
    .get("/candidates", storeTransferController.getCandidates, {
        query: getCandidatesQuerySchema,
        detail: {
            summary: "Get transfer candidates",
            description: "Returns buyback orders from the last N days (default 7) that are eligible for transfer to a warehouse. Only PAID orders are included.",
            tags: ["Store Transfers", "Buyback"],
        },
    })
    // Create a new store-to-warehouse transfer with label generation
    .post("/", storeTransferController.createTransfer, {
        body: createTransferSchema,
        detail: {
            summary: "Create store to warehouse transfer",
            description: "Creates a transfer for selected orders to the specified warehouse and generates a Sendcloud shipping label.",
            tags: ["Store Transfers", "Buyback", "Shipping"],
        },
    })
    // Get existing transfers created by the current shop
    .get("/", storeTransferController.listTransfers, {
        query: t.Object({
            status: t.Optional(t.Union([t.Literal("pending"), t.Literal("completed")])),
            page: t.Optional(t.Numeric({ minimum: 1 })),
            limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
        }),
        detail: {
            summary: "List store transfers",
            description: "Lists transfers created by the current shop/user.",
            tags: ["Store Transfers", "Buyback"],
        },
    })
    // Download label for a transfer
    .get("/:transferId/label", storeTransferController.downloadLabel, {
        params: t.Object({ transferId: t.Numeric({ minimum: 1 }) }),
        query: t.Object({ format: t.Optional(t.Union([t.Literal("a4"), t.Literal("a6")])) }),
        detail: {
            summary: "Download transfer shipping label",
            description: "Downloads the shipping label PDF for a store transfer.",
            tags: ["Store Transfers", "Buyback", "Shipping"],
        },
    })
    // Update transfer status
    .patch("/:transferId/status", storeTransferController.updateStatus, {
        params: t.Object({ transferId: t.Numeric({ minimum: 1 }) }),
        body: t.Object({
            status: t.Union([t.Literal("pending"), t.Literal("completed")]),
        }),
        detail: {
            summary: "Update transfer status",
            description: "Updates the status of a store transfer to pending or completed.",
            tags: ["Store Transfers", "Buyback"],
        },
    })
    // Get transfer details
    .get("/:transferId", storeTransferController.getTransferDetails, {
        params: t.Object({ transferId: t.Numeric({ minimum: 1 }) }),
        detail: {
            summary: "Get transfer details",
            description: "Returns detailed information about a store transfer including items and shipment info.",
            tags: ["Store Transfers", "Buyback"],
        },
    });

