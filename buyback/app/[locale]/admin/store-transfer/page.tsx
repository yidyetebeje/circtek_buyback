"use client";

import React, { useState, useMemo } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
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
import { useWarehouses } from "@/hooks/useWarehouses";
import {
    useTransferCandidates,
    useCreateStoreTransfer,
    useStoreTransfers,
    getTransferLabelUrl,
    TransferCandidate,
    StoreTransfer,
} from "@/hooks/useStoreTransfer";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Truck, Download, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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

// Columns for existing transfers
const transferColumns: ColumnDef<StoreTransfer>[] = [
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
            <Badge variant={row.original.isCompleted ? "default" : "secondary"}>
                {row.original.isCompleted ? "Completed" : "Pending"}
            </Badge>
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
            <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(getTransferLabelUrl(row.original.id), "_blank")}
            >
                <Download className="h-4 w-4 mr-1" />
                Label
            </Button>
        ),
    },
];

export default function StoreTransferPage() {
    const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
    const [daysFilter, setDaysFilter] = useState<number>(7);

    // Fetch data
    const { data: candidatesResponse, isLoading: loadingCandidates } =
        useTransferCandidates({ days: daysFilter });
    const { data: warehousesResponse } = useWarehouses();
    const { data: transfersResponse, isLoading: loadingTransfers } =
        useStoreTransfers({ page: 1, limit: 20 });

    const createTransfer = useCreateStoreTransfer();

    const candidates = candidatesResponse?.data ?? [];
    const warehouses = warehousesResponse?.data ?? [];
    const transfers = transfersResponse?.data?.transfers ?? [];

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
        if (!selectedWarehouseId) {
            toast.error("Please select a destination warehouse");
            return;
        }

        try {
            const result = await createTransfer.mutateAsync({
                orderIds: selectedOrderIds,
                toWarehouseId: Number(selectedWarehouseId),
            });

            // Clear selection after successful transfer
            setSelectedRows({});
            setSelectedWarehouseId("");

            // Open label in new tab
            if (result.data.labelUrl) {
                window.open(result.data.labelUrl, "_blank");
            } else {
                // Download label from API
                window.open(getTransferLabelUrl(result.data.transferId), "_blank");
            }
        } catch (err) {
            // Error handled by mutation
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <AdminHeader
                title="Store to Warehouse Transfer"
                breadcrumbs={[
                    { href: "/admin/dashboards", label: "Admin" },
                    { label: "Store Transfer", isCurrentPage: true },
                ]}
            />

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

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium">Destination Warehouse</label>
                                    <Select
                                        value={selectedWarehouseId}
                                        onValueChange={setSelectedWarehouseId}
                                    >
                                        <SelectTrigger className="w-[250px]">
                                            <SelectValue placeholder="Select warehouse..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map((wh) => (
                                                <SelectItem key={wh.id} value={String(wh.id)}>
                                                    {wh.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    onClick={handleCreateTransfer}
                                    disabled={
                                        selectedOrderIds.length === 0 ||
                                        !selectedWarehouseId ||
                                        createTransfer.isPending
                                    }
                                >
                                    {createTransfer.isPending && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    <Truck className="mr-2 h-4 w-4" />
                                    Create Transfer & Generate Label
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
