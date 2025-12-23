"use client";

import React, { useState } from 'react';

import { DataTable } from '@/components/admin/catalog/data-table';
import { columns } from '@/components/admin/catalog/faqs-columns';
import { useFAQs } from '@/hooks/catalog/useFAQs';
import { useTranslations } from 'next-intl';
import { ColumnFiltersState, PaginationState } from '@tanstack/react-table';
import { QueryParams } from '@/lib/api/types';
import { FAQ } from '@/types/catalog';

export default function FAQsPage() {
  const t = useTranslations('AdminSidebar');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Build query parameters based on current UI state and filters
  const queryParams = React.useMemo((): QueryParams => {
    const params: QueryParams = {
      page,
      limit,
    };

    // Process each filter to build the API query parameters
    columnFilters.forEach((filter) => {
      const { id, value } = filter;

      // Helper to normalise single-select vs multi-select values
      const firstValue = Array.isArray(value) ? value[0] : value;

      if (id === 'is_published' && firstValue !== undefined) {
        // Convert string/boolean to boolean for is_published filter
        params.is_published = firstValue === 'true' || firstValue === true;
      }

      if (id === 'question' && typeof firstValue === 'string' && firstValue.trim()) {
        params.search = firstValue.trim();
      }
    });

    return params;
  }, [page, limit, columnFilters]);

  const { data: faqsResponse, isLoading, error } = useFAQs(queryParams);

  const faqs = faqsResponse?.data || [];
  const totalCount = faqsResponse?.meta?.total || 0;

  const filterOptions = [
    {
      key: 'is_published',
      label: 'Status',
      options: [
        { label: 'Published', value: 'true' },
        { label: 'Draft', value: 'false' },
      ],
    },
  ];

  // Handle pagination changes and trigger remote data fetch
  const handlePaginationChange = (updater: React.SetStateAction<PaginationState>) => {
    const newPagination = typeof updater === 'function'
      ? updater({ pageIndex: page - 1, pageSize: limit })
      : updater;
    setPage(newPagination.pageIndex + 1);
  };

  // Handle filter changes and trigger remote data fetch
  const handleColumnFiltersChange = (updater: React.SetStateAction<ColumnFiltersState>) => {
    const newFilters = typeof updater === 'function'
      ? updater(columnFilters)
      : updater;
    setColumnFilters(newFilters);
    // Reset to first page when filters change
    setPage(1);
  };

  if (error) {
    return (
      <div className="w-full py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error loading FAQs</h1>
          <p className="text-muted-foreground mt-2">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
        </div>
      </div>
    );
  }

  // Transform FAQs to ensure they have required id field
  const transformedFaqs = faqs
    .filter((faq): faq is FAQ & { id: number } => faq.id !== undefined)
    .map(faq => ({
      ...faq,
      publishedInShops: [] // Add empty publishedInShops array to satisfy DataTable interface
    }));

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={transformedFaqs}
        searchKey="question"
        filterOptions={filterOptions}
        entityType="faq"
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
    </div>
  );
} 