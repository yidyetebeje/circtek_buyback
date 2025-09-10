import React from 'react';
import { EmailTemplateListClient } from '@/components/admin/email-templates/email-template-list-client';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default function AdminEmailTemplatesPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <AdminHeader title="Email Templates" />
      
      <EmailTemplateListClient />
    </div>
  );
} 