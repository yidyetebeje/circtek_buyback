/**
 * Tremendous Controller
 * 
 * HTTP handlers for Tremendous API endpoints.
 */

import { Context } from 'elysia';
import { tremendousService } from './service';
import { ForbiddenError, BadRequestError, NotFoundError } from '../buyback/utils/errors';

/**
 * Build user context from Elysia context
 */
function getUserContext(context: any): { userId: number; tenantId: number; role: string } | null {
    const { currentUserId, currentTenantId, currentRole } = context;
    if (!currentUserId) return null;

    return {
        userId: currentUserId,
        tenantId: currentTenantId,
        role: currentRole,
    };
}

/**
 * Check if user has admin privileges
 */
function isAdmin(role: string): boolean {
    return role === 'admin' || role === 'super_admin' || role === 'shop_manager';
}

export class TremendousController {
    /**
     * Get Tremendous config status for a shop
     * GET /api/v1/tremendous/config/:shopId
     */
    getConfigStatus = async (context: Context) => {
        try {
            const { params } = context as any;
            const user = getUserContext(context);

            if (!user) {
                throw new ForbiddenError('Authentication required');
            }

            const shopId = parseInt(params.shopId, 10);
            if (isNaN(shopId)) {
                throw new BadRequestError('Invalid shop ID');
            }

            const status = await tremendousService.getConfigStatus(shopId, user.tenantId);

            return { data: status };
        } catch (error: any) {
            console.error('[TremendousController] getConfigStatus error:', error);
            if (error instanceof ForbiddenError) {
                context.set.status = 403;
                return { error: error.message };
            }
            if (error instanceof BadRequestError) {
                context.set.status = 400;
                return { error: error.message };
            }
            context.set.status = 500;
            return { error: error.message || 'Failed to get config status' };
        }
    };

    /**
     * Save or update Tremendous config for a shop
     * POST /api/v1/tremendous/config/:shopId
     */
    saveConfig = async (context: Context) => {
        try {
            const { params, body } = context as any;
            const user = getUserContext(context);

            if (!user) {
                throw new ForbiddenError('Authentication required');
            }

            if (!isAdmin(user.role)) {
                throw new ForbiddenError('Admin privileges required');
            }

            const shopId = parseInt(params.shopId, 10);
            if (isNaN(shopId)) {
                throw new BadRequestError('Invalid shop ID');
            }

            const { api_key, funding_source_id, campaign_id, use_test_mode, is_active } = body as {
                api_key?: string;
                funding_source_id?: string | null;
                campaign_id?: string | null;
                use_test_mode?: boolean;
                is_active?: boolean;
            };

            await tremendousService.saveConfig(shopId, user.tenantId, {
                api_key,
                funding_source_id,
                campaign_id,
                use_test_mode,
                is_active,
            });

            return {
                success: true,
                message: 'Tremendous configuration saved successfully',
            };
        } catch (error: any) {
            console.error('[TremendousController] saveConfig error:', error);
            if (error instanceof ForbiddenError) {
                context.set.status = 403;
                return { error: error.message };
            }
            if (error instanceof BadRequestError) {
                context.set.status = 400;
                return { error: error.message };
            }
            context.set.status = 500;
            return { error: error.message || 'Failed to save config' };
        }
    };

    /**
     * Test Tremendous connection
     * POST /api/v1/tremendous/config/:shopId/test
     */
    testConnection = async (context: Context) => {
        try {
            const { params } = context as any;
            const user = getUserContext(context);

            if (!user) {
                throw new ForbiddenError('Authentication required');
            }

            const shopId = parseInt(params.shopId, 10);
            if (isNaN(shopId)) {
                throw new BadRequestError('Invalid shop ID');
            }

            const result = await tremendousService.testConnection(shopId, user.tenantId);

            return { data: result };
        } catch (error: any) {
            console.error('[TremendousController] testConnection error:', error);
            if (error instanceof ForbiddenError) {
                context.set.status = 403;
                return { error: error.message };
            }
            context.set.status = 500;
            return { error: error.message || 'Failed to test connection' };
        }
    };

    /**
     * Get funding sources from Tremendous
     * GET /api/v1/tremendous/funding-sources/:shopId
     */
    getFundingSources = async (context: Context) => {
        try {
            const { params } = context as any;
            const user = getUserContext(context);

            if (!user) {
                throw new ForbiddenError('Authentication required');
            }

            const shopId = parseInt(params.shopId, 10);
            if (isNaN(shopId)) {
                throw new BadRequestError('Invalid shop ID');
            }

            const fundingSources = await tremendousService.getFundingSources(shopId, user.tenantId);

            return { data: fundingSources };
        } catch (error: any) {
            console.error('[TremendousController] getFundingSources error:', error);
            if (error instanceof ForbiddenError) {
                context.set.status = 403;
                return { error: error.message };
            }
            context.set.status = 500;
            return { error: error.message || 'Failed to get funding sources' };
        }
    };

    /**
     * Get campaigns from Tremendous
     * GET /api/v1/tremendous/campaigns/:shopId
     */
    getCampaigns = async (context: Context) => {
        try {
            const { params } = context as any;
            const user = getUserContext(context);

            if (!user) {
                throw new ForbiddenError('Authentication required');
            }

            const shopId = parseInt(params.shopId, 10);
            if (isNaN(shopId)) {
                throw new BadRequestError('Invalid shop ID');
            }

            const campaigns = await tremendousService.getCampaigns(shopId, user.tenantId);

            return { data: campaigns };
        } catch (error: any) {
            console.error('[TremendousController] getCampaigns error:', error);
            if (error instanceof ForbiddenError) {
                context.set.status = 403;
                return { error: error.message };
            }
            context.set.status = 500;
            return { error: error.message || 'Failed to get campaigns' };
        }
    };

    /**
     * Send reward for an order
     * POST /api/v1/tremendous/rewards/send
     */
    sendReward = async (context: Context) => {
        try {
            const { body } = context as any;
            const user = getUserContext(context);

            if (!user) {
                throw new ForbiddenError('Authentication required');
            }

            if (!isAdmin(user.role)) {
                throw new ForbiddenError('Admin privileges required to send rewards');
            }

            const {
                order_id,
                shop_id,
                recipient_email,
                recipient_name,
                amount,
                currency_code,
                message,
            } = body as {
                order_id: string;
                shop_id: number;
                recipient_email: string;
                recipient_name: string;
                amount: number;
                currency_code?: string;
                message?: string;
            };

            // Validate required fields
            if (!order_id || !shop_id || !recipient_email || !recipient_name || !amount) {
                throw new BadRequestError('Missing required fields: order_id, shop_id, recipient_email, recipient_name, amount');
            }

            if (amount <= 0) {
                throw new BadRequestError('Amount must be greater than 0');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(recipient_email)) {
                throw new BadRequestError('Invalid email address format');
            }

            const result = await tremendousService.sendReward({
                orderId: order_id,
                shopId: shop_id,
                tenantId: user.tenantId,
                recipientEmail: recipient_email,
                recipientName: recipient_name,
                amount,
                currencyCode: currency_code,
                sentBy: user.userId,
                message,
            });

            if (!result.success) {
                context.set.status = 400;
                return {
                    success: false,
                    error: result.error,
                };
            }

            return {
                success: true,
                reward_id: result.rewardId,
                order_id: result.orderId,
                external_id: result.externalId,
                message: 'Reward sent successfully',
            };
        } catch (error: any) {
            console.error('[TremendousController] sendReward error:', error);
            if (error instanceof ForbiddenError) {
                context.set.status = 403;
                return { error: error.message };
            }
            if (error instanceof BadRequestError) {
                context.set.status = 400;
                return { error: error.message };
            }
            context.set.status = 500;
            return { error: error.message || 'Failed to send reward' };
        }
    };

    /**
     * Get reward status for an order
     * GET /api/v1/tremendous/rewards/order/:orderId
     */
    getRewardStatus = async (context: Context) => {
        try {
            const { params } = context as any;
            const user = getUserContext(context);

            if (!user) {
                throw new ForbiddenError('Authentication required');
            }

            const { orderId } = params as { orderId: string };
            if (!orderId) {
                throw new BadRequestError('Order ID is required');
            }

            const status = await tremendousService.getRewardStatus(orderId, user.tenantId);

            return { data: status };
        } catch (error: any) {
            console.error('[TremendousController] getRewardStatus error:', error);
            if (error instanceof ForbiddenError) {
                context.set.status = 403;
                return { error: error.message };
            }
            context.set.status = 500;
            return { error: error.message || 'Failed to get reward status' };
        }
    };
}

// Export singleton instance
export const tremendousController = new TremendousController();
