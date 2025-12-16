import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { shippingService, SendcloudConfig, SendcloudConfigInput, ShippingOption, ShippingMethod } from '@/lib/api/shippingService';

/**
 * Hook for fetching Sendcloud configuration for a shop
 */
export const useSendcloudConfig = (
    shopId: number,
    options?: UseQueryOptions<SendcloudConfig | null, Error>
) => {
    return useQuery<SendcloudConfig | null, Error>({
        queryKey: ['sendcloudConfig', shopId],
        queryFn: async () => {
            try {
                const response = await shippingService.getSendcloudConfig(shopId);
                return response.data || null;
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Error fetching Sendcloud config: ${message}`);
                throw error;
            }
        },
        enabled: !!shopId && shopId > 0,
        ...options,
    });
};

/**
 * Hook for saving Sendcloud configuration for a shop
 */
export const useSaveSendcloudConfig = (shopId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (config: SendcloudConfigInput) =>
            shippingService.saveSendcloudConfig(shopId, config),
        onSuccess: () => {
            // Invalidate the config query to refetch with new data
            queryClient.invalidateQueries({ queryKey: ['sendcloudConfig', shopId] });
            // Also invalidate shipping options as credentials may have changed
            queryClient.invalidateQueries({ queryKey: ['shippingOptions', shopId] });
            queryClient.invalidateQueries({ queryKey: ['shippingMethods', shopId] });
            toast.success('Sendcloud configuration saved successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to save Sendcloud configuration: ${error.message}`);
        },
    });
};

/**
 * Hook for fetching shipping options (V3 API)
 */
export const useShippingOptions = (
    shopId: number,
    fromCountry?: string,
    toCountry?: string,
    options?: Partial<UseQueryOptions<ShippingOption[], Error>>
) => {
    return useQuery<ShippingOption[], Error>({
        queryKey: ['shippingOptions', shopId, fromCountry, toCountry],
        queryFn: async () => {
            try {
                const response = await shippingService.getShippingOptions(shopId, fromCountry, toCountry);
                return response.data || [];
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Error fetching shipping options: ${message}`);
                throw error;
            }
        },
        enabled: !!shopId && shopId > 0,
        ...options,
    });
};

/**
 * Hook for fetching shipping methods (legacy V2 API)
 */
export const useShippingMethods = (
    shopId: number,
    options?: UseQueryOptions<ShippingMethod[], Error>
) => {
    return useQuery<ShippingMethod[], Error>({
        queryKey: ['shippingMethods', shopId],
        queryFn: async () => {
            try {
                const response = await shippingService.getShippingMethods(shopId);
                return response.data || [];
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Error fetching shipping methods: ${message}`);
                throw error;
            }
        },
        enabled: !!shopId && shopId > 0,
        ...options,
    });
};

/**
 * Hook for testing Sendcloud connection
 */
export const useTestSendcloudConnection = (shopId: number) => {
    return useMutation({
        mutationFn: () => shippingService.testConnection(shopId),
        onSuccess: (result) => {
            if (result.success) {
                toast.success('Sendcloud connection test successful!');
            } else {
                toast.error(`Connection test failed: ${result.message}`);
            }
        },
        onError: (error: Error) => {
            toast.error(`Connection test failed: ${error.message}`);
        },
    });
};

// Re-export types for convenience
export type { SendcloudConfig, SendcloudConfigInput, ShippingOption, ShippingMethod };
