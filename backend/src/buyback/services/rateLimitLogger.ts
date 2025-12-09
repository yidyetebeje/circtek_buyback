import { db } from '../../db';
import { rate_limit_logs } from '../../db/circtek.schema';
import { RateLimitLog } from '../../lib/bm-traffic-control/types';

export async function logRateLimitRequest(log: RateLimitLog): Promise<void> {
  try {
    await db.insert(rate_limit_logs).values({
      endpoint: log.endpoint,
      priority: log.priority,
      status: log.status,
      response_status: log.responseStatus || null,
      duration: log.duration || null,
      timestamp: log.timestamp,
    });
  } catch (error) {
    console.error('Failed to log rate limit request:', error);
  }
}
