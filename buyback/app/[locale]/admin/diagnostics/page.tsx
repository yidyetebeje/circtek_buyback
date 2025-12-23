"use client";

import React, { useState, useCallback } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { DataTable } from '@/components/admin/catalog/data-table';
import { columns } from '@/components/admin/diagnostics/tested-devices-columns';
import { useTestedDevices } from '@/hooks/useDiagnostics';
import { PaginationState, ColumnFiltersState } from '@tanstack/react-table';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useSession } from 'next-auth/react';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function TestedDevicesPage() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { data: session } = useSession();
  const restrictedWarehouseId = (session?.user as { warehouseId?: number } | undefined)?.warehouseId ?? 0;
  const { data: warehouses } = useWarehouses();

  const filters = React.useMemo(() => {
    const serialFilter = columnFilters.find(f => f.id === 'serial');
    const warehouseFilter = columnFilters.find(f => f.id === 'warehouseName');
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      serial: serialFilter?.value as string | undefined,
      warehouseId: warehouseFilter?.value as number | undefined,
      sortBy: 'newest' as 'newest' | 'oldest',
    };
  }, [columnFilters, pagination]);

  const { data: devicesResponse, isLoading, error } = useTestedDevices(filters);

  const handlePaginationChange = useCallback((updater: React.SetStateAction<PaginationState>) => {
    const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
    setPagination(newPagination);
  }, [pagination]);

  const devices = devicesResponse?.data || [];
  const totalCount = devicesResponse?.pagination?.total || 0;

  const warehouseOptions = React.useMemo(() => {
    if (restrictedWarehouseId && restrictedWarehouseId !== 0) return [];
    if (warehouses?.data) {
      return warehouses.data.map(w => ({ label: w.name, value: w.id }));
    }
    return [];
  }, [warehouses, restrictedWarehouseId]);

  const dataTableFilterOptions = React.useMemo(() => {
    if (restrictedWarehouseId && restrictedWarehouseId !== 0) return [];
    return [{ key: 'warehouseName', label: 'Location', options: warehouseOptions }];
  }, [restrictedWarehouseId, warehouseOptions]);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <AdminHeader
            title="Tested Devices"
            breadcrumbs={[
              { href: '/admin/dashboards', label: 'Admin' },
              { href: '/admin/diagnostics', label: 'Diagnostics' },
              { label: 'Tested Devices', isCurrentPage: true }
            ]}
          />
        </div>
        <div className="text-center py-8">
          <p className="text-red-600">Error loading tested devices. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <AdminHeader
          title="Tested Devices"
          breadcrumbs={[
            { href: '/admin/dashboards', label: 'Admin' },
            { href: '/admin/diagnostics', label: 'Diagnostics' },
            { label: 'Tested Devices', isCurrentPage: true }
          ]}
        />
      </div>

      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore Generic component mismatch */}
      <DataTable
        columns={columns as any}
        data={devices as any}
        searchKey="serial"
        searchPlaceholder="Search by serial..."
        filterOptions={dataTableFilterOptions}
        manualPagination
        manualFiltering
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        rowCount={totalCount}
        isLoading={isLoading}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
      />
    </div>
  );
} 