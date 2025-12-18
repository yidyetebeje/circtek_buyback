import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    tremendousService,
    TremendousConfig,
    TremendousConfigInput,
    TremendousFundingSource,
    TremendousCampaign,
    RewardStatus,
    SendRewardInput,
    SendRewardResult,
    TestConnectionResult,
} from '@/lib/api/tremendousService';

/**
 * Hook for fetching Tremendous configuration for a shop
 */
export const useTremendousConfig = (
    shopId: number,
    options?: Partial<UseQueryOptions<TremendousConfig | null, Error>>
) => {
    return useQuery<TremendousConfig | null, Error>({
        queryKey: ['tremendousConfig', shopId],
        queryFn: async () => {
            try {
                const response = await tremendousService.getConfig(shopId);
                return response.data || null;
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Error fetching Tremendous config: ${message}`);
                throw error;
            }
        },
        enabled: !!shopId && shopId > 0,
        ...options,
    });
};

/**
 * Hook for saving Tremendous configuration for a shop
 */
export const useSaveTremendousConfig = (shopId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (config: TremendousConfigInput) =>
            tremendousService.saveConfig(shopId, config),
        onSuccess: () => {
            // Invalidate the config query to refetch with new data
            queryClient.invalidateQueries({ queryKey: ['tremendousConfig', shopId] });
            // Also invalidate funding sources and campaigns as credentials may have changed
            queryClient.invalidateQueries({ queryKey: ['tremendousFundingSources', shopId] });
            queryClient.invalidateQueries({ queryKey: ['tremendousCampaigns', shopId] });
            toast.success('Tremendous configuration saved successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to save Tremendous configuration: ${error.message}`);
        },
    });
};

/**
 * Hook for testing Tremendous connection
 */
export const useTestTremendousConnection = (shopId: number) => {
    return useMutation({
        mutationFn: async () => {
            const response = await tremendousService.testConnection(shopId);
            return response.data as TestConnectionResult;
        },
        onSuccess: (result) => {
            if (result.success) {
                toast.success(result.message || 'Tremendous connection test successful!');
            } else {
                toast.error(`Connection test failed: ${result.message}`);
            }
        },
        onError: (error: Error) => {
            toast.error(`Connection test failed: ${error.message}`);
        },
    });
};

/**
 * Hook for fetching funding sources from Tremendous
 */
export const useTremendousFundingSources = (
    shopId: number,
    options?: Partial<UseQueryOptions<TremendousFundingSource[], Error>>
) => {
    return useQuery<TremendousFundingSource[], Error>({
        queryKey: ['tremendousFundingSources', shopId],
        queryFn: async () => {
            try {
                const response = await tremendousService.getFundingSources(shopId);
                return response.data || [];
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Error fetching Tremendous funding sources: ${message}`);
                throw error;
            }
        },
        enabled: !!shopId && shopId > 0,
        ...options,
    });
};

/**
 * Hook for fetching campaigns from Tremendous
 */
export const useTremendousCampaigns = (
    shopId: number,
    options?: Partial<UseQueryOptions<TremendousCampaign[], Error>>
) => {
    return useQuery<TremendousCampaign[], Error>({
        queryKey: ['tremendousCampaigns', shopId],
        queryFn: async () => {
            try {
                const response = await tremendousService.getCampaigns(shopId);
                return response.data || [];
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Error fetching Tremendous campaigns: ${message}`);
                throw error;
            }
        },
        enabled: !!shopId && shopId > 0,
        ...options,
    });
};

/**
 * Hook for sending a reward
 */
export const useSendReward = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: SendRewardInput) => {
            const response = await tremendousService.sendReward(input);
            return response;
        },
        onSuccess: (result, variables) => {
            if (result.success) {
                // Invalidate the reward status query for this order
                queryClient.invalidateQueries({ queryKey: ['rewardStatus', variables.order_id] });
                toast.success('Reward sent successfully!');
            } else {
                toast.error(`Failed to send reward: ${result.error}`);
            }
        },
        onError: (error: Error) => {
            toast.error(`Failed to send reward: ${error.message}`);
        },
    });
};

/**
 * Hook for fetching reward status for an order
 */
export const useRewardStatus = (
    orderId: string | undefined,
    options?: Partial<UseQueryOptions<RewardStatus | null, Error>>
) => {
    return useQuery<RewardStatus | null, Error>({
        queryKey: ['rewardStatus', orderId],
        queryFn: async () => {
            if (!orderId) return null;
            try {
                const response = await tremendousService.getRewardStatus(orderId);
                return response.data || null;
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Error fetching reward status: ${message}`);
                throw error;
            }
        },
        enabled: !!orderId,
        ...options,
    });
};

// Re-export types for convenience
export type {
    TremendousConfig,
    TremendousConfigInput,
    TremendousFundingSource,
    TremendousCampaign,
    RewardStatus,
    SendRewardInput,
    SendRewardResult,
};
