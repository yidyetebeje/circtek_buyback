/**
 * Tremendous Repository
 * 
 * Database operations for Tremendous configuration and reward tracking.
 * Handles encryption/decryption of API keys.
 */

import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../db/index';
import { tremendous_config, tremendous_rewards } from '../db/circtek.schema';
import type {
    TremendousConfigRecord,
    TremendousConfigInput,
    TremendousConfigStatus,
    TremendousRewardRecord,
    TremendousRewardInput,
    TremendousRewardStatus,
} from './types';

class TremendousRepository {
    constructor(private readonly database: typeof db) { }

    // ========== CONFIG METHODS ==========

    /**
     * Get Tremendous config for a shop (raw, with encrypted key)
     */
    async getConfig(shopId: number, tenantId: number): Promise<TremendousConfigRecord | null> {
        const [result] = await this.database
            .select()
            .from(tremendous_config)
            .where(
                and(
                    eq(tremendous_config.shop_id, shopId),
                    eq(tremendous_config.tenant_id, tenantId)
                )
            )
            .limit(1);

        return result || null;
    }

    /**
     * Get Tremendous config with decrypted API key
     * Use this when making API calls
     */
    async getConfigDecrypted(shopId: number, tenantId: number): Promise<(Omit<TremendousConfigRecord, 'api_key_encrypted'> & { api_key: string }) | null> {
        const { decrypt } = await import('../utils/encryption');

        const config = await this.getConfig(shopId, tenantId);
        if (!config) return null;

        const { api_key_encrypted, ...rest } = config;

        return {
            ...rest,
            api_key: decrypt(api_key_encrypted),
        };
    }

    /**
     * Get config status (safe to expose to frontend)
     */
    async getConfigStatus(shopId: number, tenantId: number): Promise<TremendousConfigStatus> {
        const { decrypt } = await import('../utils/encryption');

        const config = await this.getConfig(shopId, tenantId);

        if (!config) {
            return {
                configured: false,
                is_active: false,
                use_test_mode: true,
                funding_source_id: null,
                campaign_id: null,
            };
        }

        // Decrypt to get a preview (first 8 chars)
        let apiKeyPreview: string | undefined;
        try {
            const decryptedKey = decrypt(config.api_key_encrypted);
            apiKeyPreview = decryptedKey.substring(0, 8) + '...';
        } catch {
            apiKeyPreview = 'INVALID';
        }

        return {
            configured: true,
            is_active: config.is_active ?? true,
            use_test_mode: config.use_test_mode ?? true,
            funding_source_id: config.funding_source_id,
            campaign_id: config.campaign_id,
            api_key_preview: apiKeyPreview,
        };
    }

    /**
     * Save or update Tremendous config
     * Encrypts API key before storage
     */
    async saveConfig(data: TremendousConfigInput, tenantId: number): Promise<void> {
        const { encrypt } = await import('../utils/encryption');

        const existing = await this.getConfig(data.shop_id, tenantId);

        if (existing) {
            // Update existing config
            const updateData: Record<string, unknown> = {
                updated_at: sql`CURRENT_TIMESTAMP`,
            };

            // Only update API key if provided
            if (data.api_key) {
                updateData.api_key_encrypted = encrypt(data.api_key);
            }

            if (data.funding_source_id !== undefined) {
                updateData.funding_source_id = data.funding_source_id;
            }
            if (data.campaign_id !== undefined) {
                updateData.campaign_id = data.campaign_id;
            }
            if (data.use_test_mode !== undefined) {
                updateData.use_test_mode = data.use_test_mode;
            }
            if (data.is_active !== undefined) {
                updateData.is_active = data.is_active;
            }

            await this.database
                .update(tremendous_config)
                .set(updateData)
                .where(eq(tremendous_config.id, existing.id));
        } else {
            // Create new config - API key is required for new configs
            if (!data.api_key) {
                throw new Error('API key is required when creating new Tremendous configuration');
            }

            const encryptedApiKey = encrypt(data.api_key);

            await this.database.insert(tremendous_config).values({
                tenant_id: tenantId,
                shop_id: data.shop_id,
                api_key_encrypted: encryptedApiKey,
                funding_source_id: data.funding_source_id ?? null,
                campaign_id: data.campaign_id ?? null,
                use_test_mode: data.use_test_mode ?? true,
                is_active: data.is_active ?? true,
            });
        }
    }

    // ========== REWARD TRACKING METHODS ==========

    /**
     * Create a reward record (before sending to Tremendous)
     */
    async createRewardRecord(data: TremendousRewardInput, externalId: string): Promise<TremendousRewardRecord> {
        const [result] = await this.database
            .insert(tremendous_rewards)
            .values({
                tenant_id: data.tenant_id,
                shop_id: data.shop_id,
                order_id: data.order_id,
                external_id: externalId,
                recipient_email: data.recipient_email,
                recipient_name: data.recipient_name,
                amount: data.amount.toFixed(2),
                currency_code: data.currency_code || 'EUR',
                status: 'pending',
                sent_by: data.sent_by,
            })
            .$returningId();

        const [record] = await this.database
            .select()
            .from(tremendous_rewards)
            .where(eq(tremendous_rewards.id, result.id))
            .limit(1);

        return record as TremendousRewardRecord;
    }

    /**
     * Update reward with Tremendous response data
     */
    async updateRewardSent(
        externalId: string,
        data: {
            tremendous_order_id: string;
            tremendous_reward_id: string;
        }
    ): Promise<void> {
        await this.database
            .update(tremendous_rewards)
            .set({
                tremendous_order_id: data.tremendous_order_id,
                tremendous_reward_id: data.tremendous_reward_id,
                status: 'sent',
                sent_at: sql`CURRENT_TIMESTAMP`,
                updated_at: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(tremendous_rewards.external_id, externalId));
    }

    /**
     * Update reward status
     */
    async updateRewardStatus(
        externalId: string,
        status: TremendousRewardStatus,
        errorMessage?: string
    ): Promise<void> {
        const updateData: Record<string, unknown> = {
            status,
            updated_at: sql`CURRENT_TIMESTAMP`,
        };

        if (errorMessage) {
            updateData.error_message = errorMessage;
        }

        if (status === 'delivered') {
            updateData.delivered_at = sql`CURRENT_TIMESTAMP`;
        }

        await this.database
            .update(tremendous_rewards)
            .set(updateData)
            .where(eq(tremendous_rewards.external_id, externalId));
    }

    /**
     * Get reward by order ID
     */
    async getRewardByOrderId(orderId: string, tenantId: number): Promise<TremendousRewardRecord | null> {
        const [result] = await this.database
            .select()
            .from(tremendous_rewards)
            .where(
                and(
                    eq(tremendous_rewards.order_id, orderId),
                    eq(tremendous_rewards.tenant_id, tenantId)
                )
            )
            .orderBy(desc(tremendous_rewards.created_at))
            .limit(1);

        return result as TremendousRewardRecord || null;
    }

    /**
     * Get reward by external ID
     */
    async getRewardByExternalId(externalId: string): Promise<TremendousRewardRecord | null> {
        const [result] = await this.database
            .select()
            .from(tremendous_rewards)
            .where(eq(tremendous_rewards.external_id, externalId))
            .limit(1);

        return result as TremendousRewardRecord || null;
    }

    /**
     * Check if a reward has already been sent for an order
     */
    async hasRewardBeenSent(orderId: string, tenantId: number): Promise<boolean> {
        const reward = await this.getRewardByOrderId(orderId, tenantId);
        return reward !== null && reward.status !== 'failed' && reward.status !== 'cancelled';
    }
}

// Export singleton instance
export const tremendousRepository = new TremendousRepository(db);
