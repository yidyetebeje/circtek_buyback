import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { stockService, StockItem, StockListParams, StockListResponse } from '@/lib/api';

export const useStock = (
  params: StockListParams,
  options?: UseQueryOptions<StockListResponse, Error>
) => {
  const envShopId = process.env.NEXT_PUBLIC_SHOP_ID ? parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : undefined;
  const mergedParams = { ...params } as typeof params & { shopId?: number };
  if (mergedParams.shopId === undefined && envShopId !== undefined) {
    mergedParams.shopId = envShopId;
  }

  return useQuery<StockListResponse, Error>({
    queryKey: ['stock', mergedParams],
    queryFn: async () => {
      try {
        const response = await stockService.getStocks(mergedParams);
        return response.data;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Error fetching stock: ${message}`);
        throw error;
      }
    },
    ...options,
  });
};

export const useStockById = (
  id: number | undefined,
  options?: UseQueryOptions<StockItem | null, Error>
) => {
  return useQuery<StockItem | null, Error>({
    queryKey: ['stock', id],
    enabled: typeof id === 'number',
    queryFn: async () => {
      if (id === undefined) return null;
      const resp = await stockService.getStockById(id);
      return resp.data;
    },
    ...options,
  });
};

// Alias type for convenience
export type { StockItem }; 