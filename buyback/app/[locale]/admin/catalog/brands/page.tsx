"use client";

import React from 'react';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/AdminHeader';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/admin/catalog/data-table'; 
import { useColumns } from '@/components/admin/catalog/brands-columns';
import { useBrands } from '@/hooks/catalog/useBrands';

export default function BrandsPage() {
  // Get the columns for the DataTable
  const brandColumns = useColumns();
  // Fetch brands with sorting
  const { data: brandsResponse, isLoading, isError, error } = useBrands({
    sort_by: 'updated_at',
    sort_direction: 'desc'
  });

  if (isLoading) {
    return <div className="w-full py-10 flex justify-center items-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
        <span>Loading brands...</span>
      </div>
    </div>;
  }
  
  if (isError) {
    return <div className="w-full py-10 text-red-500 flex justify-center">
      Error loading brands: {error?.message || 'Unknown error'}
    </div>;
  }

  // Adjust data access based on expected response structure
  const brands = brandsResponse?.data || [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <AdminHeader 
          title="Brands" 
          breadcrumbs={[
            { href: '/admin/dashboards', label: 'Admin' },
            { href: '/admin/catalog', label: 'Catalog' },
            { label: 'Brands', isCurrentPage: true }
          ]}
        />
        <Button asChild>
          <Link href="/admin/catalog/brands/new">
            <PlusCircle className="mr-2 h-4 w-4" /> <span className="font-semibold text-white">Create New Brand</span>
          </Link>
        </Button>
      </div>
      
      <DataTable 
        columns={brandColumns} 
        data={brands} 
        searchKey="title"
        entityType="brand"
      />
    </div>
  );
}
