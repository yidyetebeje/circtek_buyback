"use client";

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';

import { ModelSeriesForm, ModelSeriesFormValues } from '@/components/admin/catalog/model-series-form';
import {
  useModelSeriesById,
  useModelSeriesTranslations,
  useUpdateModelSeriesWithTranslations,
  useUploadModelSeriesImage,
} from '@/hooks/catalog/useModelSeries';
import { ModelSeries, ModelSeriesTranslation } from '@/types/catalog';
import { AdminEditCard } from '@/components/admin/AdminEditCard';

export default function EditModelSeriesPage() {
  const router = useRouter();
  const params = useParams();
  const seriesId = params.seriesId ? parseInt(params.seriesId as string, 10) : null;

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const { data: seriesResponse, isLoading: isLoadingSeries, isError: isErrorSeries, error: errorSeries } = useModelSeriesById(seriesId as number);
  const { data: translationsResponse, isLoading: isLoadingTranslations, isError: isErrorTranslations, error: errorTranslations } = useModelSeriesTranslations(seriesId as number);
  
  const { mutateAsync: updateModelSeries } = useUpdateModelSeriesWithTranslations(seriesId as number);
  const { mutateAsync: uploadImage } = useUploadModelSeriesImage();
  const [isSaving, setIsSaving] = useState(false);

  const isLoading = isLoadingSeries || isLoadingTranslations;
  const isError = isErrorSeries || isErrorTranslations;
  const error: Error | null = errorSeries || errorTranslations;

  const actualSeries = seriesResponse?.data;
  const actualTranslations = translationsResponse?.data;

  const englishTranslation = actualTranslations?.find((t: ModelSeriesTranslation) => t.language_id === 1);

  React.useEffect(() => {
    if (actualSeries?.image) {
      setImageUrl(actualSeries.image);
    }
  }, [actualSeries?.image]);

  const initialData: ModelSeriesFormValues | undefined = actualSeries && englishTranslation ? {
    name: englishTranslation.title || '',
    image: actualSeries.image || '',
    description: englishTranslation.description || '',
    seo_title: englishTranslation.meta_title || '',
    seo_description: englishTranslation.meta_description || '',
    seo_keywords: englishTranslation.meta_keywords || '',
  } : undefined;

  const handleUpdateModelSeries = async (values: ModelSeriesFormValues) => {
    if (!seriesId || !actualSeries) return;

    let imageUrlForPayload: string | null | undefined = actualSeries.image;

    if (values.image instanceof File) {
      // We'll upload after updating details
    } else if (typeof values.image === 'string') {
      imageUrlForPayload = values.image === '' ? null : values.image;
    }

    const seriesUpdatePayload: Partial<ModelSeries> = {
      brand_id: actualSeries.brand_id,
      title: values.name,
      description: values.description || null,
      order_no: actualSeries.order_no,
      image: imageUrlForPayload,
      meta_title: values.seo_title || null,
      meta_description: values.seo_description || null,
      meta_keywords: values.seo_keywords || null,
    };

    const translationUpdatePayload: ModelSeriesTranslation = {
      model_series_id: seriesId,
      language_id: englishTranslation?.language_id || 1,
      title: values.name,
      description: values.description || '',
      meta_title: values.seo_title || null,
      meta_description: values.seo_description || null,
      meta_keywords: values.seo_keywords || null,
    };

    const finalPayload = {
      modelSeries: seriesUpdatePayload,
      translations: [translationUpdatePayload],
    };

    setIsSaving(true);
    try {
      await updateModelSeries(finalPayload);
      if (values.image instanceof File && seriesId) {
        await uploadImage({ seriesId, file: values.image });
      }
      toast.success('Model Series updated successfully!');
      router.push('../../model-series');
    } catch (error) {
      console.error('Error updating model series:', error);
      toast.error((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const tempUrl = URL.createObjectURL(file);
    setImageUrl(tempUrl);
    return Promise.resolve(tempUrl);
  };

  const handleImageRemove = () => {
    setImageUrl(null);
  };

  const handleCancel = () => {
    router.push('../../model-series');
  };

  if (isLoading) {
    return <div>Loading model series data...</div>;
  }

  if (isError || !initialData) {
    return <div>Error loading model series data: {error?.message || 'Series not found or failed to load.'}</div>;
  }

  const seriesName = initialData?.name || `ID: ${seriesId}`;

  return (
    <AdminEditCard
      title={`Edit Model Series: ${seriesName}`}
      description="Update the details for this model series."
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { href: '/admin/catalog/model-series', label: 'Model Series' },
        { label: `Edit: ${seriesName}`, isCurrentPage: true }
      ]}
    >
      {initialData && (
        <ModelSeriesForm 
          initialData={{...initialData, image: imageUrl || initialData.image }}
          onSubmit={handleUpdateModelSeries} 
          onCancel={handleCancel} 
          isLoading={isSaving} 
          onImageUpload={handleImageUpload}
          onImageRemove={handleImageRemove}
        />
      )}
    </AdminEditCard>
  );
}
