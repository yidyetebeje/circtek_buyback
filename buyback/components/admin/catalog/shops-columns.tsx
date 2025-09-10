"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";

// Import the Shop type from the catalog types
import { Shop } from "@/types/catalog";

export const shopColumns: ColumnDef<Shop, unknown>[] = [
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
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <div className="w-[40px]">{row.getValue("id")}</div>,
  },
  {
    accessorKey: "logo",
    header: "Logo",
    cell: ({ row }) => {
      const logo = row.getValue("logo") as string | null;
      
      return (
        <div className="flex items-center justify-center h-10 w-10">
          {logo ? (
            <div className="relative h-10 w-10 rounded-md overflow-hidden border border-gray-200">
              <Image 
                src={logo}
                alt={`${row.original.name} logo`}
                fill
                style={{ objectFit: 'cover' }}
                className="rounded-md"
                sizes="40px"
                onError={(e) => {
                  // Replace broken image with fallback
                  (e.target as HTMLImageElement).style.display = 'none';
                  e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-gray-100');
                  const fallback = document.createElement('div');
                  fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><line x1="2" y1="2" x2="22" y2="22"></line><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"></path><line x1="13.5" y1="13.5" x2="6" y2="21"></line><line x1="18" y1="12" x2="21" y2="15"></line><path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"></path><path d="M21 15V5a2 2 0 0 0-2-2H9"></path></svg>';
                  e.currentTarget.parentElement?.appendChild(fallback);
                }}
              />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
              <ImageOff size={16} className="text-gray-400" />
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="pl-0 font-bold"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "organization",
    header: "Organization",
    cell: ({ row }) => (
      <div>{row.getValue("organization") || "—"}</div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <div>{row.getValue("phone") || "—"}</div>
    ),
  },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => {
      const activeValue = row.getValue("active");
      const isActive = activeValue === 1 || activeValue === true;
      
      return (
        <div>
          {isActive ? (
            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Active</Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Inactive</Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const timestamp = row.getValue("createdAt") as string;
      // Format date without external library
      const formattedDate = timestamp 
        ? new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : "—";
      
      return <div>{formattedDate}</div>;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const shop = row.original;

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
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/admin/shops/${shop.id}`} className="flex items-center cursor-pointer">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600 flex items-center cursor-pointer">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]; 