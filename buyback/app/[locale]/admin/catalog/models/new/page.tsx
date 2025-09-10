"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AdminEditCard } from '@/components/admin/AdminEditCard';

import { ModelForm, ModelFormValues } from '@/components/admin/catalog/model-form';
import { useCreateModel, useUploadModelImage } from '@/hooks/catalog/useModels';
import { useAssignQuestionSetToModel } from '@/hooks/catalog/useDeviceQuestionSets';
import { Model } from '@/types/catalog';
import { Separator } from '@/components/ui/separator';

export default function CreateModelPage() {
  const router = useRouter();
  const { mutateAsync: createModel, isPending: isCreating } = useCreateModel();
  const { mutateAsync: uploadImage, isPending: isUploadingImage } = useUploadModelImage();
  const { mutateAsync: assignQuestionSet, isPending: isAssigningQS } = useAssignQuestionSetToModel();

  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleCreateModel = async (values: ModelFormValues) => {
    if (!imageFile) {
      toast.error('Please select a model image.');
      return;
    }

    let specifications = null;
    if (values.specifications) {
      try {
        specifications = JSON.parse(values.specifications);
      } catch {
        toast.error('Invalid JSON in specifications field');
        return;
      }
    }

    const seriesIdNumber = values.series_id ? parseInt(values.series_id, 10) : NaN;

    const modelPayload = {
      client_id: 1,
      title: values.title,
      category_id: parseInt(values.category_id, 10),
      brand_id: parseInt(values.brand_id, 10),
      base_price: parseFloat(values.base_price),
      model_series_id: !isNaN(seriesIdNumber) ? seriesIdNumber : null,
      description: values.description || null,
      specifications,
      sef_url: '',
      meta_title: values.seo_title || null,
      meta_description: values.seo_description || null,
      meta_keywords: values.seo_keywords || null,
      price_drops: values.priceDrops
        ?.map(pd => ({
          test_name: pd.testName,
          price_drop: parseFloat(pd.priceDrop) || 0,
        }))
        .filter(pd => pd.price_drop > 0),
    } as Model;

    try {
      const createdModelResponse = await createModel(modelPayload);
      const modelId = createdModelResponse?.data?.id;

      if (!modelId) {
        throw new Error('Failed to retrieve model ID after creation.');
      }

      await uploadImage({ modelId, file: imageFile });

      const questionSetIdsToAssign = values.questionSetIds || [];
      if (questionSetIdsToAssign.length) {
        const assignmentPromises = questionSetIdsToAssign.map((qsId, idx) =>
          assignQuestionSet({ modelId, questionSetId: parseInt(qsId, 10), assignmentOrder: idx })
        );
        await Promise.all(assignmentPromises);
      }

      toast.success('Model created successfully!');
      router.push('/admin/catalog/models');
    } catch (error) {
      console.error('Error creating model:', error);
      toast.error((error as Error).message || 'Failed to create model');
    }
  };

  return (
    <AdminEditCard
      title="Create New Model"
      description="Add a new device model with details, pricing, and question sets"
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { href: '/admin/catalog', label: 'Catalog' },
        { href: '/admin/catalog/models', label: 'Models' },
        { label: 'New Model', isCurrentPage: true }
      ]}
    >
      <Separator className="my-6" />
      <div className="p-6">
        <ModelForm
          onSubmit={handleCreateModel}
          onCancel={() => router.push('/admin/catalog/models')}
          isLoading={isCreating || isUploadingImage || isAssigningQS}
          onFileSelect={setImageFile}
        />
      </div>
    </AdminEditCard>
  );
}
