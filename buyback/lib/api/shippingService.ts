/**
 * Shipping Service
 * Handles all API operations related to shipping configurations (Sendcloud)
 */

import { ApiClient, createApiClient } from './base';
import { ApiResponse } from './types';

/**
 * Sendcloud configuration for a shop
 */
export interface SendcloudConfig {
    id?: number;
    shop_id: number;
    public_key: string;
    secret_key?: string; // Only used when saving, never returned from API
    default_sender_address_id?: number | null;
    default_shipping_method_id?: number | null;
    default_shipping_option_code?: string | null;
    use_test_mode?: boolean;
    is_active?: boolean;
    // Preview fields returned by API (not full credentials)
    configured?: boolean;
    public_key_preview?: string;
}

/**
 * Sendcloud configuration input for creating/updating
 */
export interface SendcloudConfigInput {
    public_key: string;
    secret_key: string;
    default_sender_address_id?: number | null;
    default_shipping_method_id?: number | null;
    default_shipping_option_code?: string | null;
}

/**
 * Shipping option from Sendcloud V2 API
 */
export interface ShippingOption {
    code: string;
    name: string;
    carrier?: string;
    weight_range?: {
        min_weight: number;
        max_weight: number;
    };
}

/**
 * Shipping method (legacy V2)
 */
export interface ShippingMethod {
    id: number;
    name: string;
    carrier: string;
    min_weight?: string;
    max_weight?: string;
}

/**
 * Sender address from Sendcloud (used for return addresses)
 */
export interface SenderAddress {
    id: number;
    company_name: string;
    contact_name: string;
    email: string;
    telephone: string;
    street: string;
    house_number: string;
    postal_code: string;
    city: string;
    country: string;
}

export class ShippingService {
    private apiClient: ApiClient;
    private baseEndpoint = '/shipping';

    constructor(apiClient?: ApiClient) {
        this.apiClient = apiClient || createApiClient();
    }

    /**
     * Get Sendcloud configuration for a shop
     */
    async getSendcloudConfig(shopId: number): Promise<ApiResponse<SendcloudConfig>> {
        return this.apiClient.get<ApiResponse<SendcloudConfig>>(
            `${this.baseEndpoint}/shops/${shopId}/config`,
            { isProtected: true }
        );
    }

    /**
     * Save Sendcloud configuration for a shop
     */
    async saveSendcloudConfig(shopId: number, config: SendcloudConfigInput): Promise<ApiResponse<{ configured: boolean; shop_id: number }>> {
        return this.apiClient.post<ApiResponse<{ configured: boolean; shop_id: number }>>(
            `${this.baseEndpoint}/shops/${shopId}/config`,
            config,
            { isProtected: true }
        );
    }

    /**
     * Get available shipping options for a shop (V3 API)
     */
    async getShippingOptions(shopId: number, fromCountry?: string, toCountry?: string): Promise<ApiResponse<ShippingOption[]>> {
        const params: Record<string, string> = {};
        if (fromCountry) params.from_country = fromCountry;
        if (toCountry) params.to_country = toCountry;

        return this.apiClient.get<ApiResponse<ShippingOption[]>>(
            `${this.baseEndpoint}/shops/${shopId}/shipping-options`,
            { params, isProtected: true }
        );
    }

    /**
     * Get available shipping methods for a shop (legacy V2)
     */
    async getShippingMethods(shopId: number): Promise<ApiResponse<ShippingMethod[]>> {
        return this.apiClient.get<ApiResponse<ShippingMethod[]>>(
            `${this.baseEndpoint}/shops/${shopId}/methods`,
            { isProtected: true }
        );
    }

    /**
     * Get sender/return addresses from Sendcloud
     */
    async getSenderAddresses(shopId: number): Promise<ApiResponse<SenderAddress[]>> {
        return this.apiClient.get<ApiResponse<SenderAddress[]>>(
            `${this.baseEndpoint}/shops/${shopId}/sender-addresses`,
            { isProtected: true }
        );
    }

    /**
     * Test Sendcloud connection for a shop
     * This attempts to fetch shipping methods which validates the credentials
     */
    async testConnection(shopId: number): Promise<{ success: boolean; message: string }> {
        try {
            const result = await this.getShippingMethods(shopId);
            if (result.data) {
                return { success: true, message: 'Connection successful' };
            }
            return { success: false, message: 'No data returned from Sendcloud' };
        } catch (error: any) {
            return { success: false, message: error.message || 'Connection failed' };
        }
    }
}

// Export a singleton instance
export const shippingService = new ShippingService();
