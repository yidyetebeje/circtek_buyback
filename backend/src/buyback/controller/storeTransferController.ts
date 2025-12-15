
import { storeTransferService } from "../services/storeTransferService";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors";

class StoreTransferController {
    /**
     * Get buyback orders eligible for transfer (PAID orders from last N days)
     */
    getCandidates = async (context: any) => {
        try {
            const { query } = context;
            const user = context.user;

            if (!user) {
                throw new ForbiddenError("Authentication required");
            }

            const days = query?.days ? Number(query.days) : 7;
            const shopId = query?.shopId ? Number(query.shopId) : undefined;

            // For shop managers, restrict to their managed shop
            let allowedShopIds: number[] | undefined;
            if (user.role === "shop_manager") {
                if (!user.managedShopId) {
                    throw new ForbiddenError("Shop manager must have a managed shop assigned");
                }
                allowedShopIds = [user.managedShopId];
                // If shopId is provided, ensure it matches managed shop
                if (shopId && shopId !== user.managedShopId) {
                    throw new ForbiddenError("You can only view candidates for your managed shop");
                }
            }

            const candidates = await storeTransferService.getTransferCandidates({
                days,
                shopId: shopId || (user.role === "shop_manager" ? user.managedShopId : undefined),
                tenantId: user.tenantId,
                allowedShopIds,
            });

            return {
                success: true,
                data: candidates,
            };
        } catch (error: any) {
            console.error("[StoreTransferController] getCandidates error:", error);
            if (error instanceof ForbiddenError || error instanceof BadRequestError) {
                throw error;
            }
            throw new Error(`Failed to get transfer candidates: ${error.message}`);
        }
    };

    /**
     * Create a store-to-warehouse transfer with shipping label
     */
    createTransfer = async (context: any) => {
        try {
            const { body } = context;
            const user = context.user;

            if (!user) {
                throw new ForbiddenError("Authentication required");
            }

            const { orderIds, toWarehouseId } = body as {
                orderIds: string[];
                toWarehouseId: number;
            };

            if (!orderIds || orderIds.length === 0) {
                throw new BadRequestError("At least one order must be selected");
            }

            // For shop managers, we'll validate the orders belong to their shop in the service
            const result = await storeTransferService.createStoreTransfer({
                orderIds,
                toWarehouseId,
                createdByUserId: user.id,
                tenantId: user.tenantId,
                shopManagerShopId: user.role === "shop_manager" ? user.managedShopId : undefined,
            });

            return {
                success: true,
                data: result,
                message: "Transfer created successfully with shipping label",
            };
        } catch (error: any) {
            console.error("[StoreTransferController] createTransfer error:", error);
            if (
                error instanceof ForbiddenError ||
                error instanceof BadRequestError ||
                error instanceof NotFoundError
            ) {
                throw error;
            }
            throw new Error(`Failed to create transfer: ${error.message}`);
        }
    };

    /**
     * List transfers created by the current shop/user
     */
    listTransfers = async (context: any) => {
        try {
            const { query } = context;
            const user = context.user;

            if (!user) {
                throw new ForbiddenError("Authentication required");
            }

            const status = query?.status as "pending" | "completed" | undefined;
            const page = query?.page ? Number(query.page) : 1;
            const limit = query?.limit ? Number(query.limit) : 20;

            const transfers = await storeTransferService.listStoreTransfers({
                tenantId: user.tenantId,
                createdByUserId: user.role === "shop_manager" ? user.id : undefined,
                status,
                page,
                limit,
            });

            return {
                success: true,
                data: transfers,
            };
        } catch (error: any) {
            console.error("[StoreTransferController] listTransfers error:", error);
            throw new Error(`Failed to list transfers: ${error.message}`);
        }
    };

    /**
     * Download shipping label PDF for a transfer
     */
    downloadLabel = async (context: any) => {
        try {
            const { params, query, set } = context;
            const user = context.user;

            if (!user) {
                throw new ForbiddenError("Authentication required");
            }

            const transferId = Number(params.transferId);
            const format = (query?.format as "a4" | "a6") || "a4";

            const labelBuffer = await storeTransferService.getTransferLabel({
                transferId,
                format,
                tenantId: user.tenantId,
            });

            if (!labelBuffer) {
                throw new NotFoundError("Label not found for this transfer");
            }

            set.headers["Content-Type"] = "application/pdf";
            set.headers["Content-Disposition"] = `attachment; filename="transfer-${transferId}-label.pdf"`;

            return labelBuffer;
        } catch (error: any) {
            console.error("[StoreTransferController] downloadLabel error:", error);
            if (error instanceof NotFoundError || error instanceof ForbiddenError) {
                throw error;
            }
            throw new Error(`Failed to download label: ${error.message}`);
        }
    };
}

export const storeTransferController = new StoreTransferController();
