"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { CategoryForm } from '@/components/admin/catalog/category-form';
import { useCreateCategory, useUploadCategoryIcon } from '@/hooks/catalog/useCategories'; 
import { Category } from '@/types/catalog';
import { Separator } from '@/components/ui/separator';
import { AdminEditCard } from '@/components/admin/AdminEditCard';

type CategoryFormValues = Parameters<typeof CategoryForm>[0]['onSubmit'] extends (values: infer V) => unknown ? V : never;

export default function CreateCategoryPage() {
  const router = useRouter();
  const { mutateAsync: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutateAsync: uploadIcon, isPending: isUploading } = useUploadCategoryIcon(); 
  const [iconFile, setIconFile] = useState<File | null>(null); 

  const handleCreateCategory = async (values: CategoryFormValues) => {
    if (!iconFile) {
      toast.error('Please select an icon for the category.');
      return;
    }

    const categoryPayload: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at' | 'icon'>> = {
      client_id: 1,
      title: values.title,
      description: values.description || null,
      sef_url: '',
      order_no: null,
      meta_title: values.seo_title || null,
      meta_description: values.seo_description || null,
      meta_keywords: values.seo_keywords || null,
      meta_canonical_url: null,
    };

    try {
      const result = await createCategory(categoryPayload as Category);
      const newCategoryId = result?.data?.id;

      if (!newCategoryId) {
        throw new Error('Failed to retrieve Category ID after creation.');
      }

      await uploadIcon({ categoryId: newCategoryId, file: iconFile });

      toast.success('Category created successfully!');
      router.push('../categories');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error((error as Error).message || 'Failed to create category');
    }
  };

  const handleCancel = () => {
    router.push('../categories');
  };

  return (
    <AdminEditCard
      title="Create New Device Category"
      description="Add a new category with icon and details"
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { href: '/admin/catalog', label: 'Catalog' },
        { href: '/admin/catalog/categories', label: 'Categories' },
        { label: 'New Category', isCurrentPage: true }
      ]}
    >
      <Separator className="mb-6" />
      <CategoryForm 
        onSubmit={handleCreateCategory} 
        onCancel={handleCancel} 
        isLoading={isCreating || isUploading} 
        onFileSelect={setIconFile} 
      />
    </AdminEditCard>
  );
}
