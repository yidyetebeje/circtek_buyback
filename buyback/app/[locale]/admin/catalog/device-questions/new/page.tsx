"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { AdminEditCard } from '@/components/admin/AdminEditCard';

import { DeviceQuestionSetForm, QuestionSetFormValues } from '@/components/admin/catalog/device-question-set-form';
import { useCreateQuestionSetWithQuestions } from '@/hooks/catalog/useDeviceQuestionSets';
import { Button } from '@/components/ui/button';
import { CreateQuestionSetPayload } from '@/lib/api/catalog/deviceQuestionSetService';
import { QuestionInputType } from '@/types/catalog/device-questions';

export default function NewDeviceQuestionSetPage() {
  const router = useRouter();
  const t = useTranslations('AdminCatalog');
  const tCore = useTranslations('Core');

  const { mutate: createQuestionSet, isPending: isLoading } = useCreateQuestionSetWithQuestions();

  const handleSubmit = (values: QuestionSetFormValues) => {
    // TODO: Replace hardcoded client_id with a dynamic value from user context or env
    const clientId = 1; 

    // Transform our form data to match the API's expected structure
    // The API expects questions without id/questionSetId/createdAt/updatedAt
    const formattedQuestions = values.questions?.map(question => {
      // First convert the inputType string to the appropriate enum value
      const inputType = question.inputType as QuestionInputType;
      
      return {
        title: question.title,
        inputType: inputType,
        isRequired: question.isRequired,
        orderNo: question.orderNo,
        // Strip any properties that shouldn't be sent to API
        options: question.options.map(option => ({
          title: option.title,
          priceModifier: option.priceModifier,
          isDefault: option.isDefault,
          orderNo: option.orderNo
        }))
      };
    });

    const payload = {
      internalName: values.internalName,
      displayName: values.displayName,
      description: values.description,
      client_id: clientId,
      questions: formattedQuestions
    };

    // Use a type assertion here - the backend will handle ID generation
    createQuestionSet(payload as CreateQuestionSetPayload, {
      onSuccess: (response) => {
        toast.success(t('deviceQuestionSetCreated', { name: response?.data?.displayName || values.displayName }));
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
      title={t('newDeviceQuestionSetTitle')}
      description={t('newDeviceQuestionSetDescription')}
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { href: '/admin/catalog', label: 'Catalog' },
        { href: '/admin/catalog/device-questions', label: t('deviceQuestions') },
        { label: t('newDeviceQuestionSet'), isCurrentPage: true }
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