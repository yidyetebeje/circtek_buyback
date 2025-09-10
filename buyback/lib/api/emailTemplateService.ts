/**
 * Email Template Service
 * Handles all API operations related to email templates
 */

import { ApiClient, createApiClient } from './base';
import { ApiResponse, PaginatedResponse, QueryParams } from './types';
import {
  EmailTemplate,
  EmailTemplateDynamicField,
  EmailTemplateCreateRequest,
  EmailTemplateUpdateRequest,
  EmailTemplateListQuery,
  EmailTemplatePopulateRequest,
  EmailTemplatePopulatedResponse,
  DynamicFieldGroup,
  EmailTemplateType
} from '@/types/emailTemplates';

export class EmailTemplateService {
  private apiClient: ApiClient;
  private baseEndpoint = '/api/email-templates';

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  /**
   * Get a paginated list of all email templates
   */
  async getEmailTemplates(params?: QueryParams & EmailTemplateListQuery): Promise<PaginatedResponse<EmailTemplate>> {
    return this.apiClient.get<PaginatedResponse<EmailTemplate>>(this.baseEndpoint, { 
      params,
      isProtected: true 
    });
  }

  /**
   * Get an email template by ID
   */
  async getEmailTemplateById(id: string): Promise<ApiResponse<EmailTemplate>> {
    return this.apiClient.get<ApiResponse<EmailTemplate>>(`${this.baseEndpoint}/${id}`, {
      isProtected: true
    });
  }

  /**
   * Get email templates by type
   */
  async getEmailTemplatesByType(templateType: EmailTemplateType, params?: QueryParams): Promise<PaginatedResponse<EmailTemplate>> {
    return this.apiClient.get<PaginatedResponse<EmailTemplate>>(this.baseEndpoint, { 
      params: { ...params, templateType },
      isProtected: true 
    });
  }

  /**
   * Get active email templates
   */
  async getActiveEmailTemplates(params?: QueryParams): Promise<PaginatedResponse<EmailTemplate>> {
    return this.apiClient.get<PaginatedResponse<EmailTemplate>>(this.baseEndpoint, { 
      params: { ...params, isActive: true },
      isProtected: true 
    });
  }

  /**
   * Create a new email template
   */
  async createEmailTemplate(template: EmailTemplateCreateRequest): Promise<ApiResponse<EmailTemplate>> {
    return this.apiClient.post<ApiResponse<EmailTemplate>>(this.baseEndpoint, template, {
      isProtected: true
    });
  }

  /**
   * Update an email template
   */
  async updateEmailTemplate(id: string, template: Partial<EmailTemplateUpdateRequest>): Promise<ApiResponse<EmailTemplate>> {
    return this.apiClient.put<ApiResponse<EmailTemplate>>(`${this.baseEndpoint}/${id}`, template, {
      isProtected: true
    });
  }

  /**
   * Delete an email template
   */
  async deleteEmailTemplate(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(`${this.baseEndpoint}/${id}`, {
      isProtected: true
    });
  }

  /**
   * Get all dynamic fields for email templates
   */
  async getDynamicFields(): Promise<ApiResponse<EmailTemplateDynamicField[]>> {
    return this.apiClient.get<ApiResponse<EmailTemplateDynamicField[]>>(`${this.baseEndpoint}/dynamic-fields`, {
      isProtected: true
    });
  }

  /**
   * Get dynamic fields grouped by category
   */
  async getDynamicFieldsGrouped(): Promise<ApiResponse<DynamicFieldGroup[]>> {
    // Backend returns { success: true, data: [...] }, we need to extract just the data
    const response = await this.apiClient.get<{ success: boolean; data: DynamicFieldGroup[] }>(`${this.baseEndpoint}/dynamic-fields`, {
      isProtected: true
    });
    
    return {
      data: response.data || []
    };
  }

  /**
   * Populate/preview an email template with order data
   */
  async populateEmailTemplate(request: EmailTemplatePopulateRequest): Promise<ApiResponse<EmailTemplatePopulatedResponse>> {
    return this.apiClient.post<ApiResponse<EmailTemplatePopulatedResponse>>(
      `${this.baseEndpoint}/populate`,
      request,
      { isProtected: true }
    );
  }

  /**
   * Search email templates
   */
  async searchEmailTemplates(searchTerm: string, params?: QueryParams): Promise<PaginatedResponse<EmailTemplate>> {
    return this.apiClient.get<PaginatedResponse<EmailTemplate>>(this.baseEndpoint, { 
      params: { ...params, search: searchTerm },
      isProtected: true 
    });
  }

  /**
   * Toggle email template active status
   */
  async toggleEmailTemplateStatus(id: string, isActive: boolean): Promise<ApiResponse<EmailTemplate>> {
    return this.updateEmailTemplate(id, { isActive });
  }

  /**
   * Duplicate an email template
   */
  async duplicateEmailTemplate(id: string, newName: string): Promise<ApiResponse<EmailTemplate>> {
    try {
      const templateResponse = await this.getEmailTemplateById(id);
      
      if (!templateResponse.data) {
        throw new Error('Failed to fetch template for duplication');
      }

      const originalTemplate = templateResponse.data;
      const duplicateRequest: EmailTemplateCreateRequest = {
        name: newName,
        subject: originalTemplate.subject,
        content: originalTemplate.content,
        templateType: originalTemplate.templateType,
        isActive: false // New duplicates start as inactive
      };

      return this.createEmailTemplate(duplicateRequest);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create sample email templates for testing and demonstration
   */
  async createSampleTemplates(): Promise<ApiResponse<EmailTemplate[]>> {
    return this.apiClient.post<ApiResponse<EmailTemplate[]>>(
      `${this.baseEndpoint}/samples`,
      {},
      { isProtected: true }
    );
  }
}

// Create a default instance
export const emailTemplateService = new EmailTemplateService();

// Export a function to create an instance with a specific client
export const createEmailTemplateService = (apiClient?: ApiClient) => new EmailTemplateService(apiClient); 