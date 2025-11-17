'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { categoryService } from '@/lib/api/catalog/categoryService';
import { Category, CategoryTranslation } from '@/types/catalog';
import { QueryParams } from '@/lib/api/types';

/**
 * Hook for retrieving a paginated list of categories
 */
export const useCategories = (params?: QueryParams) => {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: () => categoryService.getCategories(params),
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for retrieving a single category by ID
 */
export const useCategory = (id: number) => {
  return useQuery({
    queryKey: ['category', id],
    queryFn: () => categoryService.getCategoryById(id),
    enabled: !!id,
  });
};

/**
 * Hook for retrieving a category by its slug
 */
export const useCategoryBySlug = (slug: string, tenant_id: number) => {
  return useQuery({
    queryKey: ['category', 'slug', slug, tenant_id],
    queryFn: () => categoryService.getCategoryBySlug(slug, tenant_id),
    enabled: !!slug && !!tenant_id,
  });
};

/**
 * Hook for retrieving translations for a category
 */
export const useCategoryTranslations = (categoryId: number) => {
  return useQuery({
    queryKey: ['category', categoryId, 'translations'],
    queryFn: () => categoryService.getCategoryTranslations(categoryId),
    enabled: !!categoryId,
  });
};

/**
 * Hook for creating a new category
 */
export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (category: Category) => categoryService.createCategory(category),
    onSuccess: () => {
      // Invalidate the categories list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

/**
 * Hook for updating a category
 */
export const useUpdateCategory = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (category: Partial<Category>) => categoryService.updateCategory(id, category),
    onSuccess: () => {
      // Invalidate both the categories list and the individual category query
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', id] });
    },
  });
};

/**
 * Hook for deleting a category
 */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => categoryService.deleteCategory(id),
    onSuccess: () => {
      // Invalidate the categories list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

/**
 * Hook for creating a category translation
 */
export const useCreateCategoryTranslation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (translation: CategoryTranslation) => categoryService.createCategoryTranslation(translation),
    onSuccess: (_, variables) => {
      // Invalidate the translations query for this category
      queryClient.invalidateQueries({ queryKey: ['category', variables.category_id, 'translations'] });
    },
  });
};

/**
 * Hook for updating a category translation
 */
export const useUpdateCategoryTranslation = (categoryId: number, languageId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (translation: Partial<Omit<CategoryTranslation, 'category_id' | 'language_id'>>) => 
      categoryService.updateCategoryTranslation(categoryId, languageId, translation),
    onSuccess: () => {
      // Invalidate the translations query for this category
      queryClient.invalidateQueries({ queryKey: ['category', categoryId, 'translations'] });
    },
  });
};

/**
 * Hook for deleting a category translation
 */
export const useDeleteCategoryTranslation = (categoryId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (languageId: number) => categoryService.deleteCategoryTranslation(categoryId, languageId),
    onSuccess: () => {
      // Invalidate the translations query for this category
      queryClient.invalidateQueries({ queryKey: ['category', categoryId, 'translations'] });
    },
  });
};

/**
 * Hook for creating a category with translations
 */
export const useCreateCategoryWithTranslations = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ category, translations }: { category: Category, translations: CategoryTranslation[] }) => 
      categoryService.createCategoryWithTranslations(category, translations),
    onSuccess: () => {
      // Invalidate the categories list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

/**
 * Hook for updating a category with translations
 */
export const useUpdateCategoryWithTranslations = (categoryId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ category, translations }: { category: Partial<Category>, translations: CategoryTranslation[] }) => 
      categoryService.updateCategoryWithTranslations(categoryId, category, translations),
    onSuccess: () => {
      // Invalidate both the categories list, the individual category query, and its translations
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['category', categoryId, 'translations'] });
    },
  });
};

/**
 * Hook for uploading a category icon
 */
export const useUploadCategoryIcon = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ categoryId, file }: { categoryId: number; file: File }) => 
      categoryService.uploadCategoryIcon(categoryId, file),
    onSuccess: (_, { categoryId }) => { 
      // Invalidate the specific category query and potentially the list
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['categories'] }); // Also invalidate list
    },
    onError: (error) => {
      console.error('Error uploading category icon:', error);
      // Consider showing a toast notification here
    }
  });
};
