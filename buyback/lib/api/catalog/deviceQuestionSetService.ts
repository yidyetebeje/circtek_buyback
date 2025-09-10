/**
 * Device Question Set Service
 * Handles all API operations related to device question sets
 */

import { ApiClient, createApiClient } from '../base';
import { ApiResponse, PaginatedResponse, QueryParams } from '../types';
import { QuestionSet, QuestionSetTranslation, DeviceModelQuestionSetAssignment, IndividualQuestion, QuestionInputType, QuestionOption } from '@/types/catalog/device-questions';
import { Model } from '@/types/catalog'; // Assuming Model type for assignment responses

// Translation response types
export interface QuestionTranslation {
  id: number;
  questionId: number;
  languageId: number;
  title: string;
  tooltip?: string;
  category?: string;
}

export interface OptionTranslation {
  id: number;
  optionId: number;
  languageId: number;
  title: string;
}

// Type for the comprehensive translation response from the API
export interface ComprehensiveTranslationResponse {
  languageId: number;
  questionSetId: number;
  displayName: string;
  description?: string;
  questions: Array<{
    id: number;
    title: string;
    tooltip?: string;
    category?: string;
    options: Array<{
      id: number;
      title: string;
    }>;
  }>;
}

// Payload for creating a QuestionSet as per API docs
export interface CreateQuestionSetPayload {
  internalName: string;
  displayName: string;
  description?: string;
  tenant_id: number;
  questions?: Omit<IndividualQuestion, 'id' | 'questionSetId' | 'createdAt' | 'updatedAt'>[]; // For createWithQuestions
}

// Payload for updating a QuestionSet - Modified to include questions
export type QuestionOptionForUpdatePayload = Partial<Omit<QuestionOption, 'questionId' | 'createdAt' | 'updatedAt' | 'translations' | 'key' | 'icon' | 'metadata'>> & {
  id?: number;
  title: string;
  priceModifier?: number | null; // Allow null explicitly
};

export type QuestionForUpdatePayload = Partial<Omit<IndividualQuestion, 'questionSetId' | 'createdAt' | 'updatedAt' | 'translations' | 'options' | 'key' | 'tooltip' | 'category' | 'metadata'>> & {
  id?: number; // Must be present for existing, absent for new/to be created
  title: string; // Assuming title is always required
  inputType: QuestionInputType; // Assuming inputType is always required
  isRequired: boolean; // Assuming isRequired is always required
  options: QuestionOptionForUpdatePayload[];
};

export interface UpdateQuestionSetPayload {
  internalName?: string; // Retaining, as per existing definition, though typically not changed often post-creation
  displayName?: string;
  description?: string;
  // tenant_id?: number; // Usually not updatable or handled with care - omitting as it wasn't in the original UpdateQuestionSetPayload
  questions?: QuestionForUpdatePayload[]; // Array of questions to be created/updated/deleted
}

// Payload for creating a QuestionSetTranslation
export interface CreateQuestionSetTranslationPayload {
  languageId: number;
  displayName: string;
  description?: string;
}

// Payload for updating a QuestionSetTranslation
export interface UpdateQuestionSetTranslationPayload {
  displayName?: string;
  description?: string;
}

// Payload for creating a QuestionTranslation
export interface CreateQuestionTranslationPayload {
  languageId: number;
  title: string;
  tooltip?: string;
  category?: string;
}

// Payload for updating a QuestionTranslation
export interface UpdateQuestionTranslationPayload {
  title?: string;
  tooltip?: string;
  category?: string;
}

// Payload for creating an OptionTranslation
export interface CreateOptionTranslationPayload {
  languageId: number;
  title: string;
}

// Payload for updating an OptionTranslation
export interface UpdateOptionTranslationPayload {
  title?: string;
}

// Payload for assigning a QuestionSet to a Model
export interface AssignQuestionSetToModelPayload {
  modelId: number;
  questionSetId: number;
  assignmentOrder?: number;
}

export class DeviceQuestionSetService {
  private apiClient: ApiClient;
  private baseEndpoint = '/api/catalog/question-sets'; // Updated base endpoint

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  // 1. Get All Question Sets
  async getQuestionSets(params?: QueryParams & { search?: string }): Promise<PaginatedResponse<QuestionSet>> {
    // API returns { data: [...], meta: {...} }, PaginatedResponse expects this.
    return this.apiClient.get<PaginatedResponse<QuestionSet>>(this.baseEndpoint, { params });
  }

  // 2. Get Question Set by ID
  async getQuestionSetById(questionSetId: number): Promise<ApiResponse<QuestionSet>> {
    // API returns { success: true, data: {...} }
    return this.apiClient.get<ApiResponse<QuestionSet>>(`${this.baseEndpoint}/${questionSetId}`);
  }

  // 3. Get Question Set by Internal Name and Tenant ID
  async getQuestionSetByInternalNameAndTenantId(internalName: string, tenantId: number): Promise<ApiResponse<QuestionSet>> {
    return this.apiClient.get<ApiResponse<QuestionSet>>(`${this.baseEndpoint}/by-name/${internalName}/tenant/${tenantId}`);
  }

  // 4. Create New Question Set
  async createQuestionSet(payload: CreateQuestionSetPayload): Promise<ApiResponse<QuestionSet>> {
    return this.apiClient.post<ApiResponse<QuestionSet>>(this.baseEndpoint, payload);
  }

  // 5. Update Question Set
  async updateQuestionSet(questionSetId: number, payload: UpdateQuestionSetPayload): Promise<ApiResponse<QuestionSet>> {
    return this.apiClient.put<ApiResponse<QuestionSet>>(`${this.baseEndpoint}/${questionSetId}`, payload);
  }

  // 6. Delete Question Set
  async deleteQuestionSet(questionSetId: number): Promise<ApiResponse<{ success: boolean }>> {
    // API returns { success: true, message: "..." }
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(`${this.baseEndpoint}/${questionSetId}`);
  }
  
  // 7. Create Question Set with Questions (Simplified version of API's "with-questions")
  // For now, this might just be a wrapper around createQuestionSet if complex nesting isn't handled yet.
  // Or it uses a different endpoint as per API doc /with-questions
  async createQuestionSetWithQuestions(payload: CreateQuestionSetPayload): Promise<ApiResponse<QuestionSet>> {
    // Assuming CreateQuestionSetPayload now can include basic questions structure
    return this.apiClient.post<ApiResponse<QuestionSet>>(`${this.baseEndpoint}/with-questions`, payload);
  }

  // --- Question Set Translations ---
  // 9. Get Translations by Question Set
  async getQuestionSetTranslations(questionSetId: number): Promise<ApiResponse<ComprehensiveTranslationResponse[]>> {
    return this.apiClient.get<ApiResponse<ComprehensiveTranslationResponse[]>>(`${this.baseEndpoint}/${questionSetId}/translations`);
  }

  // 10. Create Question Set Translation
  async createQuestionSetTranslation(questionSetId: number, payload: CreateQuestionSetTranslationPayload): Promise<ApiResponse<QuestionSetTranslation>> {
    return this.apiClient.post<ApiResponse<QuestionSetTranslation>>(`${this.baseEndpoint}/${questionSetId}/translations`, payload);
  }

  // 11. Update Question Set Translation
  async updateQuestionSetTranslation(questionSetId: number, languageId: number, payload: UpdateQuestionSetTranslationPayload): Promise<ApiResponse<QuestionSetTranslation>> {
    return this.apiClient.put<ApiResponse<QuestionSetTranslation>>(`${this.baseEndpoint}/${questionSetId}/translations/${languageId}`, payload);
  }

  // 12. Delete Question Set Translation
  async deleteQuestionSetTranslation(questionSetId: number, languageId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(`${this.baseEndpoint}/${questionSetId}/translations/${languageId}`);
  }

  // --- Question Translations ---
  // Get question translations
  async getQuestionTranslations(questionId: number): Promise<ApiResponse<QuestionTranslation[]>> {
    return this.apiClient.get<ApiResponse<QuestionTranslation[]>>(`${this.baseEndpoint}/questions/${questionId}/translations`);
  }

  // Create question translation
  async createQuestionTranslation(questionId: number, payload: CreateQuestionTranslationPayload): Promise<ApiResponse<QuestionTranslation>> {
    return this.apiClient.post<ApiResponse<QuestionTranslation>>(`${this.baseEndpoint}/questions/${questionId}/translations`, payload);
  }

  // Update question translation
  async updateQuestionTranslation(questionId: number, languageId: number, payload: UpdateQuestionTranslationPayload): Promise<ApiResponse<QuestionTranslation>> {
    return this.apiClient.put<ApiResponse<QuestionTranslation>>(`${this.baseEndpoint}/questions/${questionId}/translations/${languageId}`, payload);
  }

  // Delete question translation
  async deleteQuestionTranslation(questionId: number, languageId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(`${this.baseEndpoint}/questions/${questionId}/translations/${languageId}`);
  }

  // --- Option Translations ---
  // Get option translations
  async getOptionTranslations(optionId: number): Promise<ApiResponse<OptionTranslation[]>> {
    return this.apiClient.get<ApiResponse<OptionTranslation[]>>(`${this.baseEndpoint}/options/${optionId}/translations`);
  }

  // Create option translation
  async createOptionTranslation(optionId: number, payload: CreateOptionTranslationPayload): Promise<ApiResponse<OptionTranslation>> {
    return this.apiClient.post<ApiResponse<OptionTranslation>>(`${this.baseEndpoint}/options/${optionId}/translations`, payload);
  }

  // Update option translation
  async updateOptionTranslation(optionId: number, languageId: number, payload: UpdateOptionTranslationPayload): Promise<ApiResponse<OptionTranslation>> {
    return this.apiClient.put<ApiResponse<OptionTranslation>>(`${this.baseEndpoint}/options/${optionId}/translations/${languageId}`, payload);
  }

  // Delete option translation
  async deleteOptionTranslation(optionId: number, languageId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(`${this.baseEndpoint}/options/${optionId}/translations/${languageId}`);
  }

  // --- Question Set Assignments ---
  // 13. Get Question Sets for a Model
  async getQuestionSetsForModel(modelId: number): Promise<ApiResponse<QuestionSet[]>> {
    return this.apiClient.get<ApiResponse<QuestionSet[]>>(`${this.baseEndpoint}/for-model/${modelId}`);
  }
  
  // 14. Get Models for a Question Set
  async getModelsForQuestionSet(questionSetId: number, params?: QueryParams): Promise<PaginatedResponse<Model>> {
    return this.apiClient.get<PaginatedResponse<Model>>(`${this.baseEndpoint}/${questionSetId}/models`, { params });
  }

  // 15. Assign Question Set to Model
  async assignQuestionSetToModel(payload: AssignQuestionSetToModelPayload): Promise<ApiResponse<DeviceModelQuestionSetAssignment>> {
    return this.apiClient.post<ApiResponse<DeviceModelQuestionSetAssignment>>(`${this.baseEndpoint}/assign-to-model`, payload);
  }

  // 18. Delete Assignment by Assignment ID (or 19 by modelId/questionSetId)
  // Choosing by modelId and questionSetId as it might be more common from UI perspective if assignment ID isn't readily available.
  async deleteAssignment(modelId: number, questionSetId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(`${this.baseEndpoint}/assignments/model/${modelId}/question-set/${questionSetId}`);
  }
  
  // updateAssignmentOrder methods would go here if implemented
}

export const deviceQuestionSetService = new DeviceQuestionSetService();

export const createDeviceQuestionSetService = (apiClient?: ApiClient) => new DeviceQuestionSetService(apiClient); 