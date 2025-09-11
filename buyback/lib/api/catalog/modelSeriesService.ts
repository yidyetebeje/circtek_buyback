/**
 * Model Series Service
 * Handles all API operations related to model series
 */

import { ApiClient, createApiClient } from '../base';
import { ApiResponse, PaginatedResponse, QueryParams, CreateWithTranslationsRequest, UpdateWithTranslationsRequest, BulkUpsertResponse } from '../types';
import { ModelSeries, ModelSeriesTranslation } from '@/types/catalog';

export class ModelSeriesService {
  private apiClient: ApiClient;
  private baseEndpoint = '/catalog/model-series';

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  /**
   * Get a paginated list of all model series
   */
  async getModelSeries(params?: QueryParams & { brand_id?: number }): Promise<PaginatedResponse<ModelSeries>> {
    return this.apiClient.get<PaginatedResponse<ModelSeries>>(this.baseEndpoint, { params });
  }

  /**
   * Get a model series by ID
   */
  async getModelSeriesById(id: number): Promise<ApiResponse<ModelSeries>> {
    return this.apiClient.get<ApiResponse<ModelSeries>>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Get a model series by slug and client ID
   */
  async getModelSeriesBySlug(slug: string, clientId: number): Promise<ApiResponse<ModelSeries>> {
    return this.apiClient.get<ApiResponse<ModelSeries>>(`${this.baseEndpoint}/slug/${slug}/client/${clientId}`);
  }

  /**
   * Get model series by brand ID
   */
  async getModelSeriesByBrandId(brandId: number, params?: QueryParams): Promise<PaginatedResponse<ModelSeries>> {
    return this.apiClient.get<PaginatedResponse<ModelSeries>>(`${this.baseEndpoint}/brand/${brandId}`, { params });
  }

  /**
   * Create a new model series
   */
  async createModelSeries(modelSeries: ModelSeries): Promise<ApiResponse<ModelSeries>> {
    return this.apiClient.post<ApiResponse<ModelSeries>>(this.baseEndpoint, modelSeries);
  }

  /**
   * Update a model series
   */
  async updateModelSeries(id: number, modelSeries: Partial<ModelSeries>): Promise<ApiResponse<ModelSeries>> {
    return this.apiClient.put<ApiResponse<ModelSeries>>(`${this.baseEndpoint}/${id}`, modelSeries);
  }

  /**
   * Delete a model series
   */
  async deleteModelSeries(id: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Get all translations for a model series
   */
  async getModelSeriesTranslations(modelSeriesId: number): Promise<ApiResponse<ModelSeriesTranslation[]>> {
    return this.apiClient.get<ApiResponse<ModelSeriesTranslation[]>>(`${this.baseEndpoint}/${modelSeriesId}/translations`);
  }

  /**
   * Create a new translation for a model series
   */
  async createModelSeriesTranslation(translation: ModelSeriesTranslation): Promise<ApiResponse<ModelSeriesTranslation>> {
    return this.apiClient.post<ApiResponse<ModelSeriesTranslation>>(
      `${this.baseEndpoint}/${translation.model_series_id}/translations`, 
      translation
    );
  }

  /**
   * Update a model series translation
   */
  async updateModelSeriesTranslation(
    modelSeriesId: number, 
    languageId: number, 
    translation: Partial<Omit<ModelSeriesTranslation, 'model_series_id' | 'language_id'>>
  ): Promise<ApiResponse<ModelSeriesTranslation>> {
    return this.apiClient.put<ApiResponse<ModelSeriesTranslation>>(
      `${this.baseEndpoint}/${modelSeriesId}/translations/${languageId}`, 
      translation
    );
  }

  /**
   * Delete a model series translation
   */
  async deleteModelSeriesTranslation(modelSeriesId: number, languageId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(
      `${this.baseEndpoint}/${modelSeriesId}/translations/${languageId}`
    );
  }

  /**
   * Upsert (create or update) a model series translation
   */
  async upsertModelSeriesTranslation(
    modelSeriesId: number, 
    languageId: number, 
    translation: Omit<ModelSeriesTranslation, 'model_series_id' | 'language_id'>
  ): Promise<ApiResponse<ModelSeriesTranslation>> {
    return this.apiClient.put<ApiResponse<ModelSeriesTranslation>>(
      `${this.baseEndpoint}/${modelSeriesId}/translations/${languageId}/upsert`, 
      translation
    );
  }

  /**
   * Upsert a batch of model series translations
   */
  async upsertBulkModelSeriesTranslations(
    modelSeriesId: number,
    translations: Partial<ModelSeriesTranslation>[]
  ): Promise<ApiResponse<BulkUpsertResponse>> {
    return this.apiClient.post(
      `${this.baseEndpoint}/${modelSeriesId}/translations/bulk-upsert`,
      { translations }
    );
  }

  /**
   * Create a new model series with translations in one request
   */
  async createModelSeriesWithTranslations(
    modelSeries: ModelSeries,
    translations: ModelSeriesTranslation[]
  ): Promise<ApiResponse<ModelSeries>> {
    const data: CreateWithTranslationsRequest<ModelSeries, ModelSeriesTranslation> = {
      entity: modelSeries,
      translations
    };
    return this.apiClient.post<ApiResponse<ModelSeries>>(`${this.baseEndpoint}/with-translations`, data);
  }

  /**
   * Update a model series with translations in one request
   */
  async updateModelSeriesWithTranslations(
    modelSeriesId: number,
    modelSeries: Partial<ModelSeries>,
    translations: ModelSeriesTranslation[]
  ): Promise<ApiResponse<ModelSeries>> {
    const data: UpdateWithTranslationsRequest<ModelSeries, ModelSeriesTranslation> = {
      entity: modelSeries,
      translations
    };
    return this.apiClient.put<ApiResponse<ModelSeries>>(`${this.baseEndpoint}/${modelSeriesId}/with-translations`, data);
  }

  /**
   * Upload a model series image
   */
  async uploadModelSeriesImage(modelSeriesId: number, file: File): Promise<ApiResponse<{ image_url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.apiClient.post<ApiResponse<{ image_url: string }>>(
      `${this.baseEndpoint}/${modelSeriesId}/image`,
      formData
    );
  }
}

// Create a default instance
export const modelSeriesService = new ModelSeriesService();

// Export a function to create an instance with a specific client
export const createModelSeriesService = (apiClient?: ApiClient) => new ModelSeriesService(apiClient);
