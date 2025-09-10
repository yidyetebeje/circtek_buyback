"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { EmailTemplateFormWithPreview } from './email-template-form-with-preview';
import { EmailTemplateCreateRequest } from '@/types/emailTemplates';
import { useCreateEmailTemplate, useUpdateEmailTemplate, useEmailTemplate } from '@/hooks/useEmailTemplates';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface EmailTemplateFormWrapperProps {
  emailTemplateId?: string;
}

export function EmailTemplateFormWrapper({ emailTemplateId }: EmailTemplateFormWrapperProps) {
  const router = useRouter();
  const isEditing = !!emailTemplateId;

  // Queries and mutations  
  const { data: emailTemplateResponse, isLoading } = useEmailTemplate(emailTemplateId || '');
  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate(emailTemplateId || '');

  const handleSave = async (values: EmailTemplateCreateRequest) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync(values);
        toast.success('Email template updated successfully');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Email template created successfully');
      }
      router.push('/admin/email-templates');
    } catch (error) {
      toast.error(isEditing ? 'Failed to update email template' : 'Failed to create email template');
      console.error('Error saving email template:', error);
    }
  };

  const handleCancel = () => {
    router.push('/admin/email-templates');
  };

  if (isEditing && isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <EmailTemplateFormWithPreview
      initialData={emailTemplateResponse?.data || null}
      onSave={handleSave}
      onCancel={handleCancel}
      isLoading={createMutation.isPending || updateMutation.isPending}
    />
  );
} 