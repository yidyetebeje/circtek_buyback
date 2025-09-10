"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminEditCard } from '@/components/admin/AdminEditCard';
import { DataTable } from '@/components/admin/catalog/data-table';
import { useListOrders } from '@/hooks/useOrders';
import { columns } from '@/components/admin/orders/order-columns';
import { PaginationState, ColumnFiltersState } from '@tanstack/react-table';
import { AdminListOrdersResponseData, OrderListItem } from '@/lib/api/orderService';

const ORDER_STATUSES = [
  'PENDING',
  'ARRIVED',
  'PAID',
  'REJECTED',
];

export default function AdminOrdersPage() {
  const router = useRouter();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState<ColumnFiltersState>([]);

  // Debounce column filters to avoid too many API calls on search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedColumnFilters(columnFilters);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [columnFilters]);

  // Handle search functionality via API
  const handleColumnFiltersChange = (updater: React.SetStateAction<ColumnFiltersState>) => {
    setColumnFilters(updater);
    // Reset pagination when filters change
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const queryParams = useMemo(() => {
    const statusFilter = debouncedColumnFilters.find(f => f.id === 'status')?.value;
    const status = Array.isArray(statusFilter) ? statusFilter : statusFilter ? [statusFilter] : undefined;
    
    // Extract search from orderNumber column filter
    const searchFilter = debouncedColumnFilters.find(f => f.id === 'orderNumber')?.value;
    const search = typeof searchFilter === 'string' ? searchFilter.trim() : undefined;

    const envShopId = process.env.NEXT_SHOP_ID ? parseInt(process.env.NEXT_SHOP_ID, 10) : undefined;

    return {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      sortBy: "createdAt" as const,
      sortOrder: "desc" as const,
      status: status?.join(','),
      search: search || undefined, // Add search parameter from orderNumber filter
      shopId: envShopId,
    };
  }, [pagination, debouncedColumnFilters]);

  const { data, isLoading } = useListOrders(queryParams);

  const typedData = data as AdminListOrdersResponseData | undefined;
  const ordersList = typedData?.orders || [];
  const totalCount = typedData?.pagination?.totalCount || 0;

  const statusOptions = useMemo(() => ORDER_STATUSES.map(s => ({ label: s, value: s })), []);

  const handleRowClick = (row: OrderListItem) => {
    router.push(`/admin/orders/${row.id}`);
  };

  return (
    <AdminEditCard
      title="Orders Management"
      description="Manage and track all customer orders"
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { label: 'Orders', isCurrentPage: true }
      ]}
    >
      <div className="-mx-6 -mb-6 mt-2">
        <DataTable
          columns={columns}
          data={ordersList as OrderListItem[]}
          isLoading={isLoading}
          manualPagination
          manualFiltering
          rowCount={totalCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          columnFilters={columnFilters}
          onColumnFiltersChange={handleColumnFiltersChange}
          onRowClick={handleRowClick}
          searchKey="orderNumber"
          searchPlaceholder="Search order number..."
          filterOptions={[
            { key: 'status', label: 'Status', options: statusOptions },
          ]}
        />
      </div>
    </AdminEditCard>
  );
} 