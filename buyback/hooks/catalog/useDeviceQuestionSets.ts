'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  deviceQuestionSetService,
  CreateQuestionSetPayload,
  UpdateQuestionSetPayload,
  CreateQuestionSetTranslationPayload,
  UpdateQuestionSetTranslationPayload,
  AssignQuestionSetToModelPayload
} from '@/lib/api/catalog/deviceQuestionSetService';
import { QuestionSet, QuestionSetTranslation, DeviceModelQuestionSetAssignment } from '@/types/catalog/device-questions';
import { QueryParams, ApiResponse, PaginatedResponse } from '@/lib/api/types';
import { Model } from '@/types/catalog';

// Type for the comprehensive translation response from the API
interface ComprehensiveTranslationResponse {
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

export const USE_DEVICE_QUESTION_SETS_QUERY_KEY = 'deviceQuestionSets';
export const USE_DEVICE_QUESTION_SET_QUERY_KEY = 'deviceQuestionSet';
export const USE_DEVICE_QUESTION_SET_TRANSLATIONS_QUERY_KEY = 'deviceQuestionSetTranslations';
export const USE_MODELS_FOR_QUESTION_SET_QUERY_KEY = 'modelsForQuestionSet';
export const USE_QUESTION_SETS_FOR_MODEL_QUERY_KEY = 'questionSetsForModel';

/**
 * Hook for retrieving a paginated list of device question sets
 */
export const useDeviceQuestionSets = (params?: QueryParams & { tenantId?: number; search?: string }) => {
  return useQuery<PaginatedResponse<QuestionSet>, Error>({
    queryKey: [USE_DEVICE_QUESTION_SETS_QUERY_KEY, params],
    queryFn: () => deviceQuestionSetService.getQuestionSets(params),
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for retrieving a single device question set by ID
 */
export const useDeviceQuestionSet = (questionSetId: number | undefined) => {
  return useQuery<ApiResponse<QuestionSet>, Error>({
    queryKey: [USE_DEVICE_QUESTION_SET_QUERY_KEY, questionSetId],
    queryFn: () => deviceQuestionSetService.getQuestionSetById(questionSetId!),
    enabled: !!questionSetId,
  });
};

/**
 * Hook for retrieving a single device question set by internal name and tenant ID
 */
export const useDeviceQuestionSetByInternalName = (internalName: string | undefined, tenantId: number | undefined) => {
  return useQuery<ApiResponse<QuestionSet>, Error>({
    queryKey: [USE_DEVICE_QUESTION_SET_QUERY_KEY, 'byInternalName', internalName, tenantId],
    queryFn: () => deviceQuestionSetService.getQuestionSetByInternalNameAndTenantId(internalName!, tenantId!),
    enabled: !!internalName && !!tenantId,
  });
};

/**
 * Hook for creating a new device question set
 */
export const useCreateDeviceQuestionSet = () => {
  const queryClient = useQueryClient();
  
  return useMutation<ApiResponse<QuestionSet>, Error, CreateQuestionSetPayload>({
    mutationFn: (payload) => deviceQuestionSetService.createQuestionSet(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USE_DEVICE_QUESTION_SETS_QUERY_KEY] });
    },
  });
};

/**
 * Hook for updating a device question set
 */
export const useUpdateDeviceQuestionSet = (questionSetId: number | undefined) => {
  const queryClient = useQueryClient();
  
  return useMutation<ApiResponse<QuestionSet>, Error, UpdateQuestionSetPayload>({
    mutationFn: (payload) => deviceQuestionSetService.updateQuestionSet(questionSetId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USE_DEVICE_QUESTION_SETS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [USE_DEVICE_QUESTION_SET_QUERY_KEY, questionSetId] });
    },
  });
};

/**
 * Hook for deleting a device question set
 */
export const useDeleteDeviceQuestionSet = () => {
  const queryClient = useQueryClient();
  
  return useMutation<ApiResponse<{ success: boolean }>, Error, number>({
    mutationFn: (questionSetId) => deviceQuestionSetService.deleteQuestionSet(questionSetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USE_DEVICE_QUESTION_SETS_QUERY_KEY] });
    },
  });
};

/**
 * Hook for creating a Question Set with Questions
 */
export const useCreateQuestionSetWithQuestions = () => {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<QuestionSet>, Error, CreateQuestionSetPayload>({
    mutationFn: (payload) => deviceQuestionSetService.createQuestionSetWithQuestions(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USE_DEVICE_QUESTION_SETS_QUERY_KEY] });
    },
  });
};

/**
 * Hook for retrieving translations for a question set
 */
export const useDeviceQuestionSetTranslations = (questionSetId: number | undefined) => {
  return useQuery<ApiResponse<ComprehensiveTranslationResponse[]>, Error>({
    queryKey: [USE_DEVICE_QUESTION_SET_TRANSLATIONS_QUERY_KEY, questionSetId],
    queryFn: () => deviceQuestionSetService.getQuestionSetTranslations(questionSetId!),
    enabled: !!questionSetId,
  });
};

/**
 * Hook for creating a question set translation
 */
export const useCreateDeviceQuestionSetTranslation = (questionSetId: number | undefined) => {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<QuestionSetTranslation>, Error, CreateQuestionSetTranslationPayload>({
    mutationFn: (payload) => deviceQuestionSetService.createQuestionSetTranslation(questionSetId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USE_DEVICE_QUESTION_SET_TRANSLATIONS_QUERY_KEY, questionSetId] });
      queryClient.invalidateQueries({ queryKey: [USE_DEVICE_QUESTION_SET_QUERY_KEY, questionSetId] });
    },
  });
};

/**
 * Hook for updating a question set translation
 */
export const useUpdateDeviceQuestionSetTranslation = (questionSetId: number | undefined, languageId: number | undefined) => {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<QuestionSetTranslation>, Error, UpdateQuestionSetTranslationPayload>({
    mutationFn: (payload: UpdateQuestionSetTranslationPayload) => 
      deviceQuestionSetService.updateQuestionSetTranslation(questionSetId!, languageId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USE_DEVICE_QUESTION_SET_TRANSLATIONS_QUERY_KEY, questionSetId] });
      queryClient.invalidateQueries({ queryKey: [USE_DEVICE_QUESTION_SET_QUERY_KEY, questionSetId] });
    },
  });
};

/**
 * Hook for deleting a question set translation
 */
export const useDeleteDeviceQuestionSetTranslation = (questionSetId: number | undefined) => {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<{ success: boolean }>, Error, number>({
    mutationFn: (languageId) => deviceQuestionSetService.deleteQuestionSetTranslation(questionSetId!, languageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USE_DEVICE_QUESTION_SET_TRANSLATIONS_QUERY_KEY, questionSetId] });
      queryClient.invalidateQueries({ queryKey: [USE_DEVICE_QUESTION_SET_QUERY_KEY, questionSetId] });
    },
  });
};

/**
 * Hook for retrieving question sets for a model
 */
export const useQuestionSetsForModel = (modelId: number | undefined) => {
  return useQuery<ApiResponse<QuestionSet[]>, Error>({
    queryKey: [USE_QUESTION_SETS_FOR_MODEL_QUERY_KEY, modelId],
    queryFn: () => deviceQuestionSetService.getQuestionSetsForModel(modelId!),
    enabled: !!modelId,
  });
};

/**
 * Hook for retrieving models for a question set
 */
export const useModelsForQuestionSet = (questionSetId: number | undefined, params?: QueryParams) => {
  return useQuery<PaginatedResponse<Model>, Error>({
    queryKey: [USE_MODELS_FOR_QUESTION_SET_QUERY_KEY, questionSetId, params],
    queryFn: () => deviceQuestionSetService.getModelsForQuestionSet(questionSetId!, params),
    enabled: !!questionSetId,
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for assigning a question set to a model
 */
export const useAssignQuestionSetToModel = () => {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<DeviceModelQuestionSetAssignment>, Error, AssignQuestionSetToModelPayload>({
    mutationFn: (payload) => deviceQuestionSetService.assignQuestionSetToModel(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [USE_QUESTION_SETS_FOR_MODEL_QUERY_KEY, variables.modelId] });
      queryClient.invalidateQueries({ queryKey: [USE_MODELS_FOR_QUESTION_SET_QUERY_KEY, variables.questionSetId] });
      queryClient.invalidateQueries({ queryKey: ['model', variables.modelId] });
    },
  });
};

/**
 * Hook for deleting an assignment by model and question set ID
 */
export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<{ success: boolean }>, Error, { modelId: number; questionSetId: number }>({
    mutationFn: ({ modelId, questionSetId }) => deviceQuestionSetService.deleteAssignment(modelId, questionSetId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [USE_QUESTION_SETS_FOR_MODEL_QUERY_KEY, variables.modelId] });
      queryClient.invalidateQueries({ queryKey: [USE_MODELS_FOR_QUESTION_SET_QUERY_KEY, variables.questionSetId] });
      queryClient.invalidateQueries({ queryKey: ['model', variables.modelId] });
    },
  }); 
} 