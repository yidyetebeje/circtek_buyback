import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "../lib/api/base";

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
    return useQuery<{ data: TransferCandidate[] }, Error>({
        queryKey: ["store-transfer-candidates", params],
        queryFn: async () => {
            return apiClient.get<{ data: TransferCandidate[] }>("/buyback/store-transfers/candidates", {
                params: params as unknown as Record<string, string | number>,
                isProtected: true,
            });
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
        { orderIds: string[]; toWarehouseId: number; originAddressId?: number; deliveryAddressId?: number }
    >({
        mutationFn: async (data) => {
            return apiClient.post<{ success: boolean; data: CreateTransferResult; message: string }>(
                "/buyback/store-transfers",
                data,
                { isProtected: true }
            );
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
    return useQuery<{
        data: {
            transfers: StoreTransfer[];
            pagination: { page: number; limit: number; total: number; totalPages: number };
        };
    }, Error>({
        queryKey: ["store-transfers", params],
        queryFn: async () => {
            return apiClient.get<{
                data: {
                    transfers: StoreTransfer[];
                    pagination: { page: number; limit: number; total: number; totalPages: number };
                };
            }>("/buyback/store-transfers", {
                params: params as unknown as Record<string, string | number>,
                isProtected: true,
            });
        },
    });
};

/**
 * Get label download URL (for display purposes only - use downloadTransferLabel for actual downloads)
 */
export const getTransferLabelUrl = (transferId: number, format: "a4" | "a6" = "a4") => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
    return `${API_BASE}/buyback/store-transfers/${transferId}/label?format=${format}`;
};

/**
 * Download transfer label with authentication
 * Fetches the PDF with auth headers and triggers a browser download
 */
export const downloadTransferLabel = async (
    transferId: number,
    format: "a4" | "a6" = "a4"
): Promise<void> => {
    const { getSession } = await import("next-auth/react");
    const session = await getSession();

    if (!session?.accessToken) {
        throw new Error("Not authenticated");
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
    const url = `${API_BASE}/buyback/store-transfers/${transferId}/label?format=${format}`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${session.accessToken}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to download label: ${response.status}`);
    }

    // Get the blob and trigger download
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `transfer-${transferId}-label.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
};

// ============ Transfer Details ============

export interface TransferItem {
    id: number;
    sku: string;
    imei: string | null;
    serialNumber: string | null;
    modelName: string | null;
    deviceId: number | null;
    isPart: boolean;
    quantity: number;
    status: boolean;
}

export interface TransferWarehouse {
    id: number;
    name: string;
    description: string | null;
}

export interface TransferShipment {
    id: number;
    shipmentNumber: string;
    carrierName: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    labelUrl: string | null;
    status: string;
    totalWeight: string | null;
    totalItems: number | null;
}

export interface StoreTransferDetails {
    id: number;
    trackingNumber: string | null;
    trackingUrl: string | null;
    status: boolean;
    isCompleted: boolean;
    createdAt: string;
    completedAt: string | null;
    createdBy: number;
    completedBy: number | null;
    fromWarehouse: TransferWarehouse;
    toWarehouse: TransferWarehouse;
    items: TransferItem[];
    itemCount: number;
    shipment: TransferShipment | null;
}

/**
 * Hook to fetch single transfer details
 */
export const useStoreTransferDetails = (transferId: number | null) => {
    return useQuery<{ data: StoreTransferDetails }, Error>({
        queryKey: ["store-transfer-details", transferId],
        queryFn: async () => {
            if (!transferId) throw new Error("Transfer ID required");
            return apiClient.get<{ data: StoreTransferDetails }>(
                `/buyback/store-transfers/${transferId}`,
                { isProtected: true }
            );
        },
        enabled: !!transferId,
    });
};

/**
 * Hook to update transfer status
 */
export const useUpdateTransferStatus = () => {
    const queryClient = useQueryClient();

    return useMutation<
        { success: boolean; data: { id: number; status: boolean; isCompleted: boolean }; message: string },
        Error,
        { transferId: number; status: "pending" | "completed" }
    >({
        mutationFn: async ({ transferId, status }) => {
            return apiClient.patch<{ success: boolean; data: any; message: string }>(
                `/buyback/store-transfers/${transferId}/status`,
                { status },
                { isProtected: true }
            );
        },
        onSuccess: (data, variables) => {
            toast.success(data.message || "Transfer status updated");
            queryClient.invalidateQueries({ queryKey: ["store-transfers"] });
            queryClient.invalidateQueries({ queryKey: ["store-transfer-details", variables.transferId] });
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update transfer status");
        },
    });
};
