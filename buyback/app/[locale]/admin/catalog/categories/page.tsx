"use client";

import React from 'react';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/AdminHeader';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/admin/catalog/data-table'; 
import { useColumns } from '@/components/admin/catalog/categories-columns';
import { useCategories } from '@/hooks/catalog/useCategories';
import { useModels } from '@/hooks/catalog/useModels';

export default function CategoriesPage() {
  // Get the columns for the DataTable
  const categoryColumns = useColumns();
  // Fetch categories with sorting
  const { data: categoriesResponse, isLoading, isError, error } = useCategories({
    sort_by: 'updated_at',
    sort_direction: 'desc'
  }); 
  
  // Fetch models to determine if categories have associated models
  // This can be useful for filtering categories by usage
  const { data: modelsResponse } = useModels({});
  
  // Calculate which categories have active models
  const categoriesWithModels = new Set();
  modelsResponse?.data?.forEach(model => {
    if (model.category_id) {
      categoriesWithModels.add(model.category_id);
    }
  });
  
  // Prepare filter options based on usage
  const usageOptions = [
    { label: 'All Categories', value: '' },
    { label: 'With Active Models', value: 'has_models' },
    { label: 'Without Models', value: 'no_models' }
  ];
  
  // Define filter options for the DataTable
  const filterOptions = [
    {
      key: 'usage',
      label: 'Usage',
      options: usageOptions
    }
  ];

  if (isLoading) {
    return <div className="w-full py-10 flex justify-center items-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
        <span>Loading categories...</span>
      </div>
    </div>;
  }
  
  if (isError) {
    return <div className="w-full py-10 text-red-500 flex justify-center">
      Error loading categories: {error?.message || 'Unknown error'}
    </div>;
  }

  // Adjust data access based on expected response structure
  const categories = categoriesResponse?.data || []; 
  
  // Add usage information to categories for filtering
  const categoriesWithUsage = categories.map(category => ({
    ...category,
    usage: categoriesWithModels.has(category.id) ? 'has_models' : 'no_models'
  }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <AdminHeader 
          title="Device Categories" 
          breadcrumbs={[
            { href: '/admin/dashboards', label: 'Admin' },
            { href: '/admin/catalog', label: 'Catalog' },
            { label: 'Categories', isCurrentPage: true }
          ]}
        />
        <Button asChild>
          <Link href="/admin/catalog/categories/new">
            <PlusCircle className="mr-2 h-4 w-4" /> <span className="font-semibold text-white">Create New Category</span>
          </Link>
        </Button>
      </div>
      
      <DataTable 
        columns={categoryColumns} 
        data={categoriesWithUsage} 
        searchKey="title"
        filterOptions={filterOptions}
        entityType="category"
        initialColumnVisibility={{ usage: false }}
      />
    </div>
  );
}
