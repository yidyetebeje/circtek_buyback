'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { modelSeriesService } from '@/lib/api/catalog/modelSeriesService';
import { ModelSeries, ModelSeriesTranslation } from '@/types/catalog';
import { QueryParams } from '@/lib/api/types';

/**
 * Hook for retrieving a paginated list of model series
 */
export const useModelSeries = (params?: QueryParams & { brand_id?: number }) => {
  return useQuery({
    queryKey: ['modelSeries', params],
    queryFn: () => modelSeriesService.getModelSeries(params),
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for retrieving a single model series by ID
 */
export const useModelSeriesById = (id: number) => {
  return useQuery({
    queryKey: ['modelSeries', id],
    queryFn: () => modelSeriesService.getModelSeriesById(id),
    enabled: !!id,
  });
};

/**
 * Hook for retrieving a model series by its slug
 */
export const useModelSeriesBySlug = (slug: string, clientId: number) => {
  return useQuery({
    queryKey: ['modelSeries', 'slug', slug, clientId],
    queryFn: () => modelSeriesService.getModelSeriesBySlug(slug, clientId),
    enabled: !!slug && !!clientId,
  });
};

/**
 * Hook for retrieving model series by brand ID
 */
export const useModelSeriesByBrandId = (brandId: number, params?: QueryParams) => {
  return useQuery({
    queryKey: ['modelSeries', 'brand', brandId, params],
    queryFn: () => modelSeriesService.getModelSeriesByBrandId(brandId, params),
    enabled: !!brandId,
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for retrieving translations for a model series
 */
export const useModelSeriesTranslations = (modelSeriesId: number) => {
  return useQuery({
    queryKey: ['modelSeries', modelSeriesId, 'translations'],
    queryFn: () => modelSeriesService.getModelSeriesTranslations(modelSeriesId),
    enabled: !!modelSeriesId,
  });
};

/**
 * Hook for creating a new model series
 */
export const useCreateModelSeries = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (modelSeries: ModelSeries) => modelSeriesService.createModelSeries(modelSeries),
    onSuccess: (_, variables) => {
      // Invalidate the model series list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['modelSeries'] });
      
      // If brand_id is present, also invalidate the brand-specific model series list
      if (variables.brand_id) {
        queryClient.invalidateQueries({ queryKey: ['modelSeries', 'brand', variables.brand_id] });
      }
    },
  });
};

/**
 * Hook for updating a model series
 */
export const useUpdateModelSeries = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (modelSeries: Partial<ModelSeries>) => modelSeriesService.updateModelSeries(id, modelSeries),
    onSuccess: (_, variables) => {
      // Invalidate both the model series list and the individual model series query
      queryClient.invalidateQueries({ queryKey: ['modelSeries'] });
      queryClient.invalidateQueries({ queryKey: ['modelSeries', id] });
      
      // If brand_id is present, also invalidate the brand-specific model series list
      if (variables.brand_id) {
        queryClient.invalidateQueries({ queryKey: ['modelSeries', 'brand', variables.brand_id] });
      }
    },
  });
};

/**
 * Hook for deleting a model series
 */
export const useDeleteModelSeries = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => modelSeriesService.deleteModelSeries(id),
    onSuccess: () => {
      // Invalidate the model series list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['modelSeries'] });
    },
  });
};

/**
 * Hook for creating a model series translation
 */
export const useCreateModelSeriesTranslation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (translation: ModelSeriesTranslation) => 
      modelSeriesService.createModelSeriesTranslation(translation),
    onSuccess: (_, variables) => {
      // Invalidate the translations query for this model series
      queryClient.invalidateQueries({ queryKey: ['modelSeries', variables.model_series_id, 'translations'] });
    },
  });
};

/**
 * Hook for updating a model series translation
 */
export const useUpdateModelSeriesTranslation = (modelSeriesId: number, languageId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (translation: Partial<Omit<ModelSeriesTranslation, 'model_series_id' | 'language_id'>>) => 
      modelSeriesService.updateModelSeriesTranslation(modelSeriesId, languageId, translation),
    onSuccess: () => {
      // Invalidate the translations query for this model series
      queryClient.invalidateQueries({ queryKey: ['modelSeries', modelSeriesId, 'translations'] });
    },
  });
};

/**
 * Hook for deleting a model series translation
 */
export const useDeleteModelSeriesTranslation = (modelSeriesId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (languageId: number) => 
      modelSeriesService.deleteModelSeriesTranslation(modelSeriesId, languageId),
    onSuccess: () => {
      // Invalidate the translations query for this model series
      queryClient.invalidateQueries({ queryKey: ['modelSeries', modelSeriesId, 'translations'] });
    },
  });
};

/**
 * Hook for creating a model series with translations
 */
export const useCreateModelSeriesWithTranslations = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ modelSeries, translations }: { modelSeries: ModelSeries, translations: ModelSeriesTranslation[] }) => 
      modelSeriesService.createModelSeriesWithTranslations(modelSeries, translations),
    onSuccess: (_, variables) => {
      // Invalidate the model series list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['modelSeries'] });
      
      // If brand_id is present, also invalidate the brand-specific model series list
      if (variables.modelSeries.brand_id) {
        queryClient.invalidateQueries({ queryKey: ['modelSeries', 'brand', variables.modelSeries.brand_id] });
      }
    },
  });
};

/**
 * Hook for updating a model series with translations
 */
export const useUpdateModelSeriesWithTranslations = (modelSeriesId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ modelSeries, translations }: { modelSeries: Partial<ModelSeries>, translations: ModelSeriesTranslation[] }) => 
      modelSeriesService.updateModelSeriesWithTranslations(modelSeriesId, modelSeries, translations),
    onSuccess: (_, variables) => {
      // Invalidate both the model series list, the individual model series query, and its translations
      queryClient.invalidateQueries({ queryKey: ['modelSeries'] });
      queryClient.invalidateQueries({ queryKey: ['modelSeries', modelSeriesId] });
      queryClient.invalidateQueries({ queryKey: ['modelSeries', modelSeriesId, 'translations'] });
      
      // If brand_id is present, also invalidate the brand-specific model series list
      if (variables.modelSeries.brand_id) {
        queryClient.invalidateQueries({ queryKey: ['modelSeries', 'brand', variables.modelSeries.brand_id] });
      }
    },
  });
};

/**
 * Hook for uploading a model series image
 */
export const useUploadModelSeriesImage = () => { 
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ seriesId, file }: { seriesId: number; file: File }) => 
      modelSeriesService.uploadModelSeriesImage(seriesId, file),
    onSuccess: (_, { seriesId }) => { 
      // Invalidate the model series query to refetch it with the new image
      queryClient.invalidateQueries({ queryKey: ['modelSeries', seriesId] });
    },
  });
};
