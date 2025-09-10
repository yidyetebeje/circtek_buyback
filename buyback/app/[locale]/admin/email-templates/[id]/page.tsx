import React from 'react';
import { EmailTemplateFormWrapper } from '@/components/admin/email-templates/email-template-form-wrapper';
import { AdminEditCard } from '@/components/admin/AdminEditCard';

interface EditEmailTemplatePageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export default async function EditEmailTemplatePage({ params }: EditEmailTemplatePageProps) {
  const { id } = await params;
  return (
    <AdminEditCard
      title="Edit Email Template"
      description="Modify the email template and preview changes in real-time"
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { href: '/admin/email-templates', label: 'Email Templates' },
        { label: 'Edit Template', isCurrentPage: true }
      ]}
    >
      <EmailTemplateFormWrapper emailTemplateId={id} />
    </AdminEditCard>
  );
} 