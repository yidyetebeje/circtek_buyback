import { loadRateLimitConfig, saveRateLimitConfig } from '../../lib/bm-traffic-control/config';
import { RateLimitConfig } from '../../lib/bm-traffic-control/types';
import { backMarketService } from '../../buyback/services/backMarketService';

export const getRateLimitConfig = async () => {
    return await loadRateLimitConfig();
};

export const updateRateLimitConfig = async (config: RateLimitConfig) => {
    await saveRateLimitConfig(config);
    backMarketService.updateTrafficConfig(config);
    return { success: true, message: 'Configuration updated successfully' };
};
