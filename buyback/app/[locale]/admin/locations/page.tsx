"use client";

import React from "react";

import { DataTable } from "@/components/admin/catalog/data-table";
import { useColumns } from "@/components/admin/locations/locations-columns";
import { useWarehouses } from "@/hooks/useWarehouses";
import { PaginationState } from "@tanstack/react-table";

export default function LocationsPage() {
  const columns = useColumns();
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const {
    data: locationsData,
    isLoading,
    isError,
    error,
  } = useWarehouses({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  });

  const locations = locationsData?.data || [];
  const totalLocations = locationsData?.total || 0;

  if (isError) {
    return (
      <div className="w-full py-10 text-red-500 flex justify-center">
        Error loading locations: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={locations}
        searchKey="name"
        isLoading={isLoading}
        manualPagination
        rowCount={totalLocations}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
} 