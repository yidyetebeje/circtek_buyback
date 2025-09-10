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
  const displayTitle = title.length > 20 ? `${title.substring(0, 20)}...` : title;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <AdminHeader title={displayTitle} breadcrumbs={breadcrumbs} />
        </div>
        {actionButtons && (
          <div className="flex shrink-0 items-center gap-2">
            {actionButtons}
          </div>
        )}
      </div>

      <Card className="border border-gray-200 shadow-sm">
        {description && (
          <CardHeader>
            <CardTitle>{displayTitle}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
        )}
        <CardContent className="pt-6">
          {children}
        </CardContent>
      </Card>
    </div>
  );
};
