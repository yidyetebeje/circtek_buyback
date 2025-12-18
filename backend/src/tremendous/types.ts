/**
 * Tremendous API Types
 * 
 * Type definitions for Tremendous integration.
 * Re-exports from the official `tremendous` package plus custom types.
 */

// Re-export types from the official tremendous package
export type {
    Configuration,
    CreateOrderRequest,
    Order,
    Reward,
    FundingSource,
    Campaign,
} from 'tremendous';

// Custom types for our application

export type TremendousRewardStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';

export interface TremendousConfigRecord {
    id: number;
    tenant_id: number;
    shop_id: number;
    api_key_encrypted: string;
    funding_source_id: string | null;
    campaign_id: string | null;
    use_test_mode: boolean | null;
    is_active: boolean | null;
    created_at: Date | null;
    updated_at: Date | null;
}

export interface TremendousConfigInput {
    shop_id: number;
    api_key?: string; // Plain text, will be encrypted
    funding_source_id?: string | null;
    campaign_id?: string | null;
    use_test_mode?: boolean;
    is_active?: boolean;
}

export interface TremendousConfigStatus {
    configured: boolean;
    is_active: boolean;
    use_test_mode: boolean;
    funding_source_id: string | null;
    campaign_id: string | null;
    api_key_preview?: string; // First 8 chars for display
}

export interface TremendousRewardRecord {
    id: number;
    tenant_id: number;
    shop_id: number;
    order_id: string;
    tremendous_order_id: string | null;
    tremendous_reward_id: string | null;
    external_id: string;
    recipient_email: string;
    recipient_name: string;
    amount: string; // Decimal stored as string
    currency_code: string;
    status: TremendousRewardStatus;
    error_message: string | null;
    sent_by: number;
    sent_at: Date | null;
    delivered_at: Date | null;
    created_at: Date | null;
    updated_at: Date | null;
}

export interface TremendousRewardInput {
    tenant_id: number;
    shop_id: number;
    order_id: string;
    recipient_email: string;
    recipient_name: string;
    amount: number;
    currency_code?: string;
    sent_by: number;
}

export interface SendRewardParams {
    orderId: string;
    shopId: number;
    tenantId: number;
    recipientEmail: string;
    recipientName: string;
    amount: number;
    currencyCode?: string;
    sentBy: number;
    message?: string; // Custom message for the reward email
}

export interface SendRewardResult {
    success: boolean;
    rewardId?: string;
    orderId?: string;
    externalId?: string;
    error?: string;
}

export interface TestConnectionResult {
    success: boolean;
    message: string;
    fundingSources?: number;
    testMode?: boolean;
}
