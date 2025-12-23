"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import { DataTable } from '@/components/admin/catalog/data-table';
import { useColumns } from '@/components/admin/catalog/model-series-columns';
import { useModelSeries } from '@/hooks/catalog/useModelSeries';
import { ColumnFiltersState, PaginationState } from '@tanstack/react-table';
import { QueryParams } from '@/lib/api/types';

export default function ModelSeriesPage() {
  // Get the columns for the DataTable
  const seriesColumns = useColumns();

  // State for manual pagination and filtering
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  // State for the immediate search input value
  const [searchTerm, setSearchTerm] = useState<string>('');
  // State for the debounced search value that will be used in the query
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Effect to debounce the search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      // When a new debounced search term is set, reset to the first page
      setPagination(p => ({ ...p, pageIndex: 0 }));
    }, 500); // 500ms delay

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  // Update columnFilters when searchTerm changes. This keeps the table's internal state in sync.
  useEffect(() => {
    setColumnFilters([{ id: 'title', value: searchTerm }]);
  }, [searchTerm]);

  // Build query parameters using the debounced search term
  const queryParams: QueryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    sort_by: 'updated_at',
    sort_direction: 'desc' as const,
    q: debouncedSearchTerm,
  };

  // Fetch model series with manual pagination
  const { data: seriesResponse, isLoading, isError, error } = useModelSeries(queryParams);

  if (isLoading && pagination.pageIndex === 0 && !debouncedSearchTerm) {
    return (
      <div className="space-y-6">

        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return <div className="w-full py-10 text-red-500 flex justify-center">
      Error loading model series: {error?.message || 'Unknown error'}
    </div>;
  }

  const pageCount = seriesResponse?.meta?.totalPages ?? 0;
  const series = seriesResponse?.data ?? [];

  return (
    <div className="space-y-6">
      <DataTable
        columns={seriesColumns}
        data={series.filter(item => item.id !== undefined)}
        searchKey="title"
        searchPlaceholder="Search by series title..."
        entityType="model-series"
        manualPagination={true}
        manualFiltering={true}
        rowCount={pageCount * pagination.pageSize}
        pagination={pagination}
        onPaginationChange={setPagination}
        columnFilters={columnFilters}
        onColumnFiltersChange={(updater) => {
          const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
          const newSearch = newFilters.find(f => f.id === 'title')?.value as string ?? '';
          setSearchTerm(newSearch);
        }}
        isLoading={isLoading}
      />
    </div>
  );
}
