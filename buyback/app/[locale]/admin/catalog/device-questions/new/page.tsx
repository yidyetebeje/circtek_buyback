"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AdminEditCard } from '@/components/admin/AdminEditCard';

import { DeviceQuestionSetForm, QuestionSetSubmitValues } from '@/components/admin/catalog/device-question-set-form';
import { useCreateQuestionSetWithQuestions } from '@/hooks/catalog/useDeviceQuestionSets';
import { CreateQuestionSetPayload } from '@/lib/api/catalog/deviceQuestionSetService';
import { QuestionInputType } from '@/types/catalog/device-questions';

export default function NewDeviceQuestionSetPage() {
  const router = useRouter();
  const t = useTranslations('AdminCatalog');
  const tCore = useTranslations('Core');

  const { mutate: createQuestionSet, isPending: isLoading } = useCreateQuestionSetWithQuestions();

  const handleSubmit = (values: QuestionSetSubmitValues) => {
    // TODO: Replace hardcoded tenantId with a dynamic value from user context or env
    const tenantId = 1;

    // Transform our form data to match the API's expected structure
    // The API expects questions without id/questionSetId/createdAt/updatedAt
    const formattedQuestions = values.questions?.map(question => {
      // Build question object, omitting inputType if empty (backend applies default)
      const questionData: any = {
        title: question.title,
        orderNo: question.orderNo,
        options: question.options.map(option => ({
          title: option.title,
          priceModifier: option.priceModifier,
          isDefault: option.isDefault ?? false,
          orderNo: option.orderNo
        }))
      };

      // Only include inputType if it's a valid non-empty string
      if (question.inputType && question.inputType.trim() !== '') {
        questionData.inputType = question.inputType;
      }
      // isRequired defaults to false on backend, but include if provided
      if (question.isRequired !== undefined) {
        questionData.isRequired = question.isRequired;
      }

      return questionData;
    });

    const payload = {
      internalName: values.internalName,
      displayName: values.name, // Use 'name' from form, map to 'displayName' for API
      description: values.description,
      tenantId: tenantId,
      questions: formattedQuestions
    };

    // The backend will handle ID generation
    // Type assertion needed due to slight structural differences in options array
    createQuestionSet(payload as CreateQuestionSetPayload, {
      onSuccess: (response) => {
        toast.success(t('deviceQuestionSetCreated', { name: response?.data?.displayName || values.name }));
        router.push('/admin/catalog/device-questions');
      },
      onError: (error: Error) => {
        toast.error(t('errorCreatingDeviceQuestionSet', { message: error.message || tCore('unknownError') }));
      },
    });
  };

  const handleCancel = () => {
    router.push('/admin/catalog/device-questions');
  };

  return (
    <AdminEditCard
      title="New Question Set"
      description="Create a new device assessment question set"
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { href: '/admin/catalog', label: 'Catalog' },
        { href: '/admin/catalog/device-questions', label: 'Question Sets' },
        { label: 'New Question Set', isCurrentPage: true }
      ]}
    >
      <DeviceQuestionSetForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </AdminEditCard>
  );
} 