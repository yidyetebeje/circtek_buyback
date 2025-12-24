"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Edit, MoreHorizontal, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmailTemplate } from "@/types/emailTemplates";

const EMAIL_TEMPLATE_TYPES = {
  ORDER_CONFIRMATION: "Order Confirmation",
  SHIPMENT_RECEIVED: "Shipment Received",
  OFFER_REJECTED: "Offer Rejected",
  ORDER_COMPLETED: "Order Completed",
  CUSTOM: "Custom"
};

// Helper to format date
const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid Date";
  }
};

// Component for status badge
const StatusBadge = ({ isActive }: { isActive: number }) => {
  return (
    <Badge variant={isActive ? "default" : "secondary"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
};

// Component for template type badge
const TypeBadge = ({ type }: { type: string }) => {
  const label = EMAIL_TEMPLATE_TYPES[type as keyof typeof EMAIL_TEMPLATE_TYPES] || type;

  return (
    <Badge variant="outline" className="whitespace-nowrap">
      {label}
    </Badge>
  );
};

// Action cell component
const ActionsCell = ({
  template,
  onEdit,
  onDelete
}: {
  template: EmailTemplate;
  onEdit: (template: EmailTemplate) => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(template)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(template.id)} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const emailTemplateColumns = ({
  onEdit,
  onDelete
}: {
  onEdit: (template: EmailTemplate) => void;
  onDelete: (id: string) => void;
}): ColumnDef<EmailTemplate>[] => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold -ml-4"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.getValue("subject")}>
          {row.getValue("subject")}
        </div>
      ),
    },
    {
      accessorKey: "templateType",
      header: "Type",
      cell: ({ row }) => (
        <TypeBadge type={row.getValue("templateType")} />
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge isActive={row.getValue("isActive")} />
      ),
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Last Updated
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.getValue("updatedAt")),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <ActionsCell
          template={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
    },
  ]; 