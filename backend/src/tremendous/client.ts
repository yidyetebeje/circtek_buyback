/**
 * Tremendous API Client
 * 
 * Factory functions to create configured Tremendous API clients.
 * Uses the official `tremendous` npm package with TypeScript support.
 * 
 * @see https://github.com/tremendous-rewards/tremendous-node
 */

import {
    Configuration,
    Environments,
    OrdersApi,
    FundingSourcesApi,
    CampaignsApi,
    RewardsApi,
    CreateOrderRequest,
} from 'tremendous';

/**
 * Create configured Tremendous API clients
 * 
 * @param apiKey - Tremendous API key (sandbox or production)
 * @param useTestMode - If true, uses sandbox environment (testflight)
 * @returns Object containing all Tremendous API clients
 */
export function createTremendousClients(apiKey: string, useTestMode: boolean = true) {
    const configuration = new Configuration({
        basePath: useTestMode ? Environments.testflight : Environments.production,
        accessToken: apiKey,
    });

    return {
        orders: new OrdersApi(configuration),
        fundingSources: new FundingSourcesApi(configuration),
        campaigns: new CampaignsApi(configuration),
        rewards: new RewardsApi(configuration),
        configuration,
        isTestMode: useTestMode,
    };
}

export type TremendousClients = ReturnType<typeof createTremendousClients>;

/**
 * Generate an idempotency key for a reward
 * Format: order_{orderId}_{timestamp}
 * 
 * This ensures the same order won't accidentally receive multiple rewards
 */
export function generateRewardExternalId(orderId: string): string {
    const timestamp = Date.now();
    return `order_${orderId}_${timestamp}`;
}

/**
 * Build a CreateOrderRequest for sending a reward
 * 
 * @param params - Reward parameters
 * @returns Configured CreateOrderRequest for the Tremendous API
 */
export function buildRewardOrderRequest(params: {
    externalId: string;
    fundingSourceId: string;
    recipientEmail: string;
    recipientName: string;
    amount: number;
    currencyCode: string;
    campaignId?: string;
    message?: string;
}): CreateOrderRequest {
    return {
        external_id: params.externalId,
        payment: {
            funding_source_id: params.fundingSourceId,
        },
        reward: {
            delivery: {
                method: 'EMAIL',
            },
            recipient: {
                name: params.recipientName,
                email: params.recipientEmail,
            },
            value: {
                denomination: params.amount,
                currency_code: params.currencyCode as any,
            },
            ...(params.campaignId && { campaign_id: params.campaignId }),
        },
    };
}

/**
 * Test connection to Tremendous API
 * Attempts to fetch funding sources to verify credentials
 * 
 * @param clients - Tremendous API clients
 * @returns Test result with success status and message
 */
export async function testTremendousConnection(clients: TremendousClients): Promise<{
    success: boolean;
    message: string;
    fundingSources?: number;
}> {
    try {
        const { data } = await clients.fundingSources.listFundingSources();
        const count = (data as any).funding_sources?.length ?? 0;

        return {
            success: true,
            message: `Connection successful! Found ${count} funding source(s).`,
            fundingSources: count,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Tremendous] Connection test failed:', message);

        return {
            success: false,
            message: `Connection failed: ${message}`,
        };
    }
}
