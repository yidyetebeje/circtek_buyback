/**
 * AI Translation Service
 * Handles AI-powered translation generation using Google Gemini API
 */

import { ApiClient, createApiClient } from '../base';

export type TranslatableEntity = 'category' | 'brand' | 'model_series' | 'model' | 'question_set' | 'component_config' | 'faq';

export interface TranslationRequestData {
  title: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  specifications?: Record<string, unknown>;
  // For question sets - hierarchical structure
  questions?: Array<{
    id?: number;
    title: string;
    tooltip?: string;
    category?: string;
    options?: Array<{
      id?: number;
      title: string;
    }>;
  }>;
  // For component configurations
  componentType?: 'hero' | 'categories' | 'header' | 'footer' | 'globalEarth';
  componentTexts?: Record<string, string>; // Key-value pairs of text fields
}

// New interface specifically for component configuration translation
export interface ComponentTranslationRequest {
  componentType: 'hero' | 'categories' | 'header' | 'footer' | 'globalEarth';
  sourceLanguageCode: string;
  targetLanguageCode: string;
  texts: Record<string, string>; // Key-value pairs of text fields to translate
}

export interface ComponentTranslationResponse {
  translatedTexts: Record<string, string>; // Key-value pairs of translated text fields
}

export interface ComponentTranslationApiResponse {
  success: boolean;
  data?: ComponentTranslationResponse;
  error?: string;
}

export interface AITranslationRequest {
  entityType: TranslatableEntity;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  data: TranslationRequestData;
}

export interface AIBulkTranslationRequest {
  entityType: TranslatableEntity;
  sourceLanguageCode: string;
  targetLanguageCodes: string[];
  data: TranslationRequestData;
}

export interface AITranslationResponse {
  title: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  specifications?: Record<string, unknown>;
  // For question sets - hierarchical structure
  questions?: Array<{
    id?: number;
    title: string;
    tooltip?: string;
    category?: string;
    options?: Array<{
      id?: number;
      title: string;
    }>;
  }>;
}

export interface AITranslationApiResponse {
  success: boolean;
  data?: AITranslationResponse;
  error?: string;
}

export interface AIBulkTranslationApiResponse {
  success: boolean;
  data?: Record<string, AITranslationResponse>;
  errors?: Record<string, string>;
  error?: string;
}

export interface AIHealthCheckResponse {
  success: boolean;
  status: string;
  timestamp: string;
}

export class AITranslationService {
  private apiClient: ApiClient;
  private baseEndpoint = '/catalog/ai-translation';

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  /**
   * Generate AI translation for a single target language
   */
  async generateTranslation(request: AITranslationRequest): Promise<AITranslationApiResponse> {
    return this.apiClient.post<AITranslationApiResponse>(
      `${this.baseEndpoint}/generate`,
      request
    );
  }

  /**
   * Generate AI translations for multiple target languages
   */
  async generateBulkTranslations(request: AIBulkTranslationRequest): Promise<AIBulkTranslationApiResponse> {
    return this.apiClient.post<AIBulkTranslationApiResponse>(
      `${this.baseEndpoint}/bulk-generate`,
      request
    );
  }

  /**
   * Check AI translation service health
   */
  async healthCheck(): Promise<AIHealthCheckResponse> {
    return this.apiClient.get<AIHealthCheckResponse>(`${this.baseEndpoint}/health`);
  }

  /**
   * Helper method to generate translation for a single language with simplified parameters
   */
  async generateSingleTranslation(
    entityType: TranslatableEntity,
    sourceLanguage: string,
    targetLanguage: string,
    data: TranslationRequestData
  ): Promise<AITranslationResponse | null> {
    try {
      const response = await this.generateTranslation({
        entityType,
        sourceLanguageCode: sourceLanguage,
        targetLanguageCode: targetLanguage,
        data
      });

      if (response.success && response.data) {
        return response.data;
      }

      console.error('AI Translation failed:', response.error);
      return null;
    } catch (error) {
      console.error('AI Translation error:', error);
      return null;
    }
  }

  /**
   * Helper method to generate translations for multiple languages with simplified parameters
   */
  async generateMultipleTranslations(
    entityType: TranslatableEntity,
    sourceLanguage: string,
    targetLanguages: string[],
    data: TranslationRequestData
  ): Promise<Record<string, AITranslationResponse>> {
    try {
      const response = await this.generateBulkTranslations({
        entityType,
        sourceLanguageCode: sourceLanguage,
        targetLanguageCodes: targetLanguages,
        data
      });

      if (response.success && response.data) {
        return response.data;
      }

      console.error('AI Bulk Translation failed:', response.error);
      return {};
    } catch (error) {
      console.error('AI Bulk Translation error:', error);
      return {};
    }
  }

  /**
   * Generate translation and format it for the TranslationManager component
   */
  async generateTranslationForManager(
    entityType: TranslatableEntity,
    sourceLanguage: string,
    targetLanguage: string,
    formData: {
      title: string;
      description?: string;
      meta_title?: string;
      meta_description?: string;
      meta_keywords?: string;
      specifications?: string; // JSON string from form
    }
  ): Promise<{
    title: string;
    description?: string;
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    specifications?: string; // JSON string for form
  } | null> {
    try {
      const requestData: TranslationRequestData = {
        title: formData.title,
        description: formData.description,
        meta_title: formData.meta_title,
        meta_description: formData.meta_description,
        meta_keywords: formData.meta_keywords,
      };

      // Parse specifications if it's a JSON string
      if (formData.specifications) {
        try {
          requestData.specifications = JSON.parse(formData.specifications);
        } catch (e) {
          console.warn('Failed to parse specifications JSON:', e);
        }
      }

      const translation = await this.generateSingleTranslation(
        entityType,
        sourceLanguage,
        targetLanguage,
        requestData
      );

      if (!translation) {
        return null;
      }

      // Format response for the form
      return {
        title: translation.title,
        description: translation.description,
        meta_title: translation.meta_title,
        meta_description: translation.meta_description,
        meta_keywords: translation.meta_keywords,
        specifications: translation.specifications ?
          JSON.stringify(translation.specifications, null, 2) : undefined,
      };
    } catch (error) {
      console.error('Translation generation failed:', error);
      return null;
    }
  }

  /**
   * Generate AI translation for component configurations
   */
  async generateComponentTranslation(request: ComponentTranslationRequest): Promise<ComponentTranslationApiResponse> {
    return this.apiClient.post<ComponentTranslationApiResponse>(
      `${this.baseEndpoint}/component`,
      request
    );
  }

  /**
   * Helper method to generate component translation with simplified parameters
   */
  async generateComponentTexts(
    componentType: 'hero' | 'categories' | 'header' | 'footer' | 'globalEarth',
    sourceLanguage: string,
    targetLanguage: string,
    texts: Record<string, string>
  ): Promise<Record<string, string> | null> {
    try {
      const response = await this.generateComponentTranslation({
        componentType,
        sourceLanguageCode: sourceLanguage,
        targetLanguageCode: targetLanguage,
        texts
      });

      if (response.success && response.data) {
        return response.data.translatedTexts;
      }

      console.error('Component translation failed:', response.error);
      return null;
    } catch (error) {
      console.error('Component translation error:', error);
      return null;
    }
  }

  /**
   * Generate translations for CategoryTextConfig using AI
   */
  async generateCategoryTextTranslations(
    sourceLanguage: string,
    targetLanguage: string,
    categoryTexts: Record<string, string>
  ): Promise<Record<string, string> | null> {
    return this.generateComponentTexts('categories', sourceLanguage, targetLanguage, categoryTexts);
  }
}

// Create a default instance
export const aiTranslationService = new AITranslationService();

// Export a function to create an instance with a specific client
export const createAITranslationService = (apiClient?: ApiClient) => new AITranslationService(apiClient); 