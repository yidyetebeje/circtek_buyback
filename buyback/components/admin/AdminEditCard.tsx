import React, { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminHeader } from './AdminHeader';

interface AdminEditCardProps {
  title: string;
  description?: string;
  breadcrumbs: {
    href?: string;
    label: string;
    isCurrentPage?: boolean;
  }[];
  children: ReactNode;
  actionButtons?: ReactNode;
}

export const AdminEditCard: React.FC<AdminEditCardProps> = ({
  title,
  description,
  breadcrumbs,
  children,
  actionButtons
}) => {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <AdminHeader title={title} breadcrumbs={breadcrumbs} />
        </div>
        {actionButtons && (
          <div className="flex shrink-0 items-center gap-2">
            {actionButtons}
          </div>
        )}
      </div>

      <div className='bg-card rounded-lg px-6 py-6'>
        {description && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        )}
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};
