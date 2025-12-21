import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();
  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4">
      {/* Previous/Next Buttons - Left side */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className={`rounded-xl font-medium transition-all duration-200 ${canPrev
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'text-muted-foreground'
            }`}
          onClick={() => table.previousPage()}
          disabled={!canPrev}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={`rounded-xl font-medium transition-all duration-200 ${canNext
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'text-muted-foreground'
            }`}
          onClick={() => table.nextPage()}
          disabled={!canNext}
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Page info and rows per page - Right side */}
      <div className="flex items-center gap-4">
        {/* Page info */}
        <div className="flex items-center text-sm bg-muted/30 px-3 py-1.5 rounded-lg">
          <span className="text-foreground/80">
            Page <span className="font-semibold text-primary">{currentPage}</span> of{" "}
            <span className="font-semibold">{totalPages}</span>
          </span>
        </div>

        {/* Rows per page */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground/80 whitespace-nowrap">Rows per page</span>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-[80px] rounded-lg">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
} 