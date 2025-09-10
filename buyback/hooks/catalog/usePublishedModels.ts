'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shopService, PublishedModelsParams } from '@/lib/api/catalog/shopService';
import { Model } from '@/types/catalog';
import { PaginatedResponse } from '@/lib/api/types';

const DEBOUNCE_DELAY = 500; // milliseconds

/**
 * Hook for retrieving published models for a shop, with debounced search.
 */
export const usePublishedModels = (
  shopId: number | undefined,
  params?: Omit<PublishedModelsParams, 'search'> & { search?: string },
  debounceMs: number = DEBOUNCE_DELAY
) => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string | undefined>(
    params?.search
  );

  useEffect(() => {
    if (params?.search === undefined || params.search === debouncedSearchTerm) {
      return;
    }
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(params.search);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [params?.search, debounceMs, debouncedSearchTerm]);

  const queryParams: PublishedModelsParams | undefined = params ? {
    ...params,
    search: debouncedSearchTerm,
  } : undefined;

  return useQuery<
    PaginatedResponse<Model>,
    Error,
    PaginatedResponse<Model>,
    [
      string,
      number | undefined,
      PublishedModelsParams | undefined
    ]
  >({
    queryKey: ['publishedModels', shopId, queryParams],
    queryFn: () => {
      if (!shopId) {
        return Promise.reject(new Error('Shop ID is required'));
      }
      // Ensure queryParams is not undefined when shopId is present, 
      // even if it means sending an empty params object for the initial load without search
      return shopService.getPublishedModels(shopId, queryParams ?? {});
    },
    enabled: !!shopId && (queryParams?.search ? !!debouncedSearchTerm : true),
    // keepPreviousData: true, // Consider if this is desired UX
  });
}; 