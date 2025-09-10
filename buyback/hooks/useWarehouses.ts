import { useQuery, UseQueryOptions, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { warehouseService, Warehouse } from '@/lib/api';

/**
 * Hook for fetching warehouses
 * Supports client ID filtering for admin users
 */
export interface WarehousesQueryParams {
  clientId?: number;
  shopId?: number;
  page?: number;
  pageSize?: number;
}

export const useWarehouses = (
  params: WarehousesQueryParams = {},
  options?: UseQueryOptions<{ data: Warehouse[]; total: number }, Error>
) => {
  const envShopId = process.env.NEXT_PUBLIC_SHOP_ID
    ? parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10)
    : undefined;
  const { clientId, shopId = envShopId, page, pageSize } = params;

  return useQuery<{ data: Warehouse[]; total: number }, Error>({
    queryKey: ["warehouses", { clientId, shopId, page, pageSize }],
    queryFn: async () => {
      try {
        const response = await warehouseService.getWarehouses({
          clientId,
          shopId,
          page,
          pageSize,
        });
        return response.data;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Error fetching warehouses: ${message}`);
        throw error;
      }
    },
    ...options,
  });
};

/**
 * Hook for fetching a single warehouse by ID
 */
export const useWarehouse = (
  id: number,
  options?: UseQueryOptions<Warehouse | null, Error>
) => {
  return useQuery<Warehouse | null, Error>({
    queryKey: ['warehouses', id],
    queryFn: async () => {
      try {
        const response = await warehouseService.getWarehouseById(id);
        
        // The response.data might be an array or a single warehouse object
        // Handle both cases gracefully
        if (Array.isArray(response.data)) {
          return response.data.length > 0 ? response.data[0] : null;
        }
        
        return response.data;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Error fetching warehouse: ${message}`);
        throw error;
      }
    },
    ...options
  });
};

export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { warehouseName: string; clientId?: number; timeZone?: string; status?: boolean; shopId?: number; }) =>
      warehouseService.createWarehouse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
};

export const useUpdateWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { warehouseName?: string; timeZone?: string; status?: boolean, shopId?: number } }) =>
      warehouseService.updateWarehouse(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses', variables.id] });
    },
  });
};

// Re-export the Warehouse type for convenience
export type { Warehouse };
