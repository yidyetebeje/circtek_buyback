"use client";

import React from 'react';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";

interface AdminHeaderProps {
  title: string;
  breadcrumbs?: {
    href?: string;
    label: string;
    isCurrentPage?: boolean;
  }[];
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ 
  title, 
  breadcrumbs = [
    { href: '/admin/dashboards', label: 'Admin' },
    { label: title, isCurrentPage: true }
  ]
}) => {
  return (
    <div className="mb-6">
      <Breadcrumb className="mb-2">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {crumb.isCurrentPage ? (
                  <BreadcrumbPage>
                    <span className="max-w-[50vw] truncate inline-block align-bottom">{crumb.label}</span>
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href} className="max-w-[50vw] truncate inline-block align-bottom">
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    </div>
  );
};
