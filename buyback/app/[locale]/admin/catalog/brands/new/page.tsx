"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { BrandForm } from '@/components/admin/catalog/brand-form';
import { useCreateBrand, useUploadBrandLogo } from '@/hooks/catalog/useBrands'; 
import { Brand } from '@/types/catalog'; 
import { BrandFormValues } from '@/components/admin/catalog/brand-form';
import { Separator } from '@/components/ui/separator';
import { AdminEditCard } from '@/components/admin/AdminEditCard';

export default function CreateBrandPage() {
  const router = useRouter();
  const { mutateAsync: createBrand, isPending: isCreating } = useCreateBrand();
  const { mutateAsync: uploadLogo, isPending: isUploading } = useUploadBrandLogo(); 

  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleCreateBrand = async (values: BrandFormValues) => {
    if (!logoFile) {
      toast.error('Brand Logo is required. Please select an image.');
      return;
    }

    const brandPayload: Omit<Brand, 'id' | 'created_at' | 'updated_at'> & { client_id: number } = {
      client_id: 1,
      title: values.title,
      icon: null,
      sef_url: '',
      meta_title: values.seo_title || null,
      meta_description: values.seo_description || null,
      meta_keywords: values.seo_keywords || null,
      meta_canonical_url: null,
      order_no: null,
      description: values.description || null,
    };

    try {
      const createdBrandResponse = await createBrand(brandPayload as Brand);
      const brandId = createdBrandResponse?.data?.id;

      if (!brandId) {
        throw new Error('Failed to retrieve Brand ID after creation.');
      }

      await uploadLogo({ brandId, file: logoFile });

      toast.success('Brand created successfully!');
      router.push('../brands');
    } catch (error) {
      console.error('Error creating brand:', error);
      toast.error((error as Error).message || 'Failed to create brand');
    }
  };

  const handleCancel = () => {
    router.push('../brands');
  };

  return (
    <AdminEditCard
      title="Create New Device Brand"
      description="Add a new brand with logo and details"
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { href: '/admin/catalog', label: 'Catalog' },
        { href: '/admin/catalog/brands', label: 'Brands' },
        { label: 'New Brand', isCurrentPage: true }
      ]}
    >
      <Separator className="mb-6" />
      <BrandForm 
        onSubmit={handleCreateBrand} 
        onCancel={handleCancel} 
        isLoading={isCreating || isUploading} 
        onFileSelect={setLogoFile} 
      />
    </AdminEditCard>
  );
}
