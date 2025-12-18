"use client";

import { ColumnDef, Row, Column } from "@tanstack/react-table";
import { ArrowUpDown, Pencil } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Warehouse } from "@/hooks/useWarehouses";

// For now we support edit only; deletion can be added later
interface LocationActionsCellProps {
  row: Row<Warehouse>;
}

const LocationActionsCell: React.FC<LocationActionsCellProps> = ({ row }) => {
  const location = row.original;
  const id = location.id;
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8 p-0" asChild>
        <Link href={`/admin/locations/${id}`}>
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit Location</span>
        </Link>
      </Button>
    </div>
  );
};

export function useColumns(): ColumnDef<Warehouse>[] {
  const columns: ColumnDef<Warehouse>[] = [
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
      size: 48,
    },
    {
      accessorKey: "name",
      header: ({ column }: { column: Column<Warehouse, unknown> }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Location Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }: { row: Row<Warehouse> }) => <div>{row.getValue("name")}</div>,
    },
    {
      accessorKey: "status",
      header: "Active",
      cell: ({ row }) => (
        <div>{row.original.status ? "Yes" : "No"}</div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => <LocationActionsCell row={row} />,
    },
  ];

  return columns;
}

export const columns: ColumnDef<Warehouse>[] = []; 