import React from 'react';
import { EmailTemplateFormWrapper } from '@/components/admin/email-templates/email-template-form-wrapper';

interface EditEmailTemplatePageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export default async function EditEmailTemplatePage({ params }: EditEmailTemplatePageProps) {
  const { id } = await params;
  return (
    <div className="h-full">
      <EmailTemplateFormWrapper emailTemplateId={id} />
    </div>
  );
}