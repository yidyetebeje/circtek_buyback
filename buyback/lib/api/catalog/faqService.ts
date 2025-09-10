/**
 * FAQ Service
 * Handles all API operations related to FAQs
 */

import { ApiClient, createApiClient } from '../base';
import { ApiResponse, QueryParams } from '../types';
import { FAQ, FAQTranslation, PaginatedFAQsResponse } from '@/types/catalog';

export class FAQService {
  private apiClient: ApiClient;
  private baseEndpoint = '/api/catalog/faqs';

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  /**
   * Get a paginated list of all FAQs
   */
  async getFAQs(params?: QueryParams): Promise<PaginatedFAQsResponse> {
    return this.apiClient.get<PaginatedFAQsResponse>(this.baseEndpoint, { params });
  }

  /**
   * Get a FAQ by ID
   */
  async getFAQById(id: number): Promise<ApiResponse<FAQ>> {
    return this.apiClient.get<ApiResponse<FAQ>>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Get FAQs by shop ID
   */
  async getFAQsByShopId(shopId: number, isPublished?: boolean): Promise<ApiResponse<FAQ[]>> {
    const params = isPublished !== undefined ? { published: isPublished } : {};
    return this.apiClient.get<ApiResponse<FAQ[]>>(`/api/catalog/shops/${shopId}/faqs`, { params });
  }

  /**
   * Create a new FAQ
   */
  async createFAQ(faq: Omit<FAQ, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<FAQ>> {
    return this.apiClient.post<ApiResponse<FAQ>>(this.baseEndpoint, faq);
  }

  /**
   * Update a FAQ
   */
  async updateFAQ(id: number, faq: Partial<FAQ>): Promise<ApiResponse<FAQ>> {
    return this.apiClient.put<ApiResponse<FAQ>>(`${this.baseEndpoint}/${id}`, faq);
  }

  /**
   * Delete a FAQ
   */
  async deleteFAQ(id: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Create a FAQ with translations in one request
   */
  async createFAQWithTranslations(data: {
    question: string;
    answer: string;
    order_no?: number;
    is_published?: boolean;
    shop_id: number;
    client_id: number;
    translations: {
      language_id: number;
      question: string;
      answer: string;
    }[];
  }): Promise<ApiResponse<FAQ>> {
    return this.apiClient.post<ApiResponse<FAQ>>(`${this.baseEndpoint}/with-translations`, data);
  }

  /**
   * Update a FAQ with translations in one request
   */
  async updateFAQWithTranslations(id: number, data: {
    question?: string;
    answer?: string;
    order_no?: number;
    is_published?: boolean;
    translations?: {
      language_id: number;
      question: string;
      answer: string;
    }[];
  }): Promise<ApiResponse<FAQ>> {
    return this.apiClient.put<ApiResponse<FAQ>>(`${this.baseEndpoint}/${id}/with-translations`, data);
  }

  /**
   * Update FAQ order
   */
  async updateFAQOrder(id: number, newOrder: number): Promise<ApiResponse<FAQ>> {
    return this.apiClient.put<ApiResponse<FAQ>>(`${this.baseEndpoint}/${id}/order`, { order: newOrder });
  }

  /**
   * Get all translations for a FAQ
   */
  async getFAQTranslations(faqId: number): Promise<ApiResponse<FAQTranslation[]>> {
    return this.apiClient.get<ApiResponse<FAQTranslation[]>>(`${this.baseEndpoint}/${faqId}/translations`);
  }

  /**
   * Create a new translation for a FAQ
   */
  async createFAQTranslation(
    faqId: number, 
    languageId: number, 
    translation: { question: string; answer: string }
  ): Promise<ApiResponse<FAQTranslation[]>> {
    return this.apiClient.post<ApiResponse<FAQTranslation[]>>(
      `${this.baseEndpoint}/${faqId}/translations/${languageId}`, 
      translation
    );
  }

  /**
   * Update a FAQ translation
   */
  async updateFAQTranslation(
    faqId: number, 
    languageId: number, 
    translation: { question?: string; answer?: string }
  ): Promise<ApiResponse<FAQTranslation[]>> {
    return this.apiClient.put<ApiResponse<FAQTranslation[]>>(
      `${this.baseEndpoint}/${faqId}/translations/${languageId}`, 
      translation
    );
  }

  /**
   * Delete a FAQ translation
   */
  async deleteFAQTranslation(faqId: number, languageId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(
      `${this.baseEndpoint}/${faqId}/translations/${languageId}`
    );
  }

  /**
   * Upsert a FAQ translation (create or update)
   */
  async upsertFAQTranslation(
    faqId: number, 
    languageId: number, 
    translation: { question: string; answer: string }
  ): Promise<ApiResponse<FAQTranslation>> {
    return this.apiClient.put<ApiResponse<FAQTranslation>>(
      `${this.baseEndpoint}/${faqId}/translations/${languageId}/upsert`, 
      translation
    );
  }
}

// Create a default instance
export const faqService = new FAQService();

// Export a function to create an instance with a specific client
export const createFAQService = (apiClient?: ApiClient) => new FAQService(apiClient); 