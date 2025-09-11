"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  PaginationState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "../ui/data-table-pagination";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { DataTableToolbar } from "../ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { PublishToShopsModal } from "./publish-to-shops-modal";

type EntityType = 'brand' | 'category' | 'model-series' | 'model' | 'device-question' | 'faq';

interface PublishedShop {
  shop_id: number;
}

export interface DataTableProps<TData extends { id?: number | string; publishedInShops?: PublishedShop[] }, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  className?: string;
  searchKey?: string;
  searchPlaceholder?: string;
  entityType?: EntityType;
  filterOptions?: {
    key: string;
    label: string;
    multiple?: boolean;
    options: { label: string; value: string | number | boolean }[];
  }[];
  children?: React.ReactNode;
  isLoading?: boolean;
  manualPagination?: boolean;
  manualFiltering?: boolean;
  rowCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: (updater: React.SetStateAction<PaginationState>) => void;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: React.Dispatch<
    React.SetStateAction<ColumnFiltersState>
  >;
  onRowClick?: (row: TData) => void;
  initialColumnVisibility?: VisibilityState;
}

export function DataTable<TData extends { id?: number | string; publishedInShops?: PublishedShop[] }, TValue>({
  columns,
  data,
  className,
  children,
  isLoading,
  manualPagination,
  manualFiltering,
  rowCount,
  pagination,
  onPaginationChange,
  columnFilters: passedColumnFilters,
  onColumnFiltersChange: passedOnColumnFiltersChange,
  searchKey,
  searchPlaceholder,
  filterOptions,
  entityType,
  onRowClick,
  initialColumnVisibility = {},
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialColumnVisibility);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [internalPagination, setInternalPagination] =
    React.useState<PaginationState>({
      pageIndex: 0,
      pageSize: 10,
    });
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false);

  const columnFilters = passedColumnFilters ?? internalColumnFilters;
  const onColumnFiltersChange =
    passedOnColumnFiltersChange ?? setInternalColumnFilters;

  const finalPagination = pagination ?? internalPagination;
  const onFinalPaginationChange = onPaginationChange ?? setInternalPagination;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination: finalPagination,
    },
    manualPagination: manualPagination,
    manualFiltering: manualFiltering,
    rowCount: rowCount,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: onFinalPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedEntityIds = selectedRows
    .map((row) => row.original.id)
    .filter((id): id is number => typeof id === "number");

  const allPublishedInShops = selectedRows.flatMap(row => row.original.publishedInShops || []);
  const uniquePublishedShopIds = [...new Set(allPublishedInShops.map(s => s.shop_id))];
  const aggregatedPublishedInShops = uniquePublishedShopIds.map(shop_id => ({ shop_id }));

  const bulkAction = entityType && (
    <Button
      variant="outline"
      size="sm"
      className="h-8"
      onClick={() => setIsPublishModalOpen(true)}
    >
      Publish / Unpublish ({selectedRows.length})
    </Button>
  );

  return (
    <div className={cn("space-y-4 bg-white p-4 rounded-md", className)}>
      {children ? (
        children
      ) : (
        <DataTableToolbar
          table={table}
          searchKey={searchKey}
          searchPlaceholder={searchPlaceholder}
          filterOptions={filterOptions}
          bulkAction={bulkAction}
        />
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className="border-r last:border-r-0"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="border-r last:border-r-0"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
      {isPublishModalOpen && entityType && (
        <PublishToShopsModal
          open={isPublishModalOpen}
          onClose={() => setIsPublishModalOpen(false)}
          entityIds={selectedEntityIds}
          entityType={entityType}
          entityName={`${selectedEntityIds.length} ${entityType}(s)`}
          publishedInShops={aggregatedPublishedInShops}
          onSuccess={() => {
            setIsPublishModalOpen(false);
            table.resetRowSelection();
          }}
        />
      )}
    </div>
  );
}
