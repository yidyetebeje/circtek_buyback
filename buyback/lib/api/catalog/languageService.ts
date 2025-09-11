import { ApiClient, createApiClient } from '../base';
import { ApiResponse } from '../types';
import { Language } from '@/types/catalog';

/**
 * Service for language management API operations
 */
export class LanguageService {
  private apiClient: ApiClient;
  private baseEndpoint: string = '/catalog/languages';

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  /**
   * Get all languages with pagination
   */
  async getLanguages(
    page: number = 1,
    limit: number = 100,
    orderBy: string = 'id',
    order: 'asc' | 'desc' = 'asc'
  ): Promise<{ data: Language[]; meta: { total: number; page: number; limit: number; totalPages: number; } }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      orderBy,
      order
    });

    return this.apiClient.get<{ data: Language[]; meta: { total: number; page: number; limit: number; totalPages: number; } }>(`${this.baseEndpoint}?${params}`);
  }

  /**
   * Get language by ID
   */
  async getLanguageById(id: number): Promise<ApiResponse<Language>> {
    return this.apiClient.get<ApiResponse<Language>>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Create a new language
   */
  async createLanguage(language: Omit<Language, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Language>> {
    return this.apiClient.post<ApiResponse<Language>>(this.baseEndpoint, language);
  }

  /**
   * Update an existing language
   */
  async updateLanguage(
    id: number, 
    language: Partial<Omit<Language, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ApiResponse<Language>> {
    return this.apiClient.put<ApiResponse<Language>>(`${this.baseEndpoint}/${id}`, language);
  }

  /**
   * Delete a language
   */
  async deleteLanguage(id: number): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Set default language
   */
  async setDefaultLanguage(id: number): Promise<ApiResponse<Language>> {
    return this.apiClient.put<ApiResponse<Language>>(`${this.baseEndpoint}/${id}/set-default`, {});
  }
}

// Export a default instance
export const languageService = new LanguageService();
export const createLanguageService = (apiClient?: ApiClient) => new LanguageService(apiClient); 