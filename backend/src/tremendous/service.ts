/**
 * Tremendous Service
 * 
 * Business logic for sending rewards via Tremendous API.
 * Handles idempotency, error handling, and audit logging.
 */

import { tremendousRepository } from './repository';
import {
    createTremendousClients,
    generateRewardExternalId,
    buildRewardOrderRequest,
    testTremendousConnection,
    TremendousClients,
} from './client';
import type {
    SendRewardParams,
    SendRewardResult,
    TestConnectionResult,
    TremendousConfigStatus,
} from './types';

class TremendousService {
    /**
     * Send a reward to a customer
     * 
     * This is the main method for sending rewards. It:
     * 1. Validates the shop has Tremendous configured
     * 2. Checks for duplicate rewards (idempotency)
     * 3. Creates an audit record
     * 4. Sends the reward via Tremendous API
     * 5. Updates the audit record with the result
     */
    async sendReward(params: SendRewardParams): Promise<SendRewardResult> {
        const {
            orderId,
            shopId,
            tenantId,
            recipientEmail,
            recipientName,
            amount,
            currencyCode = 'EUR',
            sentBy,
            message,
        } = params;

        console.log(`[TremendousService] Sending reward for order ${orderId} to ${recipientEmail}`);

        try {
            // 1. Check if reward already sent for this order
            const existingReward = await tremendousRepository.getRewardByOrderId(orderId, tenantId);
            if (existingReward && existingReward.status !== 'failed' && existingReward.status !== 'cancelled') {
                console.log(`[TremendousService] Reward already sent for order ${orderId}`);
                return {
                    success: false,
                    error: 'A reward has already been sent for this order',
                    rewardId: existingReward.tremendous_reward_id ?? undefined,
                    externalId: existingReward.external_id,
                };
            }

            // 2. Get Tremendous config for this shop
            const config = await tremendousRepository.getConfigDecrypted(shopId, tenantId);
            if (!config) {
                throw new Error('Tremendous is not configured for this shop');
            }

            if (!config.is_active) {
                throw new Error('Tremendous integration is disabled for this shop');
            }

            if (!config.funding_source_id) {
                throw new Error('No funding source configured. Please configure a funding source in settings.');
            }

            // 3. Generate idempotency key
            const externalId = generateRewardExternalId(orderId);

            // 4. Create audit record
            await tremendousRepository.createRewardRecord({
                tenant_id: tenantId,
                shop_id: shopId,
                order_id: orderId,
                recipient_email: recipientEmail,
                recipient_name: recipientName,
                amount,
                currency_code: currencyCode,
                sent_by: sentBy,
            }, externalId);

            // 5. Create Tremendous clients
            const clients = createTremendousClients(config.api_key, config.use_test_mode ?? true);

            // 6. Build and send the reward
            const orderRequest = buildRewardOrderRequest({
                externalId,
                fundingSourceId: config.funding_source_id,
                recipientEmail,
                recipientName,
                amount,
                currencyCode,
                campaignId: config.campaign_id ?? undefined,
                message,
            });

            console.log(`[TremendousService] Sending request to Tremendous (testMode: ${config.use_test_mode})`);

            const { data } = await clients.orders.createOrder(orderRequest);

            // 7. Update audit record with success
            const tremendousOrderId = data.order?.id;
            const tremendousRewardId = data.order?.rewards?.[0]?.id;

            if (tremendousOrderId && tremendousRewardId) {
                await tremendousRepository.updateRewardSent(externalId, {
                    tremendous_order_id: tremendousOrderId,
                    tremendous_reward_id: tremendousRewardId,
                });
            }

            console.log(`[TremendousService] Reward sent successfully: ${tremendousRewardId}`);

            return {
                success: true,
                rewardId: tremendousRewardId,
                orderId: tremendousOrderId,
                externalId,
            };

        } catch (error: any) {
            let errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Extract detailed error from Tremendous API response
            if (error?.response?.data) {
                const apiError = error.response.data;
                console.error('[TremendousService] API Error Details:', JSON.stringify(apiError, null, 2));

                if (apiError.errors && typeof apiError.errors === 'object') {
                    const validationErrors = Object.entries(apiError.errors)
                        .map(([field, msgs]) => `${field}: ${(msgs as any[]).join(', ')}`)
                        .join('; ');
                    errorMessage = `Tremendous API Error: ${validationErrors}`;
                } else if (apiError.message) {
                    errorMessage = `Tremendous API Error: ${apiError.message}`;
                }
            }

            console.error(`[TremendousService] Failed to send reward for order ${orderId}:`, errorMessage);

            // Try to update the reward record as failed
            try {
                const existing = await tremendousRepository.getRewardByOrderId(orderId, tenantId);
                if (existing) {
                    await tremendousRepository.updateRewardStatus(existing.external_id, 'failed', errorMessage);
                }
            } catch (updateError) {
                console.error('[TremendousService] Failed to update reward status:', updateError);
            }

            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Test connection to Tremendous API
     */
    async testConnection(shopId: number, tenantId: number): Promise<TestConnectionResult> {
        try {
            const config = await tremendousRepository.getConfigDecrypted(shopId, tenantId);

            if (!config) {
                return {
                    success: false,
                    message: 'Tremendous is not configured for this shop',
                };
            }

            const clients = createTremendousClients(config.api_key, config.use_test_mode ?? true);
            const result = await testTremendousConnection(clients);

            return {
                ...result,
                testMode: config.use_test_mode ?? true,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                message: `Connection test failed: ${message}`,
            };
        }
    }

    /**
     * Get config status (safe to expose to frontend)
     */
    async getConfigStatus(shopId: number, tenantId: number): Promise<TremendousConfigStatus> {
        return tremendousRepository.getConfigStatus(shopId, tenantId);
    }

    /**
     * Save or update Tremendous config
     */
    async saveConfig(
        shopId: number,
        tenantId: number,
        data: {
            api_key?: string;
            funding_source_id?: string | null;
            campaign_id?: string | null;
            use_test_mode?: boolean;
            is_active?: boolean;
        }
    ): Promise<void> {
        await tremendousRepository.saveConfig({
            shop_id: shopId,
            ...data,
        }, tenantId);
    }

    /**
     * Get funding sources from Tremendous
     */
    async getFundingSources(shopId: number, tenantId: number): Promise<{ id: string; method: string; meta?: Record<string, unknown> }[]> {
        const config = await tremendousRepository.getConfigDecrypted(shopId, tenantId);
        if (!config) {
            throw new Error('Tremendous is not configured for this shop');
        }

        const clients = createTremendousClients(config.api_key, config.use_test_mode ?? true);
        const { data } = await clients.fundingSources.listFundingSources();

        return (data.funding_sources || []).map((fs: any) => ({
            id: fs.id || '',
            method: fs.method || 'unknown',
            meta: fs.meta as Record<string, unknown>,
        }));
    }

    /**
     * Get campaigns from Tremendous
     */
    async getCampaigns(shopId: number, tenantId: number): Promise<{ id: string; name: string; description?: string }[]> {
        const config = await tremendousRepository.getConfigDecrypted(shopId, tenantId);
        if (!config) {
            throw new Error('Tremendous is not configured for this shop');
        }

        const clients = createTremendousClients(config.api_key, config.use_test_mode ?? true);
        const { data } = await clients.campaigns.listCampaigns();

        return (data.campaigns || []).map((c: any) => ({
            id: c.id || '',
            name: c.name || 'Unnamed Campaign',
            description: c.description ?? undefined,
        }));
    }

    /**
     * Get reward status for an order
     */
    async getRewardStatus(orderId: string, tenantId: number): Promise<{
        hasSentReward: boolean;
        status?: string;
        amount?: string;
        recipientEmail?: string;
        sentAt?: Date | null;
    }> {
        const reward = await tremendousRepository.getRewardByOrderId(orderId, tenantId);

        if (!reward) {
            return { hasSentReward: false };
        }

        return {
            hasSentReward: true,
            status: reward.status,
            amount: reward.amount,
            recipientEmail: reward.recipient_email,
            sentAt: reward.sent_at,
        };
    }
}

// Export singleton instance
export const tremendousService = new TremendousService();
