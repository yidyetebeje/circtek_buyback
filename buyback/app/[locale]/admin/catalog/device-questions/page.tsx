"use client";

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { DataTable } from '@/components/admin/catalog/data-table';
import { columns } from '@/components/admin/catalog/device-questions-columns';
import { useDeviceQuestionSets } from '@/hooks/catalog/useDeviceQuestionSets';
import { Skeleton } from '@/components/ui/skeleton';
import { QuestionSet, QuestionSetRow } from '@/types/catalog/device-questions';


export default function DeviceQuestionSetsPage() {
  const t = useTranslations('AdminCatalog');
  const tCore = useTranslations('Core');


  const {
    data: questionSetsPaginatedResponse,
    isLoading,
    isError,
    error,
  } = useDeviceQuestionSets({ page: 1, limit: 25 });

  const questionSetRows: QuestionSetRow[] = useMemo(() => {
    const questionSets = questionSetsPaginatedResponse?.data;
    if (!questionSets) return [];
    return questionSets.map((qs: QuestionSet) => ({
      id: qs.id,
      internalName: qs.internalName,
      displayName: qs.displayName,
      description: qs.description,
      tenantId: qs.tenantId,
      questionCount: qs.questions?.length || 0,
      createdAt: qs.createdAt,
      updatedAt: qs.updatedAt,
    }));
  }, [questionSetsPaginatedResponse]);

  if (isError) {
    return (
      <div className="container mx-auto py-10">
        <p className="text-red-500">{t('errorLoadingData')}: {error?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={questionSetRows}
          searchKey="displayName"
          entityType="device-question"
        />
      )}
    </div>
  );
} 