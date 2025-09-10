'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { brandService } from '@/lib/api/catalog/brandService';
import { Brand, BrandTranslation } from '@/types/catalog';
import { ApiResponse, QueryParams } from '@/lib/api/types';

/**
 * Hook for retrieving a paginated list of brands
 */
export const useBrands = (params?: QueryParams) => {
  return useQuery({
    queryKey: ['brands', params],
    queryFn: () => brandService.getBrands(params),
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for retrieving a single brand by ID
 */
export const useBrand = (id: number) => {
  return useQuery({
    queryKey: ['brand', id],
    queryFn: () => brandService.getBrandById(id),
    enabled: !!id,
  });
};

/**
 * Hook for retrieving a brand by its slug
 */
export const useBrandBySlug = (slug: string, clientId: number) => {
  return useQuery({
    queryKey: ['brand', 'slug', slug, clientId],
    queryFn: () => brandService.getBrandBySlug(slug, clientId),
    enabled: !!slug && !!clientId,
  });
};

/**
 * Hook for retrieving translations for a brand
 */
export const useBrandTranslations = (brandId: number) => {
  return useQuery({
    queryKey: ['brand', brandId, 'translations'],
    queryFn: () => brandService.getBrandTranslations(brandId),
    enabled: !!brandId,
  });
};

/**
 * Hook for creating a new brand
 */
export const useCreateBrand = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (brand: Brand) => brandService.createBrand(brand),
    onSuccess: () => {
      // Invalidate the brands list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
};

/**
 * Hook for updating a brand
 */
export const useUpdateBrand = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (brand: Partial<Brand>) => brandService.updateBrand(id, brand),
    onSuccess: () => {
      // Invalidate both the brands list and the individual brand query
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['brand', id] });
    },
  });
};

/**
 * Hook for deleting a brand
 */
export const useDeleteBrand = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => brandService.deleteBrand(id),
    onSuccess: () => {
      // Invalidate the brands list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
};

/**
 * Hook for creating a brand translation
 */
export const useCreateBrandTranslation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (translation: BrandTranslation) => brandService.createBrandTranslation(translation),
    onSuccess: (_, variables) => {
      // Invalidate the translations query for this brand
      queryClient.invalidateQueries({ queryKey: ['brand', variables.brand_id, 'translations'] });
    },
  });
};

/**
 * Hook for updating a brand translation
 */
export const useUpdateBrandTranslation = (brandId: number, languageId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (translation: Partial<Omit<BrandTranslation, 'brand_id' | 'language_id'>>) => 
      brandService.updateBrandTranslation(brandId, languageId, translation),
    onSuccess: () => {
      // Invalidate the translations query for this brand
      queryClient.invalidateQueries({ queryKey: ['brand', brandId, 'translations'] });
    },
  });
};

/**
 * Hook for deleting a brand translation
 */
export const useDeleteBrandTranslation = (brandId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (languageId: number) => brandService.deleteBrandTranslation(brandId, languageId),
    onSuccess: () => {
      // Invalidate the translations query for this brand
      queryClient.invalidateQueries({ queryKey: ['brand', brandId, 'translations'] });
    },
  });
};

/**
 * Hook for creating a brand with translations
 */
export const useCreateBrandWithTranslations = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ brand, translations }: { brand: Brand, translations: BrandTranslation[] }) => 
      brandService.createBrandWithTranslations(brand, translations),
    onSuccess: () => {
      // Invalidate the brands list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
};

/**
 * Hook for updating a brand with translations
 */
export const useUpdateBrandWithTranslations = (brandId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ brand, translations }: { brand: Partial<Brand>, translations: BrandTranslation[] }) => 
      brandService.updateBrandWithTranslations(brandId, brand, translations),
    onSuccess: () => {
      // Invalidate both the brands list, the individual brand query, and its translations
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['brand', brandId] });
      queryClient.invalidateQueries({ queryKey: ['brand', brandId, 'translations'] });
    },
  });
};

/**
 * Hook for uploading a brand logo
 */
export const useUploadBrandLogo = () => {
  const queryClient = useQueryClient();
  
  return useMutation<
    ApiResponse<{ iconUrl: string }>, 
    Error, 
    { brandId: number; file: File } 
  >({
    mutationFn: ({ brandId, file }: { brandId: number; file: File }) => 
      brandService.uploadBrandLogo(brandId, file),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brand', variables.brandId] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (error) => {
      console.error("Error uploading brand logo:", error);
    }
  });
};
