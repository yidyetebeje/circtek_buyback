import { describe, it, expect, beforeEach } from 'bun:test'
import { buildApp } from '../src/app'
import { ensureRole, ensureTenant, ensureWarehouse, resetDb } from './utils/db'
import { getToken } from './utils/auth'

async function getTokenWithRole(server: (req: Request) => Promise<Response>, roleName: string, tenantName: string, username: string) {
  return await getToken(server, roleName, tenantName, username)
}

describe('Diagnostics Stats routes', () => {
  beforeEach(async () => {
    await resetDb()
    await ensureRole('super_admin')
    await ensureRole('tester')
    await ensureTenant('t1')
  })

  it('should require auth for all stats endpoints', async () => {
    const app = buildApp()
    const server = app.handle

    const endpoints = [
      'overview', 'timeseries', 'warehouses', 'testers', 'device-types'
    ]
    for (const ep of endpoints) {
      const res = await server(new Request(`http://localhost/api/v1/diagnostics/stats/${ep}`))
      expect([401, 403]).toContain(res.status)
    }
  })

  it('should return overview, timeseries (with device_type filter), warehouse/tester throughput and device_type distribution', async () => {
    const app = buildApp()
    const server = app.handle
    const { token, tenantId } = await getToken(server, 'tester')
    const warehouseId = await ensureWarehouse('Main', tenantId)

    // Seed diagnostics data: 2 x iPhone, 1 x Android
    const uploads = [
      {
        device: { make: 'Apple', model_no: 'A1', model_name: 'X', device_type: 'iPhone', serial: 'SER-A', imei: '111', lpn: 'LPN-A', description: 'A iPhone' },
        test: { warehouse_id: warehouseId, passed_components: 'screen', failed_components: 'mic', pending_components: 'camera', serial_number: 'SER-A', imei: '111', lpn: 'LPN-A' }
      },
      {
        device: { make: 'Samsung', model_no: 'S1', model_name: 'Galaxy', device_type: 'Android', serial: 'SER-B', imei: '222', lpn: 'LPN-B', description: 'Android device' },
        test: { warehouse_id: warehouseId, passed_components: 'speaker', failed_components: '', pending_components: '', serial_number: 'SER-B', imei: '222', lpn: 'LPN-B' }
      },
      {
        device: { make: 'Apple', model_no: 'A2', model_name: 'Y', device_type: 'iPhone', serial: 'SER-C', imei: '333', lpn: 'LPN-C', description: 'A iPhone 2' },
        test: { warehouse_id: warehouseId, passed_components: 'battery', failed_components: '', pending_components: '', serial_number: 'SER-C', imei: '333', lpn: 'LPN-C' }
      }
    ]

    for (const payload of uploads) {
      const up = await server(new Request('http://localhost/api/v1/diagnostics/tests/upload', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(payload)
      }))
      expect(up.status).toBe(200)
      const upBody = await up.json()
      expect([200, 201]).toContain(upBody.status)
    }

    // Overview
    const overview = await server(new Request('http://localhost/api/v1/diagnostics/stats/overview', { headers: { authorization: `Bearer ${token}` } }))
    expect(overview.status).toBe(200)
    const overviewBody = await overview.json()
    expect(overviewBody.status).toBe(200)
    expect(overviewBody.data.total_all_time).toBe(3)
    expect(overviewBody.data.unlabeled_all_time).toBe(3)

    // Time series (all)
    const tsAll = await server(new Request('http://localhost/api/v1/diagnostics/stats/timeseries?interval=day', { headers: { authorization: `Bearer ${token}` } }))
    expect(tsAll.status).toBe(200)
    const tsAllBody = await tsAll.json()
    expect(tsAllBody.status).toBe(200)
    const totalAll = (tsAllBody.data as Array<any>).reduce((sum, p) => sum + p.count, 0)
    expect(totalAll).toBe(3)

    // Time series filtered by device_type=iPhone
    const tsIphone = await server(new Request('http://localhost/api/v1/diagnostics/stats/timeseries?interval=day&device_type=iPhone', { headers: { authorization: `Bearer ${token}` } }))
    expect(tsIphone.status).toBe(200)
    const tsIphoneBody = await tsIphone.json()
    expect(tsIphoneBody.status).toBe(200)
    const totalIphone = (tsIphoneBody.data as Array<any>).reduce((sum, p) => sum + p.count, 0)
    expect(totalIphone).toBe(2)

    // By warehouse
    const byWh = await server(new Request('http://localhost/api/v1/diagnostics/stats/warehouses', { headers: { authorization: `Bearer ${token}` } }))
    expect(byWh.status).toBe(200)
    const byWhBody = await byWh.json()
    expect(byWhBody.status).toBe(200)
    const whRow = (byWhBody.data as Array<any>).find((x) => x.warehouse_id === warehouseId)
    expect(whRow).toBeDefined()
    expect(whRow.count).toBe(3)

    // By tester
    const byTester = await server(new Request('http://localhost/api/v1/diagnostics/stats/testers', { headers: { authorization: `Bearer ${token}` } }))
    expect(byTester.status).toBe(200)
    const byTesterBody = await byTester.json()
    expect(byTesterBody.status).toBe(200)
    const testerRow = (byTesterBody.data as Array<any>)[0]
    expect(testerRow.count).toBe(3)

    // Device type distribution
    const dist = await server(new Request('http://localhost/api/v1/diagnostics/stats/device-types', { headers: { authorization: `Bearer ${token}` } }))
    expect(dist.status).toBe(200)
    const distBody = await dist.json()
    expect(distBody.status).toBe(200)
    const iph = (distBody.data as Array<any>).find((x) => x.device_type === 'iPhone')
    const andr = (distBody.data as Array<any>).find((x) => x.device_type === 'Android')
    expect(iph?.count).toBe(2)
    expect(andr?.count).toBe(1)
  })

  it('should respect tenant scoping and super_admin override', async () => {
    const app = buildApp()
    const server = app.handle

    // t1 tester and upload
    const { token: t1Token, tenantId: t1 } = await getTokenWithRole(server, 'tester', 't1', 'stats_t1')
    const w1 = await ensureWarehouse('W1', t1)
    await server(new Request('http://localhost/api/v1/diagnostics/tests/upload', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t1Token}` }, body: JSON.stringify({
        device: { make: 'A', model_no: 'M1', model_name: 'N1', device_type: 'iPhone', serial: 'S1' },
        test: { warehouse_id: w1, serial_number: 'S1' }
      })
    }))

    // t2 tester and upload
    const { token: t2Token, tenantId: t2 } = await getTokenWithRole(server, 'tester', 't2', 'stats_t2')
    const w2 = await ensureWarehouse('W2', t2)
    await server(new Request('http://localhost/api/v1/diagnostics/tests/upload', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t2Token}` }, body: JSON.stringify({
        device: { make: 'B', model_no: 'M2', model_name: 'N2', device_type: 'Android', serial: 'S2' },
        test: { warehouse_id: w2, serial_number: 'S2' }
      })
    }))

    // super_admin token
    const { token: saToken } = await getTokenWithRole(server, 'super_admin', 't1', 'sa_stats')

    // super_admin all tenants
    const allOverview = await server(new Request('http://localhost/api/v1/diagnostics/stats/overview', { headers: { authorization: `Bearer ${saToken}` } }))
    const allBody = await allOverview.json()
    expect(allBody.data.total_all_time).toBeGreaterThanOrEqual(2)

    // super_admin filtered to t2
    const t2Overview = await server(new Request(`http://localhost/api/v1/diagnostics/stats/overview?tenant_id=${t2}`, { headers: { authorization: `Bearer ${saToken}` } }))
    const t2Body = await t2Overview.json()
    expect(t2Body.data.total_all_time).toBe(1)

    // tester from t1 cannot override to t2
    const t1OverviewWithT2 = await server(new Request(`http://localhost/api/v1/diagnostics/stats/overview?tenant_id=${t2}`, { headers: { authorization: `Bearer ${t1Token}` } }))
    const t1Body = await t1OverviewWithT2.json()
    expect(t1Body.data.total_all_time).toBe(1)
  })

  it('should handle date ranges and weekly interval buckets', async () => {
    const app = buildApp()
    const server = app.handle
    const { token, tenantId } = await getToken(server, 'tester')
    const wid = await ensureWarehouse('D1', tenantId)

    // Seed two records
    for (const s of ['X1', 'X2']) {
      await server(new Request('http://localhost/api/v1/diagnostics/tests/upload', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ device: { make: 'A', model_no: 'M', model_name: 'N', device_type: 'iPhone', serial: s }, test: { warehouse_id: wid, serial_number: s } })
      }))
    }

    const now = new Date()
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const to = new Date(now.getTime() + 60 * 1000).toISOString()

    const tsDay = await server(new Request(`http://localhost/api/v1/diagnostics/stats/timeseries?interval=day&from=${from}`, { headers: { authorization: `Bearer ${token}` } }))
    const tsDayBody = await tsDay.json()
    const sumDay = (tsDayBody.data as Array<any>).reduce((s, p) => s + p.count, 0)
    expect(sumDay).toBeGreaterThanOrEqual(2)

    const tsWeek = await server(new Request(`http://localhost/api/v1/diagnostics/stats/timeseries?interval=week&from=${from}`, { headers: { authorization: `Bearer ${token}` } }))
    const tsWeekBody = await tsWeek.json()
    const sumWeek = (tsWeekBody.data as Array<any>).reduce((s, p) => s + p.count, 0)
    expect(sumWeek).toBeGreaterThanOrEqual(2)

    // Future range returns 0
    const futureFrom = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const futureTo = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString()
    const tsFuture = await server(new Request(`http://localhost/api/v1/diagnostics/stats/timeseries?interval=day&from=${encodeURIComponent(futureFrom)}&to=${encodeURIComponent(futureTo)}`, { headers: { authorization: `Bearer ${token}` } }))
    const tsFutureBody = await tsFuture.json()
    const sumFuture = (tsFutureBody.data as Array<any>).reduce((s, p) => s + p.count, 0)
    expect(sumFuture).toBe(0)
  })

  it('should split by warehouses and testers correctly', async () => {
    const app = buildApp()
    const server = app.handle
    const { token, tenantId } = await getToken(server, 'tester')
    const w1 = await ensureWarehouse('WH-A', tenantId)
    const w2 = await ensureWarehouse('WH-B', tenantId)

    // Upload: 2 in w1, 1 in w2
    for (const [serial, w] of [['WA-1', w1], ['WA-2', w1], ['WB-1', w2]] as Array<[string, number]>) {
      await server(new Request('http://localhost/api/v1/diagnostics/tests/upload', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ device: { make: 'A', model_no: 'M', model_name: 'N', device_type: 'iPhone', serial }, test: { warehouse_id: w, serial_number: serial } })
      }))
    }

    const byWh = await server(new Request('http://localhost/api/v1/diagnostics/stats/warehouses', { headers: { authorization: `Bearer ${token}` } }))
    const byWhBody = await byWh.json()
    const a = (byWhBody.data as Array<any>).find((r) => r.warehouse_id === w1)?.count ?? 0
    const b = (byWhBody.data as Array<any>).find((r) => r.warehouse_id === w2)?.count ?? 0
    expect(a).toBe(2)
    expect(b).toBe(1)

    const byTester = await server(new Request('http://localhost/api/v1/diagnostics/stats/testers', { headers: { authorization: `Bearer ${token}` } }))
    const byTesterBody = await byTester.json()
    const total = (byTesterBody.data as Array<any>).reduce((s, r) => s + r.count, 0)
    expect(total).toBe(3)
  })

  it('should return empty state when there is no data', async () => {
    const app = buildApp()
    const server = app.handle
    const { token } = await getToken(server, 'tester')

    const overview = await server(new Request('http://localhost/api/v1/diagnostics/stats/overview', { headers: { authorization: `Bearer ${token}` } }))
    const overviewBody = await overview.json()
    expect(overviewBody.data.total_all_time).toBe(0)

    for (const ep of ['timeseries', 'warehouses', 'testers', 'device-types']) {
      const res = await server(new Request(`http://localhost/api/v1/diagnostics/stats/${ep}`, { headers: { authorization: `Bearer ${token}` } }))
      const body = await res.json()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data.length).toBe(0)
    }
  })
})


