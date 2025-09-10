"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ModelSeriesForm, ModelSeriesFormValues } from '@/components/admin/catalog/model-series-form';
import { useCreateModelSeries, useUploadModelSeriesImage } from '@/hooks/catalog/useModelSeries';
import { ModelSeries } from '@/types/catalog';
import { AdminEditCard } from '@/components/admin/AdminEditCard';

export default function CreateModelSeriesPage() {
  const router = useRouter();
  const { mutateAsync: createModelSeries, isPending: isCreating } = useCreateModelSeries();
  const { mutateAsync: uploadImage } = useUploadModelSeriesImage();

  // State for image preview
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleCreateModelSeries = async (values: ModelSeriesFormValues) => {
    try {
      // Prepare payload without image (image will be uploaded separately if needed)
      const modelSeriesPayload: Omit<ModelSeries, 'client_id'> & { tenant_id: number } = {
        id: undefined,
        tenant_id: 1,
        title: values.name,
        image: null, // initial image is handled separately
        description: values.description || null,
        sef_url: '',
        meta_title: values.seo_title || null,
        meta_description: values.seo_description || null,
        meta_keywords: values.seo_keywords || null,
        meta_canonical_url: null,
        order_no: null,
        created_at: undefined,
        updated_at: undefined,
      };

      // 1. Create the model series
      const res = await createModelSeries(modelSeriesPayload);
      const seriesId = res?.data?.id;
      if (!seriesId) {
        throw new Error('Failed to determine created series ID.');
      }

      // 2. Upload the image if a File was provided
      if (values.image instanceof File) {
        await uploadImage({ seriesId, file: values.image });
      }

      toast.success('Model Series created successfully!');
      router.push('../model-series');
    } catch (error) {
      console.error('Error creating model series:', error);
      const errMsg = (error as Error).message || 'Failed to create model series.';
      toast.error(errMsg);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const tempUrl = URL.createObjectURL(file);
    setImageUrl(tempUrl); // Update preview
    return tempUrl; // Return temp URL for ImageUpload component's preview
  };

  const handleImageRemove = () => {
    setImageUrl(null);
  };

  const handleCancel = () => {
    router.push('../model-series');
  };

  return (
    <AdminEditCard
      title="Create New Device Model Series"
      description="Fill in the details below to create a new model series."
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { href: '/admin/catalog/model-series', label: 'Model Series' },
        { label: 'Create New', isCurrentPage: true }
      ]}
    >
      <ModelSeriesForm
        onSubmit={handleCreateModelSeries}
        onCancel={handleCancel}
        isLoading={isCreating}
        onImageUpload={handleImageUpload}
        onImageRemove={handleImageRemove}
        initialData={{ name: '', image: imageUrl || '' }}
      />
    </AdminEditCard>
  );
}
