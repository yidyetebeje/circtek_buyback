import { Elysia, t } from 'elysia';
import { getRateLimitConfig, updateRateLimitConfig, getBackMarketConfig, updateBackMarketConfig } from './controller';

export const system_config_routes = new Elysia({ prefix: '/system-config' })
    .get('/rate-limits', () => getRateLimitConfig())
    .put('/rate-limits', ({ body }) => updateRateLimitConfig(body as any), {
        body: t.Object({
            global: t.Object({ intervalMs: t.Number(), maxRequests: t.Number() }),
            catalog: t.Object({ intervalMs: t.Number(), maxRequests: t.Number() }),
            competitor: t.Object({ intervalMs: t.Number(), maxRequests: t.Number() }),
            care: t.Object({ intervalMs: t.Number(), maxRequests: t.Number() }),
        })
    })
    .get('/backmarket', () => getBackMarketConfig())
    .put('/backmarket', ({ body }) => updateBackMarketConfig(body as any), {
        body: t.Object({
            marketplace: t.String(),
            currency: t.String()
        })
    });
