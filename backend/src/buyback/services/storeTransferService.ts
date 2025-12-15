import { and, eq, gte, inArray, desc, sql, count, lte } from "drizzle-orm";
import { db } from "../../db";
import { orders, ORDER_STATUS, shipping_details } from "../../db/order.schema";
import { shops } from "../../db/shops.schema";
import { transfers, transfer_items, warehouses, shipments, shipment_items, sendcloud_config } from "../../db/circtek.schema";
import { createSendcloudClient } from "../../shipping/sendcloud/client";
import type { SendcloudParcelInput } from "../../shipping/sendcloud/types";

interface GetCandidatesParams {
    days: number;
    shopId?: number;
    tenantId: number;
    allowedShopIds?: number[];
}

interface CreateTransferParams {
    orderIds: string[];
    toWarehouseId: number;
    createdByUserId: number;
    tenantId: number;
    shopManagerShopId?: number;
}

interface ListTransfersParams {
    tenantId: number;
    createdByUserId?: number;
    status?: "pending" | "completed";
    page: number;
    limit: number;
}

interface GetLabelParams {
    transferId: number;
    format: "a4" | "a6";
    tenantId: number;
}

// Generate a simple ID
const generateId = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const storeTransferService = {
    /**
     * Get buyback orders that are eligible for transfer (PAID status, within date range)
     */
    getTransferCandidates: async (params: GetCandidatesParams) => {
        const { days, shopId, tenantId, allowedShopIds } = params;

        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);

        const conditions: any[] = [
            eq(orders.status, ORDER_STATUS.PAID),
            eq(orders.tenant_id, tenantId),
            gte(orders.created_at, dateFrom),
        ];

        if (shopId) {
            conditions.push(eq(orders.shop_id, shopId));
        }

        if (allowedShopIds && allowedShopIds.length > 0) {
            conditions.push(inArray(orders.shop_id, allowedShopIds));
        }

        // Join with shops to get shop details
        const candidateOrders = await db
            .select({
                id: orders.id,
                orderNumber: orders.order_number,
                deviceSnapshot: orders.device_snapshot,
                estimatedPrice: orders.estimated_price,
                finalPrice: orders.final_price,
                imei: orders.imei,
                sku: orders.sku,
                serialNumber: orders.serial_number,
                createdAt: orders.created_at,
                shopId: orders.shop_id,
                shopName: shops.name,
            })
            .from(orders)
            .leftJoin(shops, eq(orders.shop_id, shops.id))
            .where(and(...conditions))
            .orderBy(desc(orders.created_at));

        return candidateOrders;
    },

    /**
     * Create a store-to-warehouse transfer with shipping label generation
     */
    createStoreTransfer: async (params: CreateTransferParams) => {
        const { orderIds, toWarehouseId, createdByUserId, tenantId, shopManagerShopId } = params;

        // Validate destination warehouse exists
        const [destWarehouse] = await db
            .select()
            .from(warehouses)
            .where(and(eq(warehouses.id, toWarehouseId), eq(warehouses.tenant_id, tenantId)))
            .limit(1);

        if (!destWarehouse) {
            throw new Error("Destination warehouse not found");
        }

        // Fetch the orders to transfer
        const orderConditions: any[] = [
            inArray(orders.id, orderIds),
            eq(orders.tenant_id, tenantId),
            eq(orders.status, ORDER_STATUS.PAID),
        ];

        if (shopManagerShopId) {
            orderConditions.push(eq(orders.shop_id, shopManagerShopId));
        }

        const ordersToTransfer = await db
            .select({
                id: orders.id,
                orderNumber: orders.order_number,
                deviceSnapshot: orders.device_snapshot,
                imei: orders.imei,
                sku: orders.sku,
                serialNumber: orders.serial_number,
                shopId: orders.shop_id,
            })
            .from(orders)
            .where(and(...orderConditions));

        if (ordersToTransfer.length !== orderIds.length) {
            throw new Error(
                `Some orders are not eligible for transfer. Found ${ordersToTransfer.length} of ${orderIds.length} requested.`
            );
        }

        // Get the shop to determine the source warehouse
        const shopId = ordersToTransfer[0].shopId;
        const [shop] = await db
            .select()
            .from(shops)
            .where(eq(shops.id, shopId))
            .limit(1);

        if (!shop) {
            throw new Error("Shop not found");
        }

        // For store transfers, we need a source warehouse associated with the shop
        // Check if the shop has an associated warehouse
        const [sourceWarehouse] = await db
            .select()
            .from(warehouses)
            .where(and(eq(warehouses.shop_id, shopId), eq(warehouses.tenant_id, tenantId)))
            .limit(1);

        if (!sourceWarehouse) {
            throw new Error("Source warehouse not found for this shop. Please configure a warehouse for the shop.");
        }

        // Get shipping address from the first order's shipping details
        const [shippingDetail] = await db
            .select()
            .from(shipping_details)
            .where(eq(shipping_details.orderId, ordersToTransfer[0].id))
            .limit(1);

        // Get Sendcloud config
        const [sendcloudCfg] = await db
            .select()
            .from(sendcloud_config)
            .where(and(eq(sendcloud_config.tenant_id, tenantId), eq(sendcloud_config.is_active, true)))
            .limit(1);

        // Create transfer and shipment in a transaction
        return await db.transaction(async (tx) => {
            // 1. Create the transfer record
            const [transferResult] = await tx.insert(transfers).values({
                from_warehouse_id: sourceWarehouse.id,
                to_warehouse_id: toWarehouseId,
                status: false, // pending
                created_by: createdByUserId,
                tenant_id: tenantId,
            });

            const transferId = Number(transferResult.insertId);

            // 2. Create transfer items for each order
            const transferItemsData = ordersToTransfer.map((order) => ({
                transfer_id: transferId,
                sku: order.sku || order.imei || order.serialNumber || "UNKNOWN",
                device_id: null, // These are buyback items, not yet in devices table
                is_part: false,
                quantity: 1,
                tenant_id: tenantId,
            }));

            await tx.insert(transfer_items).values(transferItemsData);

            // 3. Generate Sendcloud label
            let sendcloudParcel = null;
            let trackingNumber = "";
            let trackingUrl = "";
            let labelUrl = "";

            if (sendcloudCfg) {
                try {
                    const client = createSendcloudClient(sendcloudCfg.public_key, sendcloudCfg.secret_key);

                    // Build parcel data - shipping FROM shop TO warehouse
                    const parcelData: SendcloudParcelInput = {
                        name: destWarehouse.name,
                        address: destWarehouse.description || "Warehouse Address", // Use description as address placeholder
                        house_number: "",
                        city: "City", // Would need warehouse address fields
                        country: "NL", // Default to Netherlands
                        postal_code: "1000AA", // Would need warehouse postal code
                        telephone: "",
                        email: "",
                        parcel_items: ordersToTransfer.map((order) => {
                            const snapshot = order.deviceSnapshot as any;
                            return {
                                description: snapshot?.modelName || "Mobile Phone",
                                hs_code: "851712",
                                quantity: 1,
                                value: String(100), // Default value
                                weight: "0.200",
                            };
                        }),
                        weight: String(0.2 * ordersToTransfer.length),
                        is_return: false,
                        shipment: sendcloudCfg.default_shipping_method_id
                            ? { id: sendcloudCfg.default_shipping_method_id }
                            : undefined,
                        sender_address: sendcloudCfg.default_sender_address_id || undefined,
                        request_label: true,
                        order_number: `TRF-${transferId}`,
                        external_reference: `store-transfer-${transferId}`,
                    };

                    sendcloudParcel = await client.createParcelWithLabel(parcelData);
                    trackingNumber = sendcloudParcel.tracking_number || "";
                    trackingUrl = sendcloudParcel.tracking_url || "";
                    labelUrl = sendcloudParcel.label?.normal_printer?.[0] || sendcloudParcel.label?.label_printer || "";
                } catch (error) {
                    console.error("[StoreTransferService] Sendcloud label generation failed:", error);
                    // Continue without label - will use mock
                    trackingNumber = `MOCK-${Date.now()}`;
                    labelUrl = "";
                }
            } else {
                // Mock tracking if no Sendcloud config
                trackingNumber = `MOCK-${Date.now()}`;
            }

            // 4. Update transfer with tracking info
            await tx
                .update(transfers)
                .set({
                    tracking_number: trackingNumber,
                    tracking_url: trackingUrl,
                })
                .where(eq(transfers.id, transferId));

            // 5. Create shipment record
            const shipmentNumber = `SHP-${transferId}-${Date.now()}`;
            const [shipmentResult] = await tx.insert(shipments).values({
                shipment_number: shipmentNumber,
                sendcloud_parcel_id: sendcloudParcel?.id || null,
                sendcloud_tracking_number: trackingNumber,
                sendcloud_tracking_url: trackingUrl,
                carrier_name: "UPS",
                shipping_method_id: sendcloudCfg?.default_shipping_method_id || null,
                from_warehouse_id: sourceWarehouse.id,
                to_warehouse_id: toWarehouseId,
                total_weight_kg: String(0.2 * ordersToTransfer.length),
                total_items: ordersToTransfer.length,
                label_url: labelUrl,
                label_generated_at: labelUrl ? new Date() : null,
                status: "label_generated",
                created_by: createdByUserId,
                tenant_id: tenantId,
            });

            const shipmentId = Number(shipmentResult.insertId);

            // 6. Create shipment items
            const shipmentItemsData = ordersToTransfer.map((order) => {
                const snapshot = order.deviceSnapshot as any;
                return {
                    shipment_id: shipmentId,
                    device_id: null,
                    sku: order.sku || null,
                    imei: order.imei || null,
                    serial_number: order.serialNumber || null,
                    model_name: snapshot?.modelName || null,
                    quantity: 1,
                    weight_kg: "0.200",
                    hs_code: "851712",
                    description: "Mobile Phone (Buyback)",
                    tenant_id: tenantId,
                };
            });

            await tx.insert(shipment_items).values(shipmentItemsData);

            return {
                transferId,
                shipmentId,
                shipmentNumber,
                trackingNumber,
                trackingUrl,
                labelUrl,
                itemCount: ordersToTransfer.length,
                fromWarehouse: sourceWarehouse.name,
                toWarehouse: destWarehouse.name,
                sendcloudParcelId: sendcloudParcel?.id || null,
            };
        });
    },

    /**
     * List store transfers
     */
    listStoreTransfers: async (params: ListTransfersParams) => {
        const { tenantId, createdByUserId, status, page, limit } = params;

        const conditions: any[] = [eq(transfers.tenant_id, tenantId)];

        if (createdByUserId) {
            conditions.push(eq(transfers.created_by, createdByUserId));
        }

        if (status === "pending") {
            conditions.push(eq(transfers.status, false));
        } else if (status === "completed") {
            conditions.push(eq(transfers.status, true));
        }

        const offset = (page - 1) * limit;

        // Get total count
        const [countResult] = await db
            .select({ total: count() })
            .from(transfers)
            .where(and(...conditions));

        // Get paginated results
        const transferList = await db
            .select({
                id: transfers.id,
                fromWarehouseId: transfers.from_warehouse_id,
                toWarehouseId: transfers.to_warehouse_id,
                trackingNumber: transfers.tracking_number,
                trackingUrl: transfers.tracking_url,
                status: transfers.status,
                createdAt: transfers.created_at,
                completedAt: transfers.completed_at,
            })
            .from(transfers)
            .where(and(...conditions))
            .orderBy(desc(transfers.created_at))
            .limit(limit)
            .offset(offset);

        // Get item counts for each transfer
        const transferIds = transferList.map((t) => t.id);
        const itemCounts =
            transferIds.length > 0
                ? await db
                    .select({
                        transferId: transfer_items.transfer_id,
                        itemCount: count(),
                    })
                    .from(transfer_items)
                    .where(inArray(transfer_items.transfer_id, transferIds))
                    .groupBy(transfer_items.transfer_id)
                : [];

        const itemCountMap = new Map(itemCounts.map((ic) => [ic.transferId, ic.itemCount]));

        // Get warehouse names
        const warehouseIds = [
            ...new Set([...transferList.map((t) => t.fromWarehouseId), ...transferList.map((t) => t.toWarehouseId)]),
        ];
        const warehouseList =
            warehouseIds.length > 0
                ? await db
                    .select({ id: warehouses.id, name: warehouses.name })
                    .from(warehouses)
                    .where(inArray(warehouses.id, warehouseIds))
                : [];

        const warehouseMap = new Map(warehouseList.map((w) => [w.id, w.name]));

        const result = transferList.map((t) => ({
            ...t,
            fromWarehouseName: warehouseMap.get(t.fromWarehouseId) || "Unknown",
            toWarehouseName: warehouseMap.get(t.toWarehouseId) || "Unknown",
            itemCount: itemCountMap.get(t.id) || 0,
            isCompleted: t.status === true,
        }));

        return {
            transfers: result,
            pagination: {
                page,
                limit,
                total: countResult?.total || 0,
                totalPages: Math.ceil((countResult?.total || 0) / limit),
            },
        };
    },

    /**
     * Get label PDF for a transfer
     */
    getTransferLabel: async (params: GetLabelParams): Promise<Buffer | null> => {
        const { transferId, format, tenantId } = params;

        // Find the shipment for this transfer
        const [shipment] = await db
            .select()
            .from(shipments)
            .where(
                and(
                    eq(shipments.to_warehouse_id, sql`(SELECT to_warehouse_id FROM transfers WHERE id = ${transferId})`),
                    eq(shipments.tenant_id, tenantId),
                    sql`${shipments.shipment_number} LIKE ${"SHP-" + transferId + "-%"}`
                )
            )
            .limit(1);

        if (!shipment || !shipment.sendcloud_parcel_id) {
            return null;
        }

        // Get Sendcloud config
        const [sendcloudCfg] = await db
            .select()
            .from(sendcloud_config)
            .where(and(eq(sendcloud_config.tenant_id, tenantId), eq(sendcloud_config.is_active, true)))
            .limit(1);

        if (!sendcloudCfg) {
            return null;
        }

        const client = createSendcloudClient(sendcloudCfg.public_key, sendcloudCfg.secret_key);
        return await client.getLabelPdf(shipment.sendcloud_parcel_id, format);
    },
};
