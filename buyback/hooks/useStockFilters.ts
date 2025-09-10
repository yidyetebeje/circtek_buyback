import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { stockService, StockFilters } from '@/lib/api/stockService';

export const useStockFilters = (
  params: { warehouseId?: number; isDead?: boolean; shopId?: number } = {},
  options?: UseQueryOptions<StockFilters, Error>
) => {
  const envShopId = process.env.NEXT_PUBLIC_SHOP_ID ? parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : undefined;
  const mergedParams = { ...params };
  if (mergedParams.shopId === undefined && envShopId !== undefined) {
    mergedParams.shopId = envShopId;
  }

  return useQuery<StockFilters, Error>({
    queryKey: ['stockFilters', mergedParams],
    queryFn: async () => {
      const response = await stockService.getFilters(mergedParams);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // cache for 5 min
    ...options,
  });
}; 