import { useQuery } from '@tanstack/react-query';
import { shopService } from '@/lib/api/catalog/shopService';
import { QueryParams } from '@/lib/api/types';
import { toast } from 'sonner';

/**
 * Hook for retrieving all shops for the admin panel
 */
export const useGetShopsAdmin = (params?: QueryParams) => {
  return useQuery({
    queryKey: ['admin', 'shops', params],
    queryFn: async () => {
      try {
        const response = await shopService.getShops(params);
        return response;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Error loading shops: ${errorMessage}`);
        throw error;
      }
    },
  });
}; 