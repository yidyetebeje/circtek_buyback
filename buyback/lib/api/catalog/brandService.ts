/**
 * Brand Service
 * Handles all API operations related to brands
 */

import { ApiClient, createApiClient } from '../base';
import { ApiResponse, PaginatedResponse, QueryParams, CreateWithTranslationsRequest, UpdateWithTranslationsRequest } from '../types';
import { Brand, BrandTranslation } from '@/types/catalog';

export class BrandService {
  private apiClient: ApiClient;
  private baseEndpoint = '/catalog/brands';

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  /**
   * Get a paginated list of all brands
   */
  async getBrands(params?: QueryParams): Promise<PaginatedResponse<Brand>> {
    // Cast params to 'any' to satisfy apiClient's stricter param type expectation
    return this.apiClient.get<PaginatedResponse<Brand>>(this.baseEndpoint, { params: params });
  }

  /**
   * Get a brand by ID
   */
  async getBrandById(id: number): Promise<ApiResponse<Brand>> {
    return this.apiClient.get<ApiResponse<Brand>>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Get a brand by slug and client ID
   */
  async getBrandBySlug(slug: string, clientId: number): Promise<ApiResponse<Brand>> {
    return this.apiClient.get<ApiResponse<Brand>>(`${this.baseEndpoint}/slug/${slug}/client/${clientId}`);
  }

  /**
   * Create a new brand
   */
  async createBrand(brand: Brand): Promise<ApiResponse<Brand>> {
    return this.apiClient.post<ApiResponse<Brand>>(this.baseEndpoint, brand);
  }

  /**
   * Update a brand
   */
  async updateBrand(id: number, brand: Partial<Brand>): Promise<ApiResponse<Brand>> {
    return this.apiClient.put<ApiResponse<Brand>>(`${this.baseEndpoint}/${id}`, brand);
  }

  /**
   * Delete a brand
   */
  async deleteBrand(id: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Get all translations for a brand
   */
  async getBrandTranslations(brandId: number): Promise<ApiResponse<BrandTranslation[]>> {
    return this.apiClient.get<ApiResponse<BrandTranslation[]>>(`${this.baseEndpoint}/${brandId}/translations`);
  }

  /**
   * Create a new translation for a brand
   */
  async createBrandTranslation(translation: BrandTranslation): Promise<ApiResponse<BrandTranslation>> {
    return this.apiClient.post<ApiResponse<BrandTranslation>>(
      `${this.baseEndpoint}/${translation.brand_id}/translations`, 
      translation
    );
  }

  /**
   * Update a brand translation
   */
  async updateBrandTranslation(
    brandId: number, 
    languageId: number, 
    translation: Partial<Omit<BrandTranslation, 'brand_id' | 'language_id'>>
  ): Promise<ApiResponse<BrandTranslation>> {
    return this.apiClient.put<ApiResponse<BrandTranslation>>(
      `${this.baseEndpoint}/${brandId}/translations/${languageId}`, 
      translation
    );
  }

  /**
   * Delete a brand translation
   */
  async deleteBrandTranslation(brandId: number, languageId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(
      `${this.baseEndpoint}/${brandId}/translations/${languageId}`
    );
  }

  /**
   * Upsert (create or update) a brand translation
   */
  async upsertBrandTranslation(
    brandId: number, 
    languageId: number, 
    translation: Omit<BrandTranslation, 'brand_id' | 'language_id'>
  ): Promise<ApiResponse<BrandTranslation>> {
    return this.apiClient.put<ApiResponse<BrandTranslation>>(
      `${this.baseEndpoint}/${brandId}/translations/${languageId}/upsert`, 
      translation
    );
  }

  /**
   * Bulk upsert (create or update) multiple brand translations
   */
  async bulkUpsertBrandTranslations(
    brandId: number,
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
      `${this.baseEndpoint}/${brandId}/translations/bulk`,
      { translations }
    );
  }

  /**
   * Create a new brand with translations in one request
   */
  async createBrandWithTranslations(
    brand: Brand,
    translations: BrandTranslation[]
  ): Promise<ApiResponse<Brand>> {
    const data: CreateWithTranslationsRequest<Brand, BrandTranslation> = {
      entity: brand,
      translations
    };
    return this.apiClient.post<ApiResponse<Brand>>(`${this.baseEndpoint}/with-translations`, data);
  }

  /**
   * Update a brand with translations in one request
   */
  async updateBrandWithTranslations(
    brandId: number,
    brand: Partial<Brand>,
    translations: BrandTranslation[]
  ): Promise<ApiResponse<Brand>> {
    const data: UpdateWithTranslationsRequest<Brand, BrandTranslation> = {
      entity: brand,
      translations
    };
    return this.apiClient.put<ApiResponse<Brand>>(`${this.baseEndpoint}/${brandId}/with-translations`, data);
  }

  /**
   * Upload a brand logo
   */
  async uploadBrandLogo(brandId: number, file: File): Promise<ApiResponse<{ iconUrl: string }>> {
    const formData = new FormData();
   
    formData.append('file', file);
    
    return this.apiClient.post<ApiResponse<{ iconUrl: string }>>(
      `${this.baseEndpoint}/${brandId}/icon`,
      formData,
    );
  }
}

// Create a default instance
export const brandService = new BrandService();

// Export a function to create an instance with a specific client
export const createBrandService = (apiClient?: ApiClient) => new BrandService(apiClient);
