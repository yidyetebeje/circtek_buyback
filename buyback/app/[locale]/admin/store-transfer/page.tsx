"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/admin/catalog/data-table";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    useTransferCandidates,
    useCreateStoreTransfer,
    useStoreTransfers,
    useUpdateTransferStatus,
    downloadTransferLabel,
    useHQConfig,
    TransferCandidate,
    StoreTransfer,
} from "@/hooks/useStoreTransfer";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Truck, Download, Loader2, ExternalLink, MapPin, Eye, CheckCircle, Clock, Warehouse } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useWarehouses } from "@/hooks/useWarehouses";


// Columns for candidate orders
const candidateColumns: ColumnDef<TransferCandidate>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "orderNumber",
        header: "Order #",
    },
    {
        id: "device",
        header: "Device",
        cell: ({ row }) => {
            const snapshot = row.original.deviceSnapshot;
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{snapshot?.modelName || "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">
                        {snapshot?.storage} {snapshot?.color}
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: "imei",
        header: "IMEI",
        cell: ({ row }) => row.original.imei || row.original.serialNumber || "-",
    },
    {
        accessorKey: "finalPrice",
        header: "Price",
        cell: ({ row }) => `€${row.original.finalPrice || row.original.estimatedPrice}`,
    },
    {
        accessorKey: "shopName",
        header: "Shop",
    },
    {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) =>
            row.original.createdAt
                ? format(new Date(row.original.createdAt), "dd/MM/yyyy")
                : "-",
    },
];

// Columns for existing transfers - will be generated dynamically in component
// to have access to router and mutation hooks

export default function StoreTransferPage() {
    const router = useRouter();
    const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
    const [daysFilter, setDaysFilter] = useState<number>(7);
    const [warehouseFilter, setWarehouseFilter] = useState<number | undefined>(undefined);

    // Get shop ID from environment variable (works for all users)
    const shopId = Number(process.env.NEXT_PUBLIC_SHOP_ID) || 0;

    // Fetch HQ configuration - determines if transfers go directly to HQ
    const { data: hqConfigResponse, isLoading: loadingHQConfig } = useHQConfig(shopId);
    const hqConfig = hqConfigResponse?.data;
    const isHQConfigured = hqConfig?.configured && hqConfig?.hq_warehouse_id;

    // Note: Sender address is validated on backend using source warehouse's shop_location
    // The backend will return an error if the source warehouse has no location configured

    // Fetch warehouses for filter dropdown
    const { data: warehousesResponse } = useWarehouses({});
    const warehouses = warehousesResponse?.data ?? [];

    // Fetch data
    const { data: candidatesResponse, isLoading: loadingCandidates } =
        useTransferCandidates({ days: daysFilter, warehouseId: warehouseFilter });
    const { data: transfersResponse, isLoading: loadingTransfers } =
        useStoreTransfers({ page: 1, limit: 20 });

    const createTransfer = useCreateStoreTransfer();
    const updateStatus = useUpdateTransferStatus();

    const candidates = candidatesResponse?.data ?? [];
    const transfers = transfersResponse?.data?.transfers ?? [];

    // Dynamic columns for transfers - needs access to router and mutation hook
    const transferColumns: ColumnDef<StoreTransfer>[] = useMemo(() => [
        {
            accessorKey: "id",
            header: "Transfer ID",
            cell: ({ row }) => `TRF-${row.original.id}`,
        },
        {
            accessorKey: "fromWarehouseName",
            header: "From",
        },
        {
            accessorKey: "toWarehouseName",
            header: "To",
        },
        {
            accessorKey: "itemCount",
            header: "Items",
            cell: ({ row }) => (
                <Badge variant="outline">{row.original.itemCount} devices</Badge>
            ),
        },
        {
            accessorKey: "trackingNumber",
            header: "Tracking",
            cell: ({ row }) =>
                row.original.trackingUrl ? (
                    <a
                        href={row.original.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                        {row.original.trackingNumber}
                        <ExternalLink className="h-3 w-3" />
                    </a>
                ) : (
                    row.original.trackingNumber || "-"
                ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
                <Select
                    value={row.original.isCompleted ? "completed" : "pending"}
                    onValueChange={(value) => {
                        updateStatus.mutate({
                            transferId: row.original.id,
                            status: value as "pending" | "completed",
                        });
                    }}
                    disabled={updateStatus.isPending}
                >
                    <SelectTrigger className="w-[130px]">
                        <SelectValue>
                            <div className="flex items-center gap-2">
                                {row.original.isCompleted ? (
                                    <>
                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                        <span>Completed</span>
                                    </>
                                ) : (
                                    <>
                                        <Clock className="h-3 w-3 text-yellow-600" />
                                        <span>Pending</span>
                                    </>
                                )}
                            </div>
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-yellow-600" />
                                Pending
                            </div>
                        </SelectItem>
                        <SelectItem value="completed">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                Completed
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>
            ),
        },
        {
            accessorKey: "createdAt",
            header: "Created",
            cell: ({ row }) =>
                row.original.createdAt
                    ? format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm")
                    : "-",
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/store-transfer/${row.original.id}`)}
                    >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                            try {
                                await downloadTransferLabel(row.original.id);
                            } catch (error) {
                                toast.error(error instanceof Error ? error.message : "Failed to download label");
                            }
                        }}
                    >
                        <Download className="h-4 w-4 mr-1" />
                        Label
                    </Button>
                </div>
            ),
        },
    ], [router, updateStatus]);

    // Selected order IDs
    const selectedOrderIds = useMemo(() => {
        return Object.entries(selectedRows)
            .filter(([_, isSelected]) => isSelected)
            .map(([id]) => id);
    }, [selectedRows]);

    const handleCreateTransfer = async () => {
        if (selectedOrderIds.length === 0) {
            toast.error("Please select at least one order to transfer");
            return;
        }

        // When HQ is not configured, show a clear error message
        if (!isHQConfigured) {
            toast.error("HQ warehouse is not configured. Please contact your administrator to configure the HQ warehouse in Sendcloud settings.");
            return;
        }

        // Note: Source warehouse location validation happens on backend

        try {
            // With HQ configured, we don't need to pass destination - backend will use HQ defaults
            const result = await createTransfer.mutateAsync({
                orderIds: selectedOrderIds,
                // toWarehouseId and deliveryAddressId will be auto-populated from HQ config on the backend
            });

            // Clear selection after successful transfer
            setSelectedRows({});

            // Download label with authentication
            if (result.data.labelUrl) {
                // If external URL (e.g., from Sendcloud), open directly
                window.open(result.data.labelUrl, "_blank");
            } else {
                // Download from our API with auth
                try {
                    await downloadTransferLabel(result.data.transferId);
                } catch (error) {
                    toast.error("Transfer created but failed to download label. You can download it from the history tab.");
                }
            }
        } catch (err) {
            // Error handled by mutation
        }
    };

    return (
        <div className="space-y-6">


            <Tabs defaultValue="create" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="create" className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Create Transfer
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Transfer History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="create" className="space-y-4">
                    {/* Transfer Controls */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Transfer Settings</CardTitle>
                            <CardDescription>
                                Select devices to transfer and choose the destination warehouse
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium">Show orders from last</label>
                                    <Select
                                        value={String(daysFilter)}
                                        onValueChange={(val) => setDaysFilter(Number(val))}
                                    >
                                        <SelectTrigger className="w-[150px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="7">7 days</SelectItem>
                                            <SelectItem value="14">14 days</SelectItem>
                                            <SelectItem value="30">30 days</SelectItem>
                                            <SelectItem value="60">60 days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Warehouse Filter */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium">Filter by Warehouse</label>
                                    <Select
                                        value={warehouseFilter ? String(warehouseFilter) : "all"}
                                        onValueChange={(val) => setWarehouseFilter(val === "all" ? undefined : Number(val))}
                                    >
                                        <SelectTrigger className="w-[200px]">
                                            <div className="flex items-center gap-2">
                                                <Warehouse className="h-4 w-4" />
                                                <SelectValue placeholder="All Warehouses" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Warehouses</SelectItem>
                                            {warehouses.map((wh) => (
                                                <SelectItem key={wh.id} value={String(wh.id)}>
                                                    {wh.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* HQ Destination Info */}
                                {loadingHQConfig ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading HQ configuration...
                                    </div>
                                ) : isHQConfigured ? (
                                    <div className="flex flex-col gap-2 px-4 py-3 bg-muted/50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-primary" />
                                            <span className="text-sm font-medium">Destination:</span>
                                            <span className="text-sm">{hqConfig?.hq_warehouse_name || "HQ Warehouse"}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Transfers will be automatically sent to the configured HQ warehouse.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2 px-4 py-3 bg-destructive/10 rounded-lg border border-destructive/20">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-destructive" />
                                            <span className="text-sm font-medium text-destructive">HQ Not Configured</span>
                                        </div>
                                        <p className="text-xs text-destructive/80">
                                            Please contact your administrator to configure the HQ warehouse in Sendcloud settings.
                                        </p>
                                    </div>
                                )}

                                {/* Note: Source warehouse location is validated on backend */}

                                <Button
                                    onClick={handleCreateTransfer}
                                    disabled={
                                        selectedOrderIds.length === 0 ||
                                        !isHQConfigured ||
                                        createTransfer.isPending
                                    }
                                >
                                    {createTransfer.isPending && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    <Truck className="mr-2 h-4 w-4" />
                                    Send to HQ
                                    {selectedOrderIds.length > 0 && ` (${selectedOrderIds.length})`}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Candidates Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Eligible Orders</CardTitle>
                            <CardDescription>
                                PAID buyback orders from the last {daysFilter} days. Select
                                orders to include in the transfer.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={candidateColumns}
                                data={candidates}
                                searchKey="orderNumber"
                                isLoading={loadingCandidates}
                                enableRowSelection
                                onRowSelectionChange={(selection) => {
                                    // Map row indices to order IDs
                                    const newSelection: Record<string, boolean> = {};
                                    Object.entries(selection).forEach(([idx, selected]) => {
                                        const order = candidates[Number(idx)];
                                        if (order) {
                                            newSelection[order.id] = selected;
                                        }
                                    });
                                    setSelectedRows(newSelection);
                                }}
                            />
                            <div className="text-sm text-muted-foreground mt-2">
                                Total eligible orders: {candidates.length}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transfer History</CardTitle>
                            <CardDescription>
                                View all store-to-warehouse transfers and download labels
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={transferColumns}
                                data={transfers}
                                searchKey="id"
                                isLoading={loadingTransfers}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
