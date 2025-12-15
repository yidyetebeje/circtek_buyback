"use client";

import React from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
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
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <AdminHeader
          title="Locations"
          breadcrumbs={[
            { href: "/admin/dashboards", label: "Admin" },
            { label: "Locations", isCurrentPage: true },
          ]}
        />
        <Button asChild>
          <Link href="/admin/locations/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Location
          </Link>
        </Button>
      </div>

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