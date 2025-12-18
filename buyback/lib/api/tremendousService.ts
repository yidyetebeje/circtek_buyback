/**
 * Tremendous Service
 * Handles all API operations related to Tremendous reward payments
 */

import { ApiClient, createApiClient } from './base';
import { ApiResponse } from './types';

/**
 * Tremendous configuration for a shop
 */
export interface TremendousConfig {
    id?: number;
    shop_id: number;
    configured: boolean;
    is_active: boolean;
    use_test_mode: boolean;
    funding_source_id?: string | null;
    campaign_id?: string | null;
    api_key_preview?: string; // First 8 chars for display
}

/**
 * Tremendous configuration input for creating/updating
 */
export interface TremendousConfigInput {
    api_key?: string;
    funding_source_id?: string | null;
    campaign_id?: string | null;
    use_test_mode?: boolean;
    is_active?: boolean;
}

/**
 * Tremendous funding source
 */
export interface TremendousFundingSource {
    id: string;
    method: string;
    meta?: Record<string, unknown>;
}

/**
 * Tremendous campaign
 */
export interface TremendousCampaign {
    id: string;
    name: string;
    description?: string;
}

/**
 * Test connection result
 */
export interface TestConnectionResult {
    success: boolean;
    message: string;
    fundingSources?: number;
    testMode?: boolean;
}

/**
 * Reward status for an order
 */
export interface RewardStatus {
    hasSentReward: boolean;
    status?: string;
    amount?: string;
    recipientEmail?: string;
    sentAt?: string;
}

/**
 * Send reward input
 */
export interface SendRewardInput {
    order_id: string;
    shop_id: number;
    recipient_email: string;
    recipient_name: string;
    amount: number;
    currency_code?: string;
    message?: string;
}

/**
 * Send reward result
 */
export interface SendRewardResult {
    success: boolean;
    reward_id?: string;
    order_id?: string;
    external_id?: string;
    error?: string;
}

export class TremendousService {
    private apiClient: ApiClient;
    private baseEndpoint = '/tremendous';

    constructor(apiClient?: ApiClient) {
        this.apiClient = apiClient || createApiClient();
    }

    /**
     * Get Tremendous configuration for a shop
     */
    async getConfig(shopId: number): Promise<ApiResponse<TremendousConfig>> {
        return this.apiClient.get<ApiResponse<TremendousConfig>>(
            `${this.baseEndpoint}/config/${shopId}`,
            { isProtected: true }
        );
    }

    /**
     * Save Tremendous configuration for a shop
     */
    async saveConfig(shopId: number, config: TremendousConfigInput): Promise<ApiResponse<{ success: boolean; message: string }>> {
        return this.apiClient.post<ApiResponse<{ success: boolean; message: string }>>(
            `${this.baseEndpoint}/config/${shopId}`,
            config,
            { isProtected: true }
        );
    }

    /**
     * Test Tremendous connection for a shop
     */
    async testConnection(shopId: number): Promise<ApiResponse<TestConnectionResult>> {
        return this.apiClient.post<ApiResponse<TestConnectionResult>>(
            `${this.baseEndpoint}/config/${shopId}/test`,
            {},
            { isProtected: true }
        );
    }

    /**
     * Get available funding sources for a shop
     */
    async getFundingSources(shopId: number): Promise<ApiResponse<TremendousFundingSource[]>> {
        return this.apiClient.get<ApiResponse<TremendousFundingSource[]>>(
            `${this.baseEndpoint}/funding-sources/${shopId}`,
            { isProtected: true }
        );
    }

    /**
     * Get available campaigns for a shop
     */
    async getCampaigns(shopId: number): Promise<ApiResponse<TremendousCampaign[]>> {
        return this.apiClient.get<ApiResponse<TremendousCampaign[]>>(
            `${this.baseEndpoint}/campaigns/${shopId}`,
            { isProtected: true }
        );
    }

    /**
     * Send a reward for an order
     */
    async sendReward(input: SendRewardInput): Promise<SendRewardResult> {
        return this.apiClient.post<SendRewardResult>(
            `${this.baseEndpoint}/rewards/send`,
            input,
            { isProtected: true }
        );
    }

    /**
     * Get reward status for an order
     */
    async getRewardStatus(orderId: string): Promise<ApiResponse<RewardStatus>> {
        return this.apiClient.get<ApiResponse<RewardStatus>>(
            `${this.baseEndpoint}/rewards/order/${orderId}`,
            { isProtected: true }
        );
    }
}

// Export a singleton instance
export const tremendousService = new TremendousService();
