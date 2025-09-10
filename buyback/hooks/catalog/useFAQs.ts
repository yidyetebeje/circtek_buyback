'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { faqService } from '@/lib/api/catalog/faqService';
import { FAQ } from '@/types/catalog';
import { QueryParams } from '@/lib/api/types';

/**
 * Hook for retrieving a paginated list of FAQs
 */
export const useFAQs = (params?: QueryParams) => {
  return useQuery({
    queryKey: ['faqs', params],
    queryFn: () => faqService.getFAQs(params),
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for retrieving a single FAQ by ID
 */
export const useFAQ = (id: number) => {
  return useQuery({
    queryKey: ['faq', id],
    queryFn: () => faqService.getFAQById(id),
    enabled: !!id,
  });
};

/**
 * Hook for retrieving FAQs by shop ID
 */
export const useFAQsByShopId = (shopId: number, isPublished?: boolean) => {
  return useQuery({
    queryKey: ['faqs', 'shop', shopId, isPublished],
    queryFn: () => faqService.getFAQsByShopId(shopId, isPublished),
    enabled: !!shopId,
  });
};

/**
 * Hook for retrieving translations for a FAQ
 */
export const useFAQTranslations = (faqId: number) => {
  return useQuery({
    queryKey: ['faq', faqId, 'translations'],
    queryFn: () => faqService.getFAQTranslations(faqId),
    enabled: !!faqId,
  });
};

/**
 * Hook for creating a new FAQ
 */
export const useCreateFAQ = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (faq: Omit<FAQ, 'id' | 'created_at' | 'updated_at'>) => faqService.createFAQ(faq),
    onSuccess: () => {
      // Invalidate the FAQs list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
    },
  });
};

/**
 * Hook for updating a FAQ
 */
export const useUpdateFAQ = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (faq: Partial<FAQ>) => faqService.updateFAQ(id, faq),
    onSuccess: () => {
      // Invalidate both the FAQs list and the individual FAQ query
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      queryClient.invalidateQueries({ queryKey: ['faq', id] });
    },
  });
};

/**
 * Hook for deleting a FAQ
 */
export const useDeleteFAQ = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => faqService.deleteFAQ(id),
    onSuccess: () => {
      // Invalidate the FAQs list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
    },
  });
};

/**
 * Hook for creating a FAQ with translations
 */
export const useCreateFAQWithTranslations = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      question: string;
      answer: string;
      order_no?: number;
      is_published?: boolean;
      shop_id: number;
      client_id: number;
      translations: {
        language_id: number;
        question: string;
        answer: string;
      }[];
    }) => faqService.createFAQWithTranslations(data),
    onSuccess: () => {
      // Invalidate the FAQs list query to refetch it
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
    },
  });
};

/**
 * Hook for updating a FAQ with translations
 */
export const useUpdateFAQWithTranslations = (faqId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      question?: string;
      answer?: string;
      order_no?: number;
      is_published?: boolean;
      translations?: {
        language_id: number;
        question: string;
        answer: string;
      }[];
    }) => faqService.updateFAQWithTranslations(faqId, data),
    onSuccess: () => {
      // Invalidate both the FAQs list, the individual FAQ query, and its translations
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      queryClient.invalidateQueries({ queryKey: ['faq', faqId] });
      queryClient.invalidateQueries({ queryKey: ['faq', faqId, 'translations'] });
    },
  });
};

/**
 * Hook for updating FAQ order
 */
export const useUpdateFAQOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, newOrder }: { id: number; newOrder: number }) => faqService.updateFAQOrder(id, newOrder),
    onSuccess: (_, { id }) => {
      // Invalidate both the FAQs list and the individual FAQ query
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      queryClient.invalidateQueries({ queryKey: ['faq', id] });
    },
  });
};

/**
 * Hook for creating a FAQ translation
 */
export const useCreateFAQTranslation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ faqId, languageId, translation }: {
      faqId: number;
      languageId: number;
      translation: { question: string; answer: string };
    }) => faqService.createFAQTranslation(faqId, languageId, translation),
    onSuccess: (_, variables) => {
      // Invalidate the translations query for this FAQ
      queryClient.invalidateQueries({ queryKey: ['faq', variables.faqId, 'translations'] });
    },
  });
};

/**
 * Hook for updating a FAQ translation
 */
export const useUpdateFAQTranslation = (faqId: number, languageId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (translation: { question?: string; answer?: string }) => 
      faqService.updateFAQTranslation(faqId, languageId, translation),
    onSuccess: () => {
      // Invalidate the translations query for this FAQ
      queryClient.invalidateQueries({ queryKey: ['faq', faqId, 'translations'] });
    },
  });
};

/**
 * Hook for deleting a FAQ translation
 */
export const useDeleteFAQTranslation = (faqId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (languageId: number) => faqService.deleteFAQTranslation(faqId, languageId),
    onSuccess: () => {
      // Invalidate the translations query for this FAQ
      queryClient.invalidateQueries({ queryKey: ['faq', faqId, 'translations'] });
    },
  });
};

/**
 * Hook for upserting (creating or updating) a FAQ translation
 */
export const useUpsertFAQTranslation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ faqId, languageId, translation }: {
      faqId: number;
      languageId: number;
      translation: { question: string; answer: string };
    }) => faqService.upsertFAQTranslation(faqId, languageId, translation),
    onSuccess: (_, { faqId }) => {
      queryClient.invalidateQueries({ queryKey: ['faq', faqId, 'translations'] });
      queryClient.invalidateQueries({ queryKey: ['faq', faqId] }); // Also invalidate the main FAQ
    },
  });
}; 