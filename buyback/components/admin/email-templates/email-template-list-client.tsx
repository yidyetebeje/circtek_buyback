"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  EmailTemplateType
} from "@/types/emailTemplates";
import {
  useEmailTemplates,
  useCreateSampleTemplates
} from "@/hooks/useEmailTemplates";
import { DataTable } from '@/components/admin/catalog/data-table';
import { columns } from './email-templates-columns';
import { ColumnFiltersState } from '@tanstack/react-table';

const EMAIL_TEMPLATE_TYPES = {
  ORDER_CONFIRMATION: "Order Confirmation",
  SHIPMENT_RECEIVED: "Shipment Received",
  OFFER_REJECTED: "Offer Rejected",
  ORDER_COMPLETED: "Order Completed",
  CUSTOM: "Custom"
};

export function EmailTemplateListClient() {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const typeFilter = columnFilters.find(f => f.id === 'templateType')?.value as string | undefined;
  const statusFilter = columnFilters.find(f => f.id === 'isActive')?.value as boolean | undefined;

  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    templateType: typeFilter as EmailTemplateType,
    isActive: statusFilter,
  };

  const { data: templatesResponse, isLoading, error } = useEmailTemplates(queryParams);
  const createSamplesMutation = useCreateSampleTemplates();

  const templates = templatesResponse?.data || [];
  const totalCount = templatesResponse?.meta?.total || 0;

  const handleCreateSamples = async () => {
    try {
      await createSamplesMutation.mutateAsync();
      toast.success("Sample templates created successfully");
    } catch (error) {
      console.error("Error creating sample templates:", error);
      toast.error("Failed to create sample templates");
    }
  };

  if (error) {
    toast.error("Failed to fetch email templates");
  }

  const filterOptions = [
    {
      key: 'templateType',
      label: 'Type',
      options: Object.entries(EMAIL_TEMPLATE_TYPES).map(([value, label]) => ({ label, value }))
    },
    {
      key: 'isActive',
      label: 'Status',
      options: [
        { label: 'Active', value: true },
        { label: 'Inactive', value: false },
      ]
    }
  ];

  return (
    <>
      {templates.length === 0 && !isLoading && (
        <div className="flex flex-col items-center gap-4 text-center py-8">
          <p className="text-muted-foreground">No email templates found</p>
          <Button
            variant="outline"
            onClick={handleCreateSamples}
            disabled={createSamplesMutation.isPending}
          >
            {createSamplesMutation.isPending ? 'Creating...' : 'Create Sample Templates'}
          </Button>
        </div>
      )}

      {templates.length > 0 &&
        <DataTable
          columns={columns}
          data={templates}
          searchKey="name"
          filterOptions={filterOptions}
          isLoading={isLoading}
          manualPagination
          rowCount={totalCount}
          pagination={{
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
          }}
          onPaginationChange={setPagination}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
        />
      }
    </>
  );
} 