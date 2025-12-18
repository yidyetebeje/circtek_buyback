/**
 * Tremendous Routes
 * 
 * API routes for Tremendous integration.
 * All routes require authentication.
 */

import { Elysia } from 'elysia';
import { tremendousController } from './controller';
import { requireRole } from '../auth';

export const tremendousRoutes = new Elysia({ prefix: '/tremendous' })
    // Config routes
    .use(requireRole(['admin', 'super_admin', 'shop_manager']))
    .get('/config/:shopId', tremendousController.getConfigStatus)
    .post('/config/:shopId', tremendousController.saveConfig)
    .post('/config/:shopId/test', tremendousController.testConnection)

    // Funding sources and campaigns
    .get('/funding-sources/:shopId', tremendousController.getFundingSources)
    .get('/campaigns/:shopId', tremendousController.getCampaigns)

    // Reward routes
    .post('/rewards/send', tremendousController.sendReward)
    .get('/rewards/order/:orderId', tremendousController.getRewardStatus);
