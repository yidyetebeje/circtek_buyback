"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    useStoreTransferDetails,
    useUpdateTransferStatus,
    downloadTransferLabel,
} from "@/hooks/useStoreTransfer";
import {
    ArrowLeft,
    Download,
    ExternalLink,
    Loader2,
    Warehouse,
    Package,
    Truck,
    CheckCircle,
    Clock,
    ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function TransferDetailPage() {
    const params = useParams();
    const router = useRouter();
    const transferId = params?.transferId ? Number(params.transferId) : null;

    const { data: detailsResponse, isLoading, error } = useStoreTransferDetails(transferId);
    const updateStatus = useUpdateTransferStatus();

    const transfer = detailsResponse?.data;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <AdminHeader
                    title="Transfer Details"
                    breadcrumbs={[
                        { href: "/admin/dashboards", label: "Admin" },
                        { href: "/admin/store-transfer", label: "Store Transfer" },
                        { label: "Loading...", isCurrentPage: true },
                    ]}
                />
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-48" />
                    <Skeleton className="h-48" />
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (error || !transfer) {
        return (
            <div className="space-y-6">
                <AdminHeader
                    title="Transfer Not Found"
                    breadcrumbs={[
                        { href: "/admin/dashboards", label: "Admin" },
                        { href: "/admin/store-transfer", label: "Store Transfer" },
                        { label: "Not Found", isCurrentPage: true },
                    ]}
                />
                <Card>
                    <CardContent className="py-10 text-center">
                        <p className="text-muted-foreground mb-4">
                            {error?.message || "Transfer not found or you don't have access to it."}
                        </p>
                        <Button onClick={() => router.push("/admin/store-transfer")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Transfers
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleStatusChange = (newStatus: "pending" | "completed") => {
        if (transferId) {
            updateStatus.mutate({ transferId, status: newStatus });
        }
    };

    const handleDownloadLabel = async () => {
        if (!transferId) return;
        try {
            await downloadTransferLabel(transferId);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to download label");
        }
    };

    return (
        <div className="space-y-6">
            <AdminHeader
                title={`Transfer TRF-${transfer.id}`}
                breadcrumbs={[
                    { href: "/admin/dashboards", label: "Admin" },
                    { href: "/admin/store-transfer", label: "Store Transfer" },
                    { label: `TRF-${transfer.id}`, isCurrentPage: true },
                ]}
            />

            {/* Back button and Actions */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <Button variant="outline" onClick={() => router.push("/admin/store-transfer")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Transfers
                </Button>
                <div className="flex items-center gap-3">
                    {/* Status Dropdown */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Status:</span>
                        <Select
                            value={transfer.isCompleted ? "completed" : "pending"}
                            onValueChange={(value) => handleStatusChange(value as "pending" | "completed")}
                            disabled={updateStatus.isPending}
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue>
                                    <div className="flex items-center gap-2">
                                        {transfer.isCompleted ? (
                                            <>
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                <span>Completed</span>
                                            </>
                                        ) : (
                                            <>
                                                <Clock className="h-4 w-4 text-yellow-600" />
                                                <span>Pending</span>
                                            </>
                                        )}
                                    </div>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-yellow-600" />
                                        Pending
                                    </div>
                                </SelectItem>
                                <SelectItem value="completed">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        Completed
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleDownloadLabel}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Label
                    </Button>
                </div>
            </div>

            {/* Transfer Route */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* From Warehouse */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Warehouse className="h-5 w-5 text-blue-600" />
                            From: {transfer.fromWarehouse.name}
                        </CardTitle>
                        {transfer.fromWarehouse.description && (
                            <CardDescription>{transfer.fromWarehouse.description}</CardDescription>
                        )}
                    </CardHeader>
                </Card>

                {/* To Warehouse */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Warehouse className="h-5 w-5 text-green-600" />
                            To: {transfer.toWarehouse.name}
                        </CardTitle>
                        {transfer.toWarehouse.description && (
                            <CardDescription>{transfer.toWarehouse.description}</CardDescription>
                        )}
                    </CardHeader>
                </Card>
            </div>

            {/* Transfer Info & Tracking */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Transfer Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Transfer Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Created</span>
                            <span>{transfer.createdAt ? format(new Date(transfer.createdAt), "dd/MM/yyyy HH:mm") : "-"}</span>
                        </div>
                        {transfer.completedAt && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Completed</span>
                                <span>{format(new Date(transfer.completedAt), "dd/MM/yyyy HH:mm")}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Items</span>
                            <Badge variant="outline">{transfer.itemCount} devices</Badge>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <Badge variant={transfer.isCompleted ? "default" : "secondary"}>
                                {transfer.isCompleted ? "Completed" : "Pending"}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Tracking Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            Tracking Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Tracking Number</span>
                            {transfer.trackingUrl ? (
                                <a
                                    href={transfer.trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    {transfer.trackingNumber}
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            ) : (
                                <span>{transfer.trackingNumber || "-"}</span>
                            )}
                        </div>
                        {transfer.shipment && (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Shipment #</span>
                                    <span>{transfer.shipment.shipmentNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Carrier</span>
                                    <span>{transfer.shipment.carrierName || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Weight</span>
                                    <span>{transfer.shipment.totalWeight ? `${transfer.shipment.totalWeight} kg` : "-"}</span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Items Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Transfer Items</CardTitle>
                    <CardDescription>
                        {transfer.itemCount} item{transfer.itemCount !== 1 ? "s" : ""} in this transfer
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Model</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>IMEI</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfer.items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        No items found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transfer.items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono text-sm">#{item.id}</TableCell>
                                        <TableCell>{item.modelName || "-"}</TableCell>
                                        <TableCell className="font-mono">{item.sku || "-"}</TableCell>
                                        <TableCell className="font-mono text-sm">{item.imei || item.serialNumber || "-"}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.isPart ? "secondary" : "outline"}>
                                                {item.isPart ? "Part" : "Device"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.status ? "default" : "secondary"}>
                                                {item.status ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
