import { describe, it, expect, mock, spyOn, beforeEach } from 'bun:test';
import { BackMarketService } from '../../../src/buyback/services/backMarketService';
import { Priority, TrafficController } from '../../../src/lib/bm-traffic-control';

describe('BackMarketService', () => {
  let service: BackMarketService;
  let mockTraffic: any;

  beforeEach(() => {
    mockTraffic = {
      scheduleRequest: mock(() => Promise.resolve(new Response(JSON.stringify({ competitors: [] }))))
    };
    service = new BackMarketService(mockTraffic as unknown as TrafficController);
  });

  it('should run price probe', async () => {
    const price = await service.runPriceProbe('123', 100);
    expect(price).toBeDefined();
    // Dip (POST), Peek (GET), Peak (POST)
    expect(mockTraffic.scheduleRequest).toHaveBeenCalledTimes(3); 
  });
});
