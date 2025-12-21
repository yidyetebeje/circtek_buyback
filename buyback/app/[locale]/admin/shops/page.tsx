"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, MapPin } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/catalog/data-table";
import { shopColumns } from "@/components/admin/catalog/shops-columns";
import { Shop } from "@/types/catalog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Row, ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { useShops } from "@/hooks/catalog/useShops";
import { QueryParams } from "@/lib/api/types";
import React from "react";

import { useQueryClient } from "@tanstack/react-query";

export default function ShopsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // State for remote filtering and pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Extract filters and build query parameters for remote filtering
  const queryParams = React.useMemo((): QueryParams => {
    const params: QueryParams = {
      page,
      limit,
    };

    columnFilters.forEach((filter) => {
      const { id, value } = filter;

      const firstValue = Array.isArray(value) ? value[0] : value;



      if (id === 'name' && typeof firstValue === 'string' && firstValue.trim()) {
        params.search = firstValue.trim();
      }
    });

    return params;
  }, [page, limit, columnFilters]);

  // Get shops from API with remote filtering
  const { data: shopsResponse, isLoading, error } = useShops(queryParams);


  // Extract shops array and pagination info from response
  const shops = shopsResponse?.data || [];
  const totalCount = shopsResponse?.meta?.total || 0;

  // Redirect shop_manager to their managed shop page
  useEffect(() => {
    if (session?.user?.roleSlug === 'shop_manager' && session?.user?.managed_shop_id) {
      router.push(`/admin/shops/${session.user.managed_shop_id}`);
    }
  }, [session, router]);

  const handleCreateNew = () => {
    router.push('/admin/shops/new');
  };



  // Handle pagination changes and trigger remote data fetch
  const handlePaginationChange = (updater: ((old: { pageIndex: number; pageSize: number }) => { pageIndex: number; pageSize: number }) | { pageIndex: number; pageSize: number }) => {
    const newPagination = typeof updater === 'function'
      ? updater({ pageIndex: page - 1, pageSize: limit })
      : updater;
    setPage(newPagination.pageIndex + 1);
  };

  // Handle filter changes and trigger remote data fetch
  const handleColumnFiltersChange = (updater: ((old: ColumnFiltersState) => ColumnFiltersState) | ColumnFiltersState) => {
    const newFilters = typeof updater === 'function'
      ? updater(columnFilters)
      : updater;
    setColumnFilters(newFilters);
    // Reset to first page when filters change
    setPage(1);
  };

  // Create a custom columns definition that includes the delete action
  const columnsWithDeleteAction: ColumnDef<Shop, unknown>[] = [
    ...shopColumns.slice(0, -1), // Keep all columns except the last one (actions)
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }: { row: Row<Shop> }) => {
        const shop = row.original;


        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/admin/shops/${shop.id}`)}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Edit</span>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/en/admin/shops/${shop.id}/locations`)}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Manage Locations</span>
              <MapPin className="h-4 w-4" />
            </Button>

          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <AdminHeader title="Shops" breadcrumbs={[{ label: 'Admin', isCurrentPage: true }, { label: 'Shops' }]} />
        <Button
          onClick={handleCreateNew}
          className="flex items-center gap-2 whitespace-nowrap self-start sm:self-auto hover:bg-primary/80 transform hover:scale-105 transition-transform cursor-pointer"
        >
          <Plus size={18} />
          <span className="hidden md:inline">Create New Shop</span>
          <span className="hidden sm:inline md:hidden">New Shop</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      <Separator className="mb-8" />

      {error ? (
        <div className="bg-red-50 p-4 rounded-md mb-8">
          <h3 className="text-red-800 font-medium">Error loading shops</h3>
          <p className="text-red-700">{error.message}</p>
        </div>
      ) : (
        <DataTable
          columns={columnsWithDeleteAction}
          data={shops.filter(shop => shop.id !== undefined) as Array<Shop & { id: number }>}
          searchKey="name"

          manualPagination={true}
          manualFiltering={true}
          rowCount={totalCount}
          pagination={{
            pageIndex: page - 1,
            pageSize: limit,
          }}
          onPaginationChange={handlePaginationChange}
          columnFilters={columnFilters}
          onColumnFiltersChange={handleColumnFiltersChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
} 