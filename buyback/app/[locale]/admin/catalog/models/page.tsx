"use client";

import React, { useState, useEffect } from 'react';

import { DataTable } from '@/components/admin/catalog/data-table';
import { useColumns } from '@/components/admin/catalog/models-columns';
import { useModels } from '@/hooks/catalog/useModels';
import { useCategories } from '@/hooks/catalog/useCategories';
import { useBrands } from '@/hooks/catalog/useBrands';
import { useModelSeries } from '@/hooks/catalog/useModelSeries';
import { ModelFilterToolbar } from '@/components/admin/catalog/models/model-filter-toolbar';
import { Model } from '@/types/catalog';
import { ColumnDef } from '@tanstack/react-table';

// Import the ModelWithRelations type from the models-columns file
type ModelWithRelations = Model & {
  brand?: { id: number; title: string };
  category?: { id: number; title: string };
  model_series?: { id: number; title: string };
};

type FilterOption = {
  label: string;
  value: number;
};

export default function ModelsPage() {
  // Get the columns for the DataTable
  const modelColumns = useColumns();
  // State for filters - Use arrays for multi-select
  const [filters, setFilters] = useState<{
    category_id?: number[];
    brand_id?: number[];
    series_id?: number[];
    title?: string;
  }>({});

  // Search input value
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Tracking active filters for badge display - Use arrays
  const [activeFilters, setActiveFilters] = useState<{
    category?: FilterOption[];
    brand?: FilterOption[];
    series?: FilterOption[];
  }>({});

  // Debounced search function
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (filters.title || '')) {
        setIsSearching(true);
        setFilters(prev => ({ ...prev, title: searchValue || undefined }));
        // Trigger refetch manually or let useModels handle it based on dependency change
        // setTimeout(() => setIsSearching(false), 300); // We manage loading state differently now
      }
    }, 500); // Increased debounce time

    return () => clearTimeout(timer);
  }, [searchValue, filters.title]);

  // Fetch models with filters - isLoading will now reflect fetch status
  const { data: modelsResponse, isFetching, isError, error } = useModels({
    // Base query params
    sort_by: 'updated_at',
    sort_direction: 'desc',
    // Explicitly pass filter params to match hook definition & avoid index signature issue
    // @ts-expect-error - The hook expects number[] but the API requires a comma-separated string.
    category_id: filters.category_id?.join(','),
    // @ts-expect-error - The hook expects number[] but the API requires a comma-separated string.
    brand_id: filters.brand_id?.join(','),
    series_id: filters.series_id?.join(','),
    title: filters.title,
    // page: currentPage, // Example if adding pagination later
    // limit: itemsPerPage, // Example if adding pagination later
  });

  // Reset searching state once the underlying query network request finishes
  useEffect(() => {
    if (!isFetching) {
      setIsSearching(false);
    }
  }, [isFetching]);

  // Fetch related data for filters
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useCategories();
  const { data: brandsResponse, isLoading: isLoadingBrands } = useBrands();
  const { data: seriesResponse, isLoading: isLoadingSeries } = useModelSeries();

  // Prepare filter options
  const categoryOptions: FilterOption[] = categoriesResponse?.data
    ?.filter(category => category.id !== undefined && category.title)
    .map(category => ({ label: category.title!, value: category.id! })) || [];

  const brandOptions: FilterOption[] = brandsResponse?.data
    ?.filter(brand => brand.id !== undefined && brand.title)
    .map(brand => ({ label: brand.title!, value: brand.id! })) || [];

  const seriesOptions: FilterOption[] = seriesResponse?.data
    ?.filter(series => series.id !== undefined && series.title)
    .map(series => ({ label: series.title!, value: series.id! })) || [];

  // Handle multi-filter selection/deselection
  const handleFilterSelect = (
    key: 'category_id' | 'brand_id' | 'series_id',
    option: FilterOption
  ) => {
    const filterGroup = key === 'category_id' ? 'category' :
      key === 'brand_id' ? 'brand' : 'series';

    setActiveFilters(prev => {
      const currentGroupFilters = prev[filterGroup] || [];
      const isSelected = currentGroupFilters.some(f => f.value === option.value);
      let newGroupFilters;
      if (isSelected) {
        newGroupFilters = currentGroupFilters.filter(f => f.value !== option.value);
      } else {
        newGroupFilters = [...currentGroupFilters, option];
      }
      return {
        ...prev,
        [filterGroup]: newGroupFilters.length > 0 ? newGroupFilters : undefined
      };
    });

    setFilters(prev => {
      const currentIds = prev[key] || [];
      const isSelected = currentIds.includes(option.value);
      let newIds;
      if (isSelected) {
        newIds = currentIds.filter(id => id !== option.value);
      } else {
        newIds = [...currentIds, option.value];
      }
      return {
        ...prev,
        [key]: newIds.length > 0 ? newIds : undefined
      };
    });

    // Don't close the popover on selection for multi-select
    // Popover will close on clicking outside
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters(prev => ({ title: prev.title })); // Keep search term if present
    setActiveFilters({});
    // setSearchValue(''); // Optionally clear search term too
  };

  // Remove single filter option (badge)
  const removeFilter = (
    key: 'category' | 'brand' | 'series',
    valueToRemove: number
  ) => {
    const filterKey = key === 'category' ? 'category_id' :
      key === 'brand' ? 'brand_id' : 'series_id';

    setActiveFilters(prev => {
      const currentGroupFilters = prev[key] || [];
      const newGroupFilters = currentGroupFilters.filter(f => f.value !== valueToRemove);
      return {
        ...prev,
        [key]: newGroupFilters.length > 0 ? newGroupFilters : undefined
      };
    });

    setFilters(prev => {
      const currentIds = prev[filterKey] || [];
      const newIds = currentIds.filter(id => id !== valueToRemove);
      return {
        ...prev,
        [filterKey]: newIds.length > 0 ? newIds : undefined
      };
    });
  };

  // Provide default empty array if data is null/undefined
  const models = modelsResponse?.data ?? [];

  // Aggregate loading flags used across the page
  const tableLoading = isFetching || isSearching;
  const toolbarLoading = isFetching || isLoadingCategories || isLoadingBrands || isLoadingSeries;

  return (
    <div className="space-y-6">

      {/* Custom Toolbar (always visible) */}


      {/* Error state */}
      {isError ? (
        <div className="text-red-500">Error loading models: {error?.message}</div>
      ) : (
        <>
          <DataTable<ModelWithRelations & { id: number }, unknown>
            columns={modelColumns as ColumnDef<ModelWithRelations & { id: number }, unknown>[]}
            data={models as (ModelWithRelations & { id: number })[]}
            entityType="model"
            isLoading={tableLoading}
          >
            {/* Disable default internal toolbar */}
            <ModelFilterToolbar
              isLoading={toolbarLoading}
              isSearching={isSearching}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              filters={filters}
              activeFilters={activeFilters}
              categoryOptions={categoryOptions}
              brandOptions={brandOptions}
              seriesOptions={seriesOptions}
              onFilterSelect={handleFilterSelect}
              onClearAllFilters={clearAllFilters}
              onRemoveFilter={removeFilter}
              onClearSearch={() => {
                setSearchValue('');
                setFilters(prev => ({ ...prev, title: undefined }));
              }}
            />
          </DataTable>

          {/* The DataTable component shows an inline empty state, so no extra handling here */}
        </>
      )}
    </div>
  );
}
