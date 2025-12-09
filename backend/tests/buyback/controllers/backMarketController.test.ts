import { describe, it, expect, beforeEach } from 'bun:test';
import { getTaskHandler } from '../../../src/buyback/controllers/backMarketController';
import { backMarketService } from '../../../src/buyback/services/backMarketService';

describe('backMarketController getTaskHandler', () => {
  beforeEach(() => {
    // reset any mocks
  });

  it('returns task data when service returns 200', async () => {
    // Mock the service
    (backMarketService as any).getTaskStatus = async (taskId: number) => {
      return {
        status: 200,
        json: async () => ({ task_id: taskId, action_status: 9, result: { ok: true } })
      } as any;
    };

    const res = await getTaskHandler({ params: { taskId: '42' }, set: {} });
    expect(res).toEqual({ success: true, data: { task_id: 42, action_status: 9, result: { ok: true } } });
  });

  it('returns error when service returns non-200', async () => {
    (backMarketService as any).getTaskStatus = async (taskId: number) => {
      return {
        status: 404,
        statusText: 'Not Found',
        json: async () => ({})
      } as any;
    };

    const set: any = {};
    const res = await getTaskHandler({ params: { taskId: '99' }, set });
    expect(res).toEqual({ success: false, status: 404, message: 'Not Found' });
    expect(set.status).toBe(404);
  });
});
