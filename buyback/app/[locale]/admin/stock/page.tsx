"use client";

import React, { useState } from 'react';

import { DataTable } from '@/components/admin/catalog/data-table';
import { ColumnFiltersState, PaginationState } from '@tanstack/react-table';
import { stockColumns } from '@/components/admin/stock/stock-columns';
import { useStock } from '@/hooks/useStock';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useStockFilters } from '@/hooks/useStockFilters';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDebounce } from 'use-debounce';
import { useSession } from 'next-auth/react';

export default function StockPage() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const debouncedFilters = useDebounce(columnFilters, 500)[0];

  // Build API params using debounced filters to debounce API calls
  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: debouncedFilters.find((f) => f.id === 'imei')?.value as string | undefined,
    warehouseId: undefined as number | undefined,
    isDead: undefined as boolean | undefined,
    modelName: undefined as string | undefined,
    storage: undefined as string | undefined,
    colorName: undefined as string | undefined,
    sku: undefined as string | undefined,
  };

  const { data: session } = useSession();
  const restrictedWarehouseId = (session?.user as { warehouseId?: number } | undefined)?.warehouseId ?? 0;
  const { data: warehouses } = useWarehouses();

  const warehouseFilter = debouncedFilters.find((f) => f.id === 'warehouseName');
  if (warehouseFilter && typeof warehouseFilter.value === 'number') {
    queryParams.warehouseId = warehouseFilter.value as number;
  }

  const statusFilter = debouncedFilters.find((f) => f.id === 'status');
  if (statusFilter && typeof statusFilter.value === 'string') {
    queryParams.isDead = statusFilter.value === 'dead';
  }

  const modelFilter = debouncedFilters.find((f) => f.id === 'modelName');
  if (modelFilter && typeof modelFilter.value === 'string') {
    queryParams.modelName = modelFilter.value as string;
  }

  const storageFilter = debouncedFilters.find((f) => f.id === 'storage');
  if (storageFilter && typeof storageFilter.value === 'string') {
    queryParams.storage = storageFilter.value as string;
  }

  const colorFilter = debouncedFilters.find((f) => f.id === 'colorName');
  if (colorFilter && typeof colorFilter.value === 'string') {
    queryParams.colorName = colorFilter.value as string;
  }

  const skuFilter = debouncedFilters.find((f) => f.id === 'sku');
  if (skuFilter && typeof skuFilter.value === 'string') {
    queryParams.sku = skuFilter.value as string;
  }

  const { data: stockResponse, isLoading } = useStock(queryParams);
  const stockData = stockResponse?.data ?? [];
  const totalCount = stockResponse?.meta?.total ?? 0;

  // Separate API call for filter options (non-paginated) taking into account selected warehouse/status filters
  const { data: filterResponse } = useStockFilters({ warehouseId: queryParams.warehouseId, isDead: queryParams.isDead });

  const modelOptions = (filterResponse?.modelNames ?? []).map((m) => ({ label: m, value: m }));
  const storageOptions = (filterResponse?.storage ?? []).map((s) => ({ label: s, value: s }));
  const colorOptions = (filterResponse?.colorNames ?? []).map((c) => ({ label: c, value: c }));
  const skuOptions = (filterResponse?.skus ?? []).map((s) => ({ label: s, value: s }));

  const filterOptions = [
    ...(restrictedWarehouseId && restrictedWarehouseId !== 0 ? [] : [{
      key: 'warehouseName',
      label: 'Location',
      options: (warehouses?.data ?? []).map((w) => ({ label: w.name, value: w.id })),
    }]),
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'Alive', value: 'alive' },
        { label: 'Dead', value: 'dead' },
      ],
    },
    {
      key: 'modelName',
      label: 'Model',
      options: modelOptions,
    },
    {
      key: 'storage',
      label: 'Storage',
      options: storageOptions,
    },
    {
      key: 'colorName',
      label: 'Color',
      options: colorOptions,
    },
    {
      key: 'sku',
      label: 'SKU',
      options: skuOptions,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">

        <Button
          onClick={() => {
            if (!stockData.length) return;
            const headers = [
              'ID',
              'IMEI',
              'Serial',
              'SKU',
              'Model',
              'Storage',
              'Color',
              'Grade',
              'Warehouse',
              'Dead',
              'Received',
            ];
            const rows = stockData.map((s) => [
              s.id,
              s.imei,
              s.serial ?? '',
              s.sku,
              s.modelName ?? '',
              s.storage ?? '',
              s.colorName ?? '',
              s.grade ?? '',
              s.warehouseName ?? '',
              s.isDead ? 'Yes' : 'No',
              s.createdAt ?? '',
            ]);
            const csvContent = [headers, ...rows]
              .map((r) => r.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
              .join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `stock_${new Date().toISOString()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore Generic component mismatch */}
      <DataTable
        columns={stockColumns}
        data={stockData}
        searchKey="imei"
        manualPagination
        manualFiltering
        pagination={pagination}
        onPaginationChange={setPagination}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        rowCount={totalCount}
        isLoading={isLoading}
        filterOptions={filterOptions}
      />
      <div className="text-sm text-muted-foreground mt-2">Total devices: {totalCount}</div>
    </div>
  );
} 