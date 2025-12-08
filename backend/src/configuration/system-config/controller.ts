import { loadRateLimitConfig, saveRateLimitConfig } from '../../lib/bm-traffic-control/config';
import { RateLimitConfig } from '../../lib/bm-traffic-control/types';
import { backMarketService } from '../../buyback/services/backMarketService';
import { db } from '../../db';
import { system_config } from '../../db/circtek.schema';
import { eq } from 'drizzle-orm';

export const getRateLimitConfig = async () => {
    return await loadRateLimitConfig();
};

export const updateRateLimitConfig = async (config: RateLimitConfig) => {
    await saveRateLimitConfig(config);
    backMarketService.updateTrafficConfig(config);
    return { success: true, message: 'Configuration updated successfully' };
};

export const getBackMarketConfig = async () => {
    const configRecord = await db.select().from(system_config).where(eq(system_config.key, 'backmarket_general_config')).limit(1);
    if (configRecord.length > 0) {
        return configRecord[0].value;
    }
    return { marketplace: 'fr-fr', currency: 'EUR' }; // Default
};

export const updateBackMarketConfig = async (config: { marketplace: string, currency: string }) => {
    const existing = await db.select().from(system_config).where(eq(system_config.key, 'backmarket_general_config')).limit(1);
    
    if (existing.length > 0) {
        await db.update(system_config)
            .set({ value: config })
            .where(eq(system_config.key, 'backmarket_general_config'));
    } else {
        await db.insert(system_config).values({
            key: 'backmarket_general_config',
            value: config,
            description: 'General configuration for Back Market integration'
        });
    }
    return { success: true, message: 'Configuration updated successfully' };
};
