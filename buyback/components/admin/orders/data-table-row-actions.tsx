"use client"

import { Row } from "@tanstack/react-table"
import { Eye, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
}

interface OrderRowData {
    id: string;
}

export function DataTableRowActions<TData extends OrderRowData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const router = useRouter();
  const orderId = row.original.id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem onClick={() => router.push(`/admin/orders/${orderId}`)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 