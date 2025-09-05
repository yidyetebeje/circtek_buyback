import { describe, it, expect, beforeEach } from 'bun:test'
import { buildApp } from '../src/app'
import { ensureRole, ensureTenant, resetDb, ensureWarehouse } from './utils/db'

import { getToken } from './utils/auth'

describe('Diagnostics routes', () => {
	beforeEach(async () => {
		await resetDb()
		await ensureRole('super_admin')
		await ensureRole('tester')
		await ensureTenant('t1')
	})

	it('should require auth for list and export', async () => {
		const app = buildApp()
		const server = app.handle
		const unauthList = await server(new Request('http://localhost/api/v1/diagnostics/tests'))
		expect(unauthList.status).toBe(401)
		const unauthExport = await server(new Request('http://localhost/api/v1/diagnostics/tests/export'))
		expect(unauthExport.status).toBe(401)
	})

	it('should upload, list, filter, export diagnostics, and serve public report', async () => {
		const app = buildApp()
		const server = app.handle
		const { token, userId, tenantId } = await getToken(server, 'tester')
		const warehouseId = await ensureWarehouse('Main', tenantId)

		// Upload a test result
		const uploadBody = {
			device: {
				make: 'Apple', model_no: 'A2633', model_name: 'iPhone 13', device_type: 'iPhone', serial: 'SER-001', imei: '3567', lpn: 'LPN-001', description: 'Apple iPhone 13'
			},
			test: {
				warehouse_id: warehouseId,
				passed_components: 'screen,speaker', failed_components: 'mic', pending_components: 'camera',
				os_version: 'iOS 17', device_lock: 'OFF', serial_number: 'SER-001', imei: '3567', lpn: 'LPN-001'
			}
		}
		const upload = await server(new Request('http://localhost/api/v1/diagnostics/tests/upload', {
			method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(uploadBody)
		}))
		expect(upload.status).toBe(200)
		const uploadRes = await upload.json()
		expect(uploadRes.status).toBe(201)
		const reportId = uploadRes.data.id as number

		// List without filters
		const list = await server(new Request('http://localhost/api/v1/diagnostics/tests', { headers: { authorization: `Bearer ${token}` } }))
		expect(list.status).toBe(200)
		const listBody = await list.json()
		expect(listBody.status).toBe(200)
		expect(Array.isArray(listBody.data)).toBe(true)
		expect(listBody.meta.total).toBeGreaterThanOrEqual(1)
		const first = listBody.data[0]
		expect(first.passed_components).toContain('screen')
		expect(first.failed_components).toContain('mic')
		expect(first.pending_components).toContain('camera')

		// Identifier filter
		const listIdentifier = await server(new Request('http://localhost/api/v1/diagnostics/tests?identifier=LPN-001', { headers: { authorization: `Bearer ${token}` } }))
		expect(listIdentifier.status).toBe(200)
		const idBody = await listIdentifier.json()
		expect(idBody.data.length).toBeGreaterThan(0)

		// device_type filter
		const listDeviceType = await server(new Request('http://localhost/api/v1/diagnostics/tests?device_type=iPhone', { headers: { authorization: `Bearer ${token}` } }))
		expect(listDeviceType.status).toBe(200)
		const dtBody = await listDeviceType.json()
		expect(dtBody.data.length).toBeGreaterThan(0)

		// Export
		const exportRes = await server(new Request('http://localhost/api/v1/diagnostics/tests/export?identifier=SER-001', { headers: { authorization: `Bearer ${token}` } }))
		expect(exportRes.status).toBe(200)
		const exportText = await exportRes.text()
		expect(exportText.split('\n')[0]).toContain('passed_components')
		expect(exportText.split('\n')[1]).toContain('screen')

		// Public report by id
		const pub = await server(new Request(`http://localhost/api/v1/diagnostics/public/tests/${reportId}`))
		expect(pub.status).toBe(200)
		const pubBody = await pub.json()
		expect(pubBody.status).toBe(200)
		expect(pubBody.data.id).toBe(reportId)
	})

	it('super_admin can access diagnostics across tenants when specifying tenant_id', async () => {
		const app = buildApp()
		const server = app.handle

		// Ensure tenants
		const t1 = await ensureTenant('t1')
		const t2 = await ensureTenant('t2')

		// Create tester and upload in t1
		const { token: t1Token } = await getToken(server, 'tester', 't1', 't1')
		const w1 = await ensureWarehouse('W1', t1)
		await server(new Request('http://localhost/api/v1/diagnostics/tests/upload', {
			method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t1Token}` }, body: JSON.stringify({
				device: { make: 'Apple', model_no: 'A1', model_name: 'X', device_type: 'iPhone', serial: 'SER-T1', imei: '111', lpn: 'LPN-T1' },
				test: { warehouse_id: w1, passed_components: 'a', failed_components: 'b', pending_components: 'c', serial_number: 'SER-T1', imei: '111', lpn: 'LPN-T1' }
			})
		}))

		// Create tester and upload in t2
		const { token: t2Token } = await getToken(server, 'tester', 't2', 't2')
		const w2 = await ensureWarehouse('W2', t2)
		await server(new Request('http://localhost/api/v1/diagnostics/tests/upload', {
			method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t2Token}` }, body: JSON.stringify({
				device: { make: 'Apple', model_no: 'A2', model_name: 'Y', device_type: 'iPhone', serial: 'SER-T2', imei: '222', lpn: 'LPN-T2' },
				test: { warehouse_id: w2, passed_components: 'a', failed_components: 'b', pending_components: 'c', serial_number: 'SER-T2', imei: '222', lpn: 'LPN-T2' }
			})
		}))

		// Create super admin and login
		const { token: saToken } = await getToken(server, 'super_admin', 't1', 'sa')

		// Super admin can list t2 diagnostics by specifying tenant_id
		const listT2 = await server(new Request(`http://localhost/api/v1/diagnostics/tests?tenant_id=${t2}`, { headers: { authorization: `Bearer ${saToken}` } }))
		expect(listT2.status).toBe(200)
		const bodyT2 = await listT2.json()
		expect(bodyT2.data.length).toBeGreaterThan(0)
		for (const r of bodyT2.data) expect(r.tenant_id).toBe(t2)
	})

	it('super_admin without tenant_id sees all tenants diagnostics', async () => {
		const app = buildApp()
		const server = app.handle

		// Seed t1 and t2 with one record each
		const t1 = await ensureTenant('t1')
		const t2 = await ensureTenant('t2')
		const { token: token1 } = await getToken(server, 'tester', 't1', 'tx1')
		const w1 = await ensureWarehouse('WW1', t1)
		await server(new Request('http://localhost/api/v1/diagnostics/tests/upload', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token1}` }, body: JSON.stringify({ device: { make: 'A', model_no: 'M1', model_name: 'N1', device_type: 'iPhone', serial: 'S1' }, test: { warehouse_id: w1, passed_components: 'x', failed_components: 'y', pending_components: 'z', serial_number: 'S1' } }) }))

		const { token: token2 } = await getToken(server, 'tester', 't2', 'tx2')
		const w2 = await ensureWarehouse('WW2', t2)
		await server(new Request('http://localhost/api/v1/diagnostics/tests/upload', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token2}` }, body: JSON.stringify({ device: { make: 'A', model_no: 'M2', model_name: 'N2', device_type: 'iPhone', serial: 'S2' }, test: { warehouse_id: w2, passed_components: 'x', failed_components: 'y', pending_components: 'z', serial_number: 'S2' } }) }))

		const { token: saToken } = await getToken(server, 'super_admin', 't1', 'sa2')

		// No tenant_id provided => all tenants
		const listAll = await server(new Request('http://localhost/api/v1/diagnostics/tests', { headers: { authorization: `Bearer ${saToken}` } }))
		expect(listAll.status).toBe(200)
		const bodyAll = await listAll.json()
		expect(bodyAll.data.find((r: any) => r.serial_number === 'S1')).toBeTruthy()
		expect(bodyAll.data.find((r: any) => r.serial_number === 'S2')).toBeTruthy()
	})

	it('non-super roles (tester/admin) cannot access other tenants diagnostics', async () => {
		const app = buildApp()
		const server = app.handle

		const t1 = await ensureTenant('t1')
		const t2 = await ensureTenant('t2')
		// Create tester in t1 and upload record in t1
		const { token: testerToken } = await getToken(server, 'tester', 't1', 't1x')
		const w1 = await ensureWarehouse('W1b', t1)
		await server(new Request('http://localhost/api/v1/diagnostics/tests/upload', {
			method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${testerToken}` }, body: JSON.stringify({
				device: { make: 'Apple', model_no: 'AX', model_name: 'ZX', device_type: 'iPhone', serial: 'SER-T1B', imei: '333', lpn: 'LPN-T1B' },
				test: { warehouse_id: w1, passed_components: 'a', failed_components: 'b', pending_components: 'c', serial_number: 'SER-T1B', imei: '333', lpn: 'LPN-T1B' }
			})
		}))

		// Create admin in t1
		const { token: adminToken } = await getToken(server, 'admin', 't1', 'adm')

		// Attempt to list t2 diagnostics with tester/admin tokens should only show t1 (ignore tenant_id override)
		const testerList = await server(new Request(`http://localhost/api/v1/diagnostics/tests?tenant_id=${t2}`, { headers: { authorization: `Bearer ${testerToken}` } }))
		expect(testerList.status).toBe(200)
		const testerBody = await testerList.json()
		for (const r of testerBody.data) expect(r.tenant_id).toBe(t1)

		const adminList = await server(new Request(`http://localhost/api/v1/diagnostics/tests?tenant_id=${t2}`, { headers: { authorization: `Bearer ${adminToken}` } }))
		expect(adminList.status).toBe(200)
		const adminBody = await adminList.json()
		for (const r of adminBody.data) expect(r.tenant_id).toBe(t1)
	})
})


