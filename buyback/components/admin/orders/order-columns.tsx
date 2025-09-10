"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import { OrderListItem } from "@/lib/api/orderService";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "../ui/data-table-column-header";
import { format } from 'date-fns';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Eye, Edit, CheckCircle2, Timer, XCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const ActionCell = ({ row }: { row: Row<OrderListItem> }) => {
  const router = useRouter();
  const orderId = row.original.id;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 p-0"
      onClick={() => router.push(`/admin/orders/${orderId}`)}
      title="View Details"
    >
      <Eye className="h-4 w-4" />
      <span className="sr-only">View Details</span>
    </Button>
  );
};

// Enhanced Status Badge with visual indicators
const OrderStatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return {
          variant: "outline" as const,
          icon: Timer,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
          canChange: true
        };
      case "ARRIVED":
        return {
          variant: "secondary" as const,
          icon: CheckCircle2,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          canChange: true
        };
      case "PAID":
        return {
          variant: "default" as const,
          icon: CheckCircle2,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          canChange: false
        };
      case "REJECTED":
        return {
          variant: "destructive" as const,
          icon: XCircle,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          canChange: false
        };
      default:
        return {
          variant: "outline" as const,
          icon: AlertCircle,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          canChange: true
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const statusText = status?.replace(/_/g, " ").toLowerCase() || "Unknown";

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={config.variant}
        className={`px-2.5 py-1 flex items-center gap-1.5 ${config.bgColor} ${config.borderColor} ${config.color} capitalize font-medium`}
      >
        <Icon className="h-3 w-3" />
        {statusText}
      </Badge>
      {config.canChange && (
        <div className="flex items-center">
          <Edit className="h-3 w-3 text-muted-foreground opacity-60" />
          <span className="sr-only">Status can be changed</span>
        </div>
      )}
    </div>
  );
};

export const columns: ColumnDef<OrderListItem>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order Number" />
    ),
    cell: ({ row }) => (
      <div className="font-medium text-primary">
        #{row.getValue("orderNumber")}
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorFn: (row) => row.deviceSnapshot?.modelName,
    id: "modelName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Device Model" />
    ),
    cell: ({ row }) => {
      const modelName = row.original.deviceSnapshot?.modelName;
      const brandName = row.original.deviceSnapshot?.brandName;
      
      return (
        <div>
          <div className="font-medium">{modelName || "N/A"}</div>
          {typeof brandName === "string" && brandName.trim() !== "" && (
            <div className="text-sm text-muted-foreground">{brandName}</div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status: string = row.getValue("status");
      return <OrderStatusBadge status={status} />;
    },
  },
  {
    accessorFn: (row) => row.shop?.name,
    id: "shopName",
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Shop" />
    ),
    cell: ({ row }) => {
      const shopName = row.original.shop?.name;
      return (
        <div className="font-medium">
          {shopName || "N/A"}
        </div>
      );
    },
  },
  {
    accessorKey: "estimatedPrice",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estimated Price" />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("estimatedPrice"));
      if (isNaN(amount)) return <div className="font-medium text-muted-foreground">N/A</div>;
      
      const formatted = new Intl.NumberFormat("en-NL", {
        style: "currency",
        currency: "EUR",
      }).format(amount);

      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "finalPrice",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Final Price" />
    ),
    cell: ({ row }) => {
      const finalPrice = row.getValue("finalPrice") as string | null;
      if (!finalPrice) return <div className="font-medium text-muted-foreground">-</div>;

      const amount = parseFloat(finalPrice);
      if (isNaN(amount)) return <div className="font-medium text-muted-foreground">-</div>;
      
      const formatted = new Intl.NumberFormat("en-NL", {
        style: "currency",
        currency: "EUR",
      }).format(amount);

      return <div className="font-medium text-green-700">{formatted}</div>;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return (
        <div className="text-sm">
          <div className="font-medium">{format(date, 'dd MMM yyyy')}</div>
          <div className="text-muted-foreground">{format(date, 'HH:mm')}</div>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ActionCell,
  },
]; 