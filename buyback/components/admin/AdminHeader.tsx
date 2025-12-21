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
  actions?: React.ReactNode;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  breadcrumbs = [
    { href: '/admin/dashboards', label: 'Admin' },
    { label: title, isCurrentPage: true }
  ],
  actions
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};
