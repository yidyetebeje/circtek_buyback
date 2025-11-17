'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { modelService } from '@/lib/api/catalog/modelService';
import { Model, ModelTranslation } from '@/types/catalog';
import { ApiResponse, QueryParams } from '@/lib/api/types';

/**
 * Hook for retrieving a paginated list of models
 */
export const useModels = (params?: QueryParams & { 
  category_id?: number | number[];
  brand_id?: number | number[];
  model_series_id?: number | number[];
}) => {
  return useQuery<ApiResponse<Model[]>, Error>({
    queryKey: ['models', params],
    queryFn: () => modelService.getModels(params),
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for retrieving a single model by ID
 */
export const useModel = (id: number) => {
  return useQuery({
    queryKey: ['model', id],
    queryFn: () => modelService.getModelById(id),
    enabled: !!id,
  });
};

/**
 * Hook for retrieving a model by its slug
 */
export const useModelBySlug = (slug: string, tenantId: number) => {
  return useQuery({
    queryKey: ['model', 'slug', slug, tenantId],
    queryFn: () => modelService.getModelBySlug(slug, tenantId),
    enabled: !!slug && !!tenantId,
  });
};

/**
 * Hook for retrieving models by category ID
 */
export const useModelsByCategoryId = (categoryId: number, params?: QueryParams) => {
  return useQuery({
    queryKey: ['models', 'category', categoryId, params],
    queryFn: () => modelService.getModelsByCategoryId(categoryId, params),
    enabled: !!categoryId,
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for retrieving models by brand ID
 */
export const useModelsByBrandId = (brandId: number, params?: QueryParams) => {
  return useQuery({
    queryKey: ['models', 'brand', brandId, params],
    queryFn: () => modelService.getModelsByBrandId(brandId, params),
    enabled: !!brandId,
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for retrieving models by series ID
 */
export const useModelsBySeriesId = (seriesId: number, params?: QueryParams) => {
  return useQuery({
    queryKey: ['models', 'series', seriesId, params],
    queryFn: () => modelService.getModelsBySeriesId(seriesId, params),
    enabled: !!seriesId,
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for retrieving translations for a model
 */
export const useModelTranslations = (modelId: number) => {
  return useQuery({
    queryKey: ['model', modelId, 'translations'],
    queryFn: () => modelService.getModelTranslations(modelId),
    enabled: !!modelId,
  });
};

/**
 * Hook for creating a new model
 */
export const useCreateModel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (model: Model) => modelService.createModel(model),
    onSuccess: (_, variables) => {
      // Invalidate the models list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['models'] });
      
      // Invalidate related queries
      if (variables.category_id) {
        queryClient.invalidateQueries({ queryKey: ['models', 'category', variables.category_id] });
      }
      if (variables.brand_id) {
        queryClient.invalidateQueries({ queryKey: ['models', 'brand', variables.brand_id] });
      }
      if (variables.model_series_id) {
        queryClient.invalidateQueries({ queryKey: ['models', 'series', variables.model_series_id] });
      }
    },
  });
};

/**
 * Hook for updating a model
 */
export const useUpdateModel = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (model: Partial<Model>) => modelService.updateModel(id, model),
    onSuccess: (_, variables) => {
      // Invalidate both the models list and the individual model query
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['model', id] });
      queryClient.invalidateQueries({ queryKey: ['model', id, 'translations'] });
      
      // Invalidate related queries
      if (variables.category_id) {
        queryClient.invalidateQueries({ queryKey: ['models', 'category', variables.category_id] });
      }
      if (variables.brand_id) {
        queryClient.invalidateQueries({ queryKey: ['models', 'brand', variables.brand_id] });
      }
      if (variables.model_series_id) {
        queryClient.invalidateQueries({ queryKey: ['models', 'series', variables.model_series_id] });
      }
    },
  });
};

/**
 * Hook for deleting a model
 */
export const useDeleteModel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => modelService.deleteModel(id),
    onSuccess: () => {
      // Invalidate the models list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
};

/**
 * Hook for creating a model translation
 */
export const useCreateModelTranslation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (translation: ModelTranslation) => 
      modelService.createModelTranslation(translation),
    onSuccess: (_, variables) => {
      // Invalidate the translations query for this model
      queryClient.invalidateQueries({ queryKey: ['model', variables.model_id, 'translations'] });
    },
  });
};

/**
 * Hook for updating a model translation
 */
export const useUpdateModelTranslation = (modelId: number, languageId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (translation: Partial<Omit<ModelTranslation, 'model_id' | 'language_id'>>) => 
      modelService.updateModelTranslation(modelId, languageId, translation),
    onSuccess: () => {
      // Invalidate the translations query for this model
      queryClient.invalidateQueries({ queryKey: ['model', modelId, 'translations'] });
    },
  });
};

/**
 * Hook for deleting a model translation
 */
export const useDeleteModelTranslation = (modelId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (languageId: number) => 
      modelService.deleteModelTranslation(modelId, languageId),
    onSuccess: () => {
      // Invalidate the translations query for this model
      queryClient.invalidateQueries({ queryKey: ['model', modelId, 'translations'] });
    },
  });
};

/**
 * Hook for creating a model with translations
 */
export const useCreateModelWithTranslations = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ model, translations }: { model: Model, translations: ModelTranslation[] }) => 
      modelService.createModelWithTranslations(model, translations),
    onSuccess: (_, variables) => {
      // Invalidate the models list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['models'] });
      
      // Invalidate related queries
      if (variables.model.category_id) {
        queryClient.invalidateQueries({ queryKey: ['models', 'category', variables.model.category_id] });
      }
      if (variables.model.brand_id) {
        queryClient.invalidateQueries({ queryKey: ['models', 'brand', variables.model.brand_id] });
      }
      if (variables.model.model_series_id) {
        queryClient.invalidateQueries({ queryKey: ['models', 'series', variables.model.model_series_id] });
      }
    },
  });
};

/**
 * Hook for updating a model with translations
 */
export const useUpdateModelWithTranslations = (modelId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ model, translations }: { model: Partial<Model>, translations: ModelTranslation[] }) => 
      modelService.updateModelWithTranslations(modelId, model, translations),
    onSuccess: (_, variables) => {
      // Invalidate both the models list, the individual model query, and its translations
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['model', modelId] });
      queryClient.invalidateQueries({ queryKey: ['model', modelId, 'translations'] });
      
      // Invalidate related queries
      if (variables.model.category_id) {
        queryClient.invalidateQueries({ queryKey: ['models', 'category', variables.model.category_id] });
      }
      if (variables.model.brand_id) {
        queryClient.invalidateQueries({ queryKey: ['models', 'brand', variables.model.brand_id] });
      }
      if (variables.model.model_series_id) {
        queryClient.invalidateQueries({ queryKey: ['models', 'series', variables.model.model_series_id] });
      }
    },
  });
};

/**
 * Hook for uploading a model image
 */
export const useUploadModelImage = () => {
  const queryClient = useQueryClient();
  
  return useMutation<
    { imageUrl: string }, 
    Error, 
    { modelId: number; file: File } 
  >({
    mutationFn: ({ modelId, file }: { modelId: number; file: File }) => 
      modelService.uploadModelImage(modelId, file),
    onSuccess: (data, variables) => {
      // Invalidate the specific model query
      queryClient.invalidateQueries({ queryKey: ['model', variables.modelId] });
      // Optionally invalidate lists if image is shown there
      queryClient.invalidateQueries({ queryKey: ['models'] }); 
    },
    onError: (error) => {
      console.error("Error uploading model image:", error);
    }
  });
};
