import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  orderService,
  CreateOrderPayload,
  CreateOrderResponseData,
  AdminListOrdersParams,
  UpdateOrderStatusPayload,
  AdminListOrdersResponseData,
  AdminOrderDetail
} from '@/lib/api/orderService';
import { estimationCartAtom } from '@/store/atoms'; // Assuming this path and export for estimationCartAtom
import { useSetAtom } from 'jotai';
import { toast } from 'sonner';

/**
 * Hook for creating a new order
 */
export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const setEstimationCart = useSetAtom(estimationCartAtom); // To clear cart on success

  return useMutation<CreateOrderResponseData, Error, CreateOrderPayload>({
    mutationFn: async (payload) => {
      try {
        const response = await orderService.createOrder(payload);
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'orders', 'list'] });
        setEstimationCart([]);
        return response.data;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Error creating order: ${message}`);
        throw error;
      }
    }
  });
};

/**
 * Hook for fetching a list of orders (admin/user based on context)
 */
export const useListOrders = (
  params: AdminListOrdersParams = {},
  options?: UseQueryOptions<AdminListOrdersResponseData, Error>
) => {
  // Inject shopId from env if not provided
  const envShopId = process.env.NEXT_PUBLIC_SHOP_ID
    ? parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10)
    : undefined;

  const mergedParams = { ...params } as AdminListOrdersParams;
  if (mergedParams.shopId === undefined && envShopId !== undefined) {
    mergedParams.shopId = envShopId;
  }

  return useQuery<AdminListOrdersResponseData, Error>({
    queryKey: ['orders', 'list', mergedParams],
    queryFn: async () => {
      try {
        const response = await orderService.listOrders(mergedParams);
        return response.data;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error loading orders:', message);
        toast.error(`Error loading orders: ${message}`);
        throw error;
      }
    },
    ...options,
  });
};

/** Hook for fetching orders, can be used by admin or other roles */
export const useGetOrders = (
  params: AdminListOrdersParams = {},
  options?: UseQueryOptions<AdminListOrdersResponseData, Error>
) => {
  // Inject shopId from env if not provided
  const envShopId = process.env.NEXT_PUBLIC_SHOP_ID
    ? parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10)
    : undefined;

  const mergedParams = { ...params } as AdminListOrdersParams;
  if (mergedParams.shopId === undefined && envShopId !== undefined) {
    mergedParams.shopId = envShopId;
  }

  return useQuery<AdminListOrdersResponseData, Error>({
    queryKey: ['orders', 'list', mergedParams],
    queryFn: async () => {
      try {
        const response = await orderService.listOrders(mergedParams);
        return response.data;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Error loading orders: ${message}`);
        throw error;
      }
    },
    ...options,
  });
};

/**
 * Hook for fetching order details for Admin
 */
export const useGetOrderDetailsAdmin = (
  orderId: string,
  options?: UseQueryOptions<AdminOrderDetail | null, Error>
) => {
  return useQuery<AdminOrderDetail | null, Error>({
    queryKey: ['admin', 'orders', 'details', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      if (!orderId) return null;
      try {
        const response = await orderService.getOrderDetailsAdmin(orderId);
        return response.data;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Error loading order details: ${message}`);
        throw error;
      }
    },
    ...options,
  });
};

/**
 * Hook for updating order status for Admin
 */
export const useUpdateOrderStatusAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation<AdminOrderDetail, Error, { orderId: string; payload: UpdateOrderStatusPayload }>({
    mutationFn: async ({ orderId, payload }) => {
      const response = await orderService.updateOrderStatusAdmin(orderId, payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', 'details', variables.orderId] });
    },
    onError: (error: Error) => {
      toast.error(`Error updating order status: ${error.message || 'Unknown error'}`);
    }
  });
}; 