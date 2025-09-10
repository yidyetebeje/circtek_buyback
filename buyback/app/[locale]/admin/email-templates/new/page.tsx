import React from 'react';
import { EmailTemplateFormWrapper } from '@/components/admin/email-templates/email-template-form-wrapper';
import { AdminEditCard } from '@/components/admin/AdminEditCard';

export default function NewEmailTemplatePage() {
  return (
    <AdminEditCard
      title="Create Email Template"
      description="Create a new email template with dynamic fields and preview functionality"
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { href: '/admin/email-templates', label: 'Email Templates' },
        { label: 'New Template', isCurrentPage: true }
      ]}
    >
      <EmailTemplateFormWrapper />
    </AdminEditCard>
  );
} 