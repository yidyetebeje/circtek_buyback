/**
 * Tremendous Module
 * 
 * Integration with Tremendous API for sending digital rewards.
 * @see https://developers.tremendous.com
 */

export { tremendousController } from './controller';
export { tremendousService } from './service';
export { tremendousRepository } from './repository';
export { tremendousRoutes } from './routes';
export {
    createTremendousClients,
    generateRewardExternalId,
    buildRewardOrderRequest,
    testTremendousConnection,
} from './client';
export type * from './types';
