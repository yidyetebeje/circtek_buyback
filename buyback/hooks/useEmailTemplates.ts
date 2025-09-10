'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { emailTemplateService } from '@/lib/api/emailTemplateService';
import {
  EmailTemplate,
  EmailTemplateCreateRequest,
  EmailTemplateUpdateRequest,
  EmailTemplateListQuery,
  EmailTemplatePopulateRequest,
  EmailTemplatePopulatedResponse,
  EmailTemplateType
} from '@/types/emailTemplates';
import { ApiResponse, PaginatedResponse, QueryParams } from '@/lib/api/types';

/**
 * Hook for retrieving a paginated list of email templates
 */
export const useEmailTemplates = (params?: QueryParams & EmailTemplateListQuery) => {
  return useQuery<PaginatedResponse<EmailTemplate>, Error>({
    queryKey: ['emailTemplates', params],
    queryFn: () => emailTemplateService.getEmailTemplates(params),
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for retrieving a single email template by ID
 */
export const useEmailTemplate = (id: string) => {
  return useQuery({
    queryKey: ['emailTemplate', id],
    queryFn: () => emailTemplateService.getEmailTemplateById(id),
    enabled: !!id,
  });
};

/**
 * Hook for retrieving email templates by type
 */
export const useEmailTemplatesByType = (templateType: EmailTemplateType, params?: QueryParams) => {
  return useQuery({
    queryKey: ['emailTemplates', 'type', templateType, params],
    queryFn: () => emailTemplateService.getEmailTemplatesByType(templateType, params),
    enabled: !!templateType,
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for retrieving active email templates
 */
export const useActiveEmailTemplates = (params?: QueryParams) => {
  return useQuery({
    queryKey: ['emailTemplates', 'active', params],
    queryFn: () => emailTemplateService.getActiveEmailTemplates(params),
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for retrieving dynamic fields
 */
export const useDynamicFields = () => {
  return useQuery({
    queryKey: ['emailTemplate', 'dynamicFields'],
    queryFn: () => emailTemplateService.getDynamicFields(),
  });
};

/**
 * Hook for retrieving dynamic fields grouped by category
 */
export const useDynamicFieldsGrouped = () => {
  return useQuery({
    queryKey: ['emailTemplate', 'dynamicFields', 'grouped'],
    queryFn: () => emailTemplateService.getDynamicFieldsGrouped(),
  });
};

/**
 * Hook for searching email templates
 */
export const useSearchEmailTemplates = (searchTerm: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['emailTemplates', 'search', searchTerm, params],
    queryFn: () => emailTemplateService.searchEmailTemplates(searchTerm, params),
    enabled: !!searchTerm,
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for creating a new email template
 */
export const useCreateEmailTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (template: EmailTemplateCreateRequest) => emailTemplateService.createEmailTemplate(template),
    onSuccess: (_, variables) => {
      // Invalidate the email templates list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      
      // Invalidate related queries
      if (variables.templateType) {
        queryClient.invalidateQueries({ queryKey: ['emailTemplates', 'type', variables.templateType] });
      }
      if (variables.isActive) {
        queryClient.invalidateQueries({ queryKey: ['emailTemplates', 'active'] });
      }
    },
  });
};

/**
 * Hook for updating an email template
 */
export const useUpdateEmailTemplate = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (template: Partial<EmailTemplateUpdateRequest>) => emailTemplateService.updateEmailTemplate(id, template),
    onSuccess: (_, variables) => {
      // Invalidate both the email templates list and the individual template query
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['emailTemplate', id] });
      
      // Invalidate related queries
      if (variables.templateType) {
        queryClient.invalidateQueries({ queryKey: ['emailTemplates', 'type', variables.templateType] });
      }
      queryClient.invalidateQueries({ queryKey: ['emailTemplates', 'active'] });
    },
  });
};

/**
 * Hook for deleting an email template
 */
export const useDeleteEmailTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => emailTemplateService.deleteEmailTemplate(id),
    onSuccess: () => {
      // Invalidate the email templates list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['emailTemplates', 'active'] });
    },
  });
};

/**
 * Hook for populating/previewing an email template
 */
export const usePopulateEmailTemplate = () => {
  return useMutation<
    ApiResponse<EmailTemplatePopulatedResponse>,
    Error,
    EmailTemplatePopulateRequest
  >({
    mutationFn: (request: EmailTemplatePopulateRequest) => 
      emailTemplateService.populateEmailTemplate(request),
    onError: (error) => {
      console.error("Error populating email template:", error);
    }
  });
};

/**
 * Hook for toggling email template active status
 */
export const useToggleEmailTemplateStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      emailTemplateService.toggleEmailTemplateStatus(id, isActive),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['emailTemplate', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['emailTemplates', 'active'] });
    },
  });
};

/**
 * Hook for duplicating an email template
 */
export const useDuplicateEmailTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) => 
      emailTemplateService.duplicateEmailTemplate(id, newName),
    onSuccess: () => {
      // Invalidate the email templates list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
    },
    onError: (error) => {
      console.error("Error duplicating email template:", error);
    }
  });
};

/**
 * Hook for creating sample email templates
 */
export const useCreateSampleTemplates = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => emailTemplateService.createSampleTemplates(),
    onSuccess: () => {
      // Invalidate all email template queries to refetch them
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['emailTemplates', 'active'] });
    },
    onError: (error) => {
      console.error("Error creating sample templates:", error);
    }
  });
}; 