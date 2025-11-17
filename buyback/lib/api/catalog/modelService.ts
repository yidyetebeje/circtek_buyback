/**
 * Model Service
 * Handles all API operations related to device models
 */

import { ApiClient, createApiClient } from '../base';
import { ApiResponse, PaginatedResponse, QueryParams, CreateWithTranslationsRequest, UpdateWithTranslationsRequest, BulkUpsertResponse } from '../types';
import { Model, ModelTranslation } from '@/types/catalog';

export class ModelService {
  private apiClient: ApiClient;
  private baseEndpoint = '/catalog/models';

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  /**
   * Get a paginated list of all models
   */
  async getModels(params?: QueryParams & { 
    category_id?: number | number[];
    brand_id?: number | number[];
    series_id?: number | number[];
  }): Promise<PaginatedResponse<Model>> {
    return this.apiClient.get<PaginatedResponse<Model>>(this.baseEndpoint, { params });
  }

  /**
   * Get a model by ID
   */
  async getModelById(id: number): Promise<ApiResponse<Model>> {
    return this.apiClient.get<ApiResponse<Model>>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Get a model by slug and client ID
   */
  async getModelBySlug(slug: string, tenantId: number): Promise<ApiResponse<Model>> {
    return this.apiClient.get<ApiResponse<Model>>(`${this.baseEndpoint}/slug/${slug}/client/${tenantId}`);
  }

  /**
   * Get models by category ID
   */
  async getModelsByCategoryId(categoryId: number, params?: QueryParams): Promise<PaginatedResponse<Model>> {
    return this.apiClient.get<PaginatedResponse<Model>>(`${this.baseEndpoint}/category/${categoryId}`, { params });
  }

  /**
   * Get models by brand ID
   */
  async getModelsByBrandId(brandId: number, params?: QueryParams): Promise<PaginatedResponse<Model>> {
    return this.apiClient.get<PaginatedResponse<Model>>(`${this.baseEndpoint}/brand/${brandId}`, { params });
  }

  /**
   * Get models by series ID
   */
  async getModelsBySeriesId(seriesId: number, params?: QueryParams): Promise<PaginatedResponse<Model>> {
    return this.apiClient.get<PaginatedResponse<Model>>(`${this.baseEndpoint}/series/${seriesId}`, { params });
  }

  /**
   * Create a new model
   */
  async createModel(model: Model): Promise<ApiResponse<Model>> {
    return this.apiClient.post<ApiResponse<Model>>(this.baseEndpoint, model);
  }

  /**
   * Update a model
   */
  async updateModel(id: number, model: Partial<Model>): Promise<ApiResponse<Model>> {
    return this.apiClient.put<ApiResponse<Model>>(`${this.baseEndpoint}/${id}`, model);
  }

  /**
   * Delete a model
   */
  async deleteModel(id: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Get all translations for a model
   */
  async getModelTranslations(modelId: number): Promise<ApiResponse<ModelTranslation[]>> {
    return this.apiClient.get<ApiResponse<ModelTranslation[]>>(`${this.baseEndpoint}/${modelId}/translations`);
  }

  /**
   * Create a new translation for a model
   */
  async createModelTranslation(translation: ModelTranslation): Promise<ApiResponse<ModelTranslation>> {
    return this.apiClient.post<ApiResponse<ModelTranslation>>(
      `${this.baseEndpoint}/${translation.model_id}/translations`, 
      translation
    );
  }

  /**
   * Update a model translation
   */
  async updateModelTranslation(
    modelId: number, 
    languageId: number, 
    translation: Partial<Omit<ModelTranslation, 'model_id' | 'language_id'>>
  ): Promise<ApiResponse<ModelTranslation>> {
    return this.apiClient.put<ApiResponse<ModelTranslation>>(
      `${this.baseEndpoint}/${modelId}/translations/${languageId}`, 
      translation
    );
  }

  /**
   * Upsert (create or update) a model translation
   */
  async upsertModelTranslation(
    modelId: number, 
    languageId: number, 
    translation: Omit<ModelTranslation, 'model_id' | 'language_id'>
  ): Promise<ApiResponse<ModelTranslation>> {
    return this.apiClient.put<ApiResponse<ModelTranslation>>(
      `${this.baseEndpoint}/${modelId}/translations/${languageId}/upsert`, 
      translation
    );
  }

  /**
   * Upsert a batch of model translations
   */
  async upsertBulkModelTranslations(
    modelId: number,
    translations: Partial<ModelTranslation>[]
  ): Promise<ApiResponse<BulkUpsertResponse>> {
    return this.apiClient.post(
      `${this.baseEndpoint}/${modelId}/translations/bulk-upsert`,
      { translations }
    );
  }

  /**
   * Delete a model translation
   */
  async deleteModelTranslation(modelId: number, languageId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(
      `${this.baseEndpoint}/${modelId}/translations/${languageId}`
    );
  }

  /**
   * Create a new model with translations in one request
   */
  async createModelWithTranslations(
    model: Model,
    translations: ModelTranslation[]
  ): Promise<ApiResponse<Model>> {
    const data: CreateWithTranslationsRequest<Model, ModelTranslation> = {
      entity: model,
      translations
    };
    return this.apiClient.post<ApiResponse<Model>>(`${this.baseEndpoint}/with-translations`, data);
  }

  /**
   * Update a model with translations in one request
   */
  async updateModelWithTranslations(
    modelId: number,
    model: Partial<Model>,
    translations: ModelTranslation[]
  ): Promise<ApiResponse<Model>> {
    const data: UpdateWithTranslationsRequest<Model, ModelTranslation> = {
      entity: model,
      translations
    };
    return this.apiClient.put<ApiResponse<Model>>(`${this.baseEndpoint}/${modelId}/with-translations`, data);
  }

  /**
   * Upload a model image
   */
  async uploadModelImage(modelId: number, file: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.apiClient.post<{ imageUrl: string }>(
      `${this.baseEndpoint}/${modelId}/image`,
      formData
    );
  }
}

// Create a default instance
export const modelService = new ModelService();

// Export a function to create an instance with a specific client
export const createModelService = (apiClient?: ApiClient) => new ModelService(apiClient);
