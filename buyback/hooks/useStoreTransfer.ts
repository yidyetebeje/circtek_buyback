import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export interface TransferCandidate {
    id: string;
    orderNumber: string;
    deviceSnapshot: {
        modelName?: string;
        storage?: string;
        color?: string;
        [key: string]: any;
    };
    estimatedPrice: string;
    finalPrice: string | null;
    imei: string | null;
    sku: string | null;
    serialNumber: string | null;
    createdAt: string;
    shopId: number;
    shopName: string | null;
}

export interface StoreTransfer {
    id: number;
    fromWarehouseId: number;
    fromWarehouseName: string;
    toWarehouseId: number;
    toWarehouseName: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
    status: boolean;
    isCompleted: boolean;
    createdAt: string;
    completedAt: string | null;
    itemCount: number;
}

export interface CreateTransferResult {
    transferId: number;
    shipmentId: number;
    shipmentNumber: string;
    trackingNumber: string;
    trackingUrl: string;
    labelUrl: string;
    itemCount: number;
    fromWarehouse: string;
    toWarehouse: string;
    sendcloudParcelId: number | null;
}

interface CandidatesParams {
    days?: number;
    shopId?: number;
}

interface ListTransfersParams {
    status?: "pending" | "completed";
    page?: number;
    limit?: number;
}

/**
 * Hook to fetch transfer candidates (PAID buyback orders)
 */
export const useTransferCandidates = (params: CandidatesParams = {}) => {
    const queryParams = new URLSearchParams();
    if (params.days) queryParams.set("days", String(params.days));
    if (params.shopId) queryParams.set("shopId", String(params.shopId));

    return useQuery<{ data: TransferCandidate[] }, Error>({
        queryKey: ["store-transfer-candidates", params],
        queryFn: async () => {
            const res = await fetch(
                `${API_BASE}/buyback/store-transfers/candidates?${queryParams.toString()}`,
                { credentials: "include" }
            );
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || "Failed to fetch candidates");
            }
            return res.json();
        },
    });
};

/**
 * Hook to create a store-to-warehouse transfer
 */
export const useCreateStoreTransfer = () => {
    const queryClient = useQueryClient();

    return useMutation<
        { success: boolean; data: CreateTransferResult; message: string },
        Error,
        { orderIds: string[]; toWarehouseId: number }
    >({
        mutationFn: async (data) => {
            const res = await fetch(`${API_BASE}/buyback/store-transfers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || "Failed to create transfer");
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast.success(data.message || "Transfer created successfully");
            queryClient.invalidateQueries({ queryKey: ["store-transfer-candidates"] });
            queryClient.invalidateQueries({ queryKey: ["store-transfers"] });
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create transfer");
        },
    });
};

/**
 * Hook to list store transfers
 */
export const useStoreTransfers = (params: ListTransfersParams = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.set("status", params.status);
    if (params.page) queryParams.set("page", String(params.page));
    if (params.limit) queryParams.set("limit", String(params.limit));

    return useQuery<{
        data: {
            transfers: StoreTransfer[];
            pagination: { page: number; limit: number; total: number; totalPages: number };
        };
    }, Error>({
        queryKey: ["store-transfers", params],
        queryFn: async () => {
            const res = await fetch(
                `${API_BASE}/buyback/store-transfers?${queryParams.toString()}`,
                { credentials: "include" }
            );
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || "Failed to fetch transfers");
            }
            return res.json();
        },
    });
};

/**
 * Get label download URL
 */
export const getTransferLabelUrl = (transferId: number, format: "a4" | "a6" = "a4") => {
    return `${API_BASE}/buyback/store-transfers/${transferId}/label?format=${format}`;
};
