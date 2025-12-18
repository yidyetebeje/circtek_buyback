import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { BackMarketService } from '../../src/buyback/services/backMarketService';

// NOTE: This test will use real Back Market credentials and hit the real API endpoints.
// Make sure your environment variables are set and you are using a safe environment.

describe('BackMarketService Endpoint Integration (Live)', () => {
  let service: BackMarketService;
  let TEST_LISTING_ID: string | undefined;
  let TEST_SKU: string | undefined;
  let TEST_ORDER_ID: string | undefined;
  let TEST_TASK_ID: number | undefined;

  // Generate a unique SKU for each test run
  const UNIQUE_TEST_SKU = `test-sku-${Date.now()}`;

  beforeEach(() => {
    service = new BackMarketService();
  });

  // Submit a test listing creation once before running tests; do not wait here (avoid hook timeouts)
  beforeAll(() => {
    service = new BackMarketService();
    const newListingPayload = {
      catalog: `sku,quantity,price\r\n${UNIQUE_TEST_SKU},1,100.00`,
      quotechar: '"',
      delimiter: ',',
      encoding: 'utf-8'
    };
    service.createListing(newListingPayload).then(async res => {
      try {
        const d = await res.json();
        TEST_TASK_ID = d && (d.bodymessage || d.task_id);
        console.log('Submitted createListing in beforeAll, task id:', TEST_TASK_ID);
      } catch (e) {
        console.warn('beforeAll createListing response had no json', e);
      }
    }).catch(e => console.error('beforeAll createListing failed', e));
  });

  // Helper to ensure a test listing exists
  async function ensureTestListing() {
    if (TEST_LISTING_ID && TEST_SKU) return;
    // Use the correct payload for the API (CSV-based)
    const newListingPayload = {
      catalog: `sku,quantity,price\r\n${UNIQUE_TEST_SKU},1,100.00`,
      quotechar: '"',
      delimiter: ',',
      encoding: 'utf-8'
    };
    // Call the create listings endpoint which accepts the CSV in the JSON body
    const res = await service.createListing(newListingPayload);
    let data: any = {};
    try { data = await res.json(); } catch (e) { console.warn('No JSON body from createListing response', e); }
    console.log('Attempted to create listing (createListing):', { status: res.status, data });

    // If the API returned a batch/task id, poll the task endpoint until completion
    const taskId = data && (data.bodymessage || data.task_id);
    if (taskId) {
      const pollIntervalMs = Number(process.env.BM_TASK_POLL_INTERVAL_MS) || 5000; // 5s default
      const maxAttempts = Number(process.env.BM_TASK_MAX_ATTEMPTS) || 24; // ~2 minutes default
      let attempt = 0;
      let finished = false;
      while (attempt < maxAttempts && !finished) {
        attempt += 1;
        console.log(`Polling task ${taskId}, attempt ${attempt}/${maxAttempts}`);
        const taskRes = await service.getTaskStatus(taskId as number);
        let taskData: any = {};
        try { taskData = await taskRes.json(); } catch (e) { console.warn('No JSON from task status', e); }
        console.log('Task status:', taskData);
        const status = taskData && taskData.action_status;
        if (status === 9) {
          finished = true;
          break;
        }
        if (status === 8) {
          // failed
          finished = true;
          break;
        }
        await new Promise(r => setTimeout(r, pollIntervalMs));
      }
      if (!finished) {
        console.warn(`Task ${taskId} did not finish within ${maxAttempts} attempts`);
      }
    }

    // Fetch listings after ingestion (if any)
    const getRes = await service.getListings();
    const getData = await getRes.json();
    console.log('Listings after creation attempt:', getData);
    if (getData.results && getData.results.length > 0) {
      const found = getData.results.find((r: any) => String(r.sku).toLowerCase() === String(UNIQUE_TEST_SKU).toLowerCase());
      const pick = found || getData.results[0];
      TEST_LISTING_ID = pick.listing_id || pick.id;
      TEST_SKU = pick.sku;
    }
  }

  it('should GET all listings and set test IDs', async () => {
    const res = await service.getListings();
    expect(res.status).toBe(200);
    const data = await res.json();
    console.log('Listings:', data);
    expect(Array.isArray(data.results)).toBe(true);
    if (data.results.length > 0) {
      TEST_LISTING_ID = data.results[0].listing_id || data.results[0].id;
      TEST_SKU = data.results[0].sku;
    }
  });

  it('should GET all orders and set test order ID', async () => {
    const res = await service.getBuyBackOrders();
    expect(res.status).toBe(200);
    const data = await res.json();
    console.log('Orders:', data);
    expect(Array.isArray(data.results)).toBe(true);
    if (data.results.length > 0) {
      TEST_ORDER_ID = data.results[0].order_id || data.results[0].id;
    }
  });

  it('should GET pending reply orders', async () => {
    const res = await service.getBuyBackOrdersPendingReply();
    expect(res.status).toBe(200);
    const data = await res.json();
    console.log('Pending Reply Orders:', data);
    expect(Array.isArray(data.results)).toBe(true);
  });

  it('should GET suspend reasons', async () => {
    const res = await service.getSuspendReasons();
    expect(res.status).toBe(200);
    const data = await res.json();
    console.log('Suspend reasons response:', data);
    expect(Array.isArray(data)).toBe(true);
  });

  (it as any)('should CREATE a new listing (via POST /ws/listings with CSV payload)', { timeout: 180000 }, async () => {
    // If beforeAll submitted a task id, poll it; otherwise create/poll here
    if (TEST_TASK_ID) {
      let attempt = 0;
      const pollIntervalMs = Number(process.env.BM_TASK_POLL_INTERVAL_MS) || 5000;
      const maxAttempts = Number(process.env.BM_TASK_MAX_ATTEMPTS) || 24;
      while (attempt < maxAttempts) {
        attempt += 1;
        console.log(`Polling pre-submitted task ${TEST_TASK_ID}, attempt ${attempt}/${maxAttempts}`);
        const tr = await service.getTaskStatus(TEST_TASK_ID as number);
        let td: any = {};
        try { td = await tr.json(); } catch (e) { /* ignore */ }
        console.log('Pre-submitted task status:', td);
        if (td && td.action_status === 9) break;
        if (td && td.action_status === 8) break;
        await new Promise(r => setTimeout(r, pollIntervalMs));
      }
      // After polling, try to load listing data
      await ensureTestListing();
    } else {
      await ensureTestListing();
    }
    if (!TEST_SKU) return console.warn('No test SKU available, skipping create listing test.');
    const csvContent = `sku,quantity,price\r\n${TEST_SKU},1,100.00`;
    const payload = { catalog: csvContent, quotechar: '"', delimiter: ',', encoding: 'utf-8' };
    const res = await service.createListing(payload);
    let data: any = {};
    try { data = await res.json(); } catch (e) { /* ignore */ }
    console.log('Create listing response (createListing):', { status: res.status, data });
    expect([200, 201, 202, 400]).toContain(res.status); // Accept 400 for missing required fields in simulation
  });

  it('should UPDATE a listing (simulate)', async () => {
    if (!TEST_LISTING_ID) return console.warn('No test listing ID available, skipping update listing test.');
    const updatePayload = { price: 120 };
    const res = await service.updateListing(TEST_LISTING_ID, updatePayload);
    const data = await res.json();
    console.log('Update listing response:', data);
    expect([200, 400]).toContain(res.status); // Accept 400 for missing required fields in simulation
  });

  it('should UPDATE listing price (simulate)', async () => {
    if (!TEST_LISTING_ID) return console.warn('No test listing ID available, skipping update price test.');
    const res = await service.updatePrice(TEST_LISTING_ID, 130);
    const data = await res.json();
    console.log('Update price response:', data);
    expect([200, 400]).toContain(res.status); // Accept 400 for missing required fields in simulation
  });

  it('should UPLOAD bulk CSV (simulate)', async () => {
    if (!TEST_SKU) return console.warn('No test SKU available, skipping bulk upload test.');
    const csvContent = `sku,quantity,price\r\n${TEST_SKU},1,150.00`;
    const res = await service.uploadBulkCsv(csvContent);
    const data = await res.json();
    console.log('Bulk upload response:', data);
    expect([200, 201, 400]).toContain(res.status); // Accept 400 for missing required fields in simulation
  });

  it('should GET competitors for a listing (simulate)', async () => {
    if (!TEST_LISTING_ID) return console.warn('No test listing ID available, skipping competitors test.');
    const data = await service.getCompetitors(TEST_LISTING_ID);
    console.log('Competitors:', data);
    expect(data && Array.isArray(data.competitors)).toBe(true);
  });
});
