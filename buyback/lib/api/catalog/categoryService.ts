/**
 * Category Service
 * Handles all API operations related to device categories
 */

import { ApiClient, createApiClient } from '../base';
import { ApiResponse, PaginatedResponse, QueryParams, CreateWithTranslationsRequest, UpdateWithTranslationsRequest } from '../types';
import { Category, CategoryTranslation } from '@/types/catalog';

export class CategoryService {
  private apiClient: ApiClient;
  private baseEndpoint = '/catalog/categories';

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  /**
   * Get a paginated list of all categories
   */
  async getCategories(params?: QueryParams): Promise<PaginatedResponse<Category>> {
    return this.apiClient.get<PaginatedResponse<Category>>(this.baseEndpoint, { params });
  }

  /**
   * Get a category by ID
   */
  async getCategoryById(id: number): Promise<ApiResponse<Category>> {
    return this.apiClient.get<ApiResponse<Category>>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Get a category by slug and client ID
   */
  async getCategoryBySlug(slug: string, clientId: number): Promise<ApiResponse<Category>> {
    return this.apiClient.get<ApiResponse<Category>>(`${this.baseEndpoint}/slug/${slug}/client/${clientId}`);
  }

  /**
   * Create a new category
   */
  async createCategory(category: Category): Promise<ApiResponse<Category>> {
    return this.apiClient.post<ApiResponse<Category>>(this.baseEndpoint, category);
  }

  /**
   * Update a category
   */
  async updateCategory(id: number, category: Partial<Category>): Promise<ApiResponse<Category>> {
    return this.apiClient.put<ApiResponse<Category>>(`${this.baseEndpoint}/${id}`, category);
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Get all translations for a category
   */
  async getCategoryTranslations(categoryId: number): Promise<ApiResponse<CategoryTranslation[]>> {
    return this.apiClient.get<ApiResponse<CategoryTranslation[]>>(`${this.baseEndpoint}/${categoryId}/translations`);
  }

  /**
   * Create a new translation for a category
   */
  async createCategoryTranslation(translation: CategoryTranslation): Promise<ApiResponse<CategoryTranslation>> {
    return this.apiClient.post<ApiResponse<CategoryTranslation>>(
      `${this.baseEndpoint}/${translation.category_id}/translations`, 
      translation
    );
  }

  /**
   * Update a category translation
   */
  async updateCategoryTranslation(
    categoryId: number, 
    languageId: number, 
    translation: Partial<Omit<CategoryTranslation, 'category_id' | 'language_id'>>
  ): Promise<ApiResponse<CategoryTranslation>> {
    return this.apiClient.put<ApiResponse<CategoryTranslation>>(
      `${this.baseEndpoint}/${categoryId}/translations/${languageId}`, 
      translation
    );
  }

  /**
   * Upsert (create or update) a category translation
   */
  async upsertCategoryTranslation(
    categoryId: number, 
    languageId: number, 
    translation: Omit<CategoryTranslation, 'category_id' | 'language_id'>
  ): Promise<ApiResponse<CategoryTranslation>> {
    return this.apiClient.put<ApiResponse<CategoryTranslation>>(
      `${this.baseEndpoint}/${categoryId}/translations/${languageId}/upsert`, 
      translation
    );
  }

  /**
   * Delete a category translation
   */
  async deleteCategoryTranslation(categoryId: number, languageId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(
      `${this.baseEndpoint}/${categoryId}/translations/${languageId}`
    );
  }

  /**
   * Create a new category with translations in one request
   */
  async createCategoryWithTranslations(
    category: Category,
    translations: CategoryTranslation[]
  ): Promise<ApiResponse<Category>> {
    const data: CreateWithTranslationsRequest<Category, CategoryTranslation> = {
      entity: category,
      translations
    };
    return this.apiClient.post<ApiResponse<Category>>(`${this.baseEndpoint}/with-translations`, data);
  }

  /**
   * Update a category with translations in one request
   */
  async updateCategoryWithTranslations(
    categoryId: number,
    category: Partial<Category>,
    translations: CategoryTranslation[]
  ): Promise<ApiResponse<Category>> {
    const data: UpdateWithTranslationsRequest<Category, CategoryTranslation> = {
      entity: category,
      translations
    };
    return this.apiClient.put<ApiResponse<Category>>(`${this.baseEndpoint}/${categoryId}/with-translations`, data);
  }

  /**
   * Upload a category icon
   */
  async uploadCategoryIcon(categoryId: number, file: File): Promise<ApiResponse<{ icon_url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.apiClient.post<ApiResponse<{ icon_url: string }>>(
      `${this.baseEndpoint}/${categoryId}/icon`,
      formData
    );
  }

  /**
   * Bulk upsert (create or update) multiple category translations
   */
  async bulkUpsertCategoryTranslations(
    categoryId: number,
    translations: Array<{
      language_id: number;
      title: string;
      description?: string;
      meta_title?: string;
      meta_description?: string;
      meta_keywords?: string;
    }>
  ): Promise<ApiResponse<{
    created: number;
    updated: number;
    errors: Array<{ language_id: number; error: string }>;
  }>> {
    return this.apiClient.put<ApiResponse<{
      created: number;
      updated: number;
      errors: Array<{ language_id: number; error: string }>;
    }>>(
      `${this.baseEndpoint}/${categoryId}/translations/bulk`,
      { translations }
    );
  }
}

// Create a default instance
export const categoryService = new CategoryService();

// Export a function to create an instance with a specific client
export const createCategoryService = (apiClient?: ApiClient) => new CategoryService(apiClient);
