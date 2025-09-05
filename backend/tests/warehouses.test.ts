import { describe, it, expect, beforeEach } from 'bun:test'
import { buildApp } from '../src/app'
import { ensureRole, ensureTenant, resetDb } from './utils/db'

import { getAdminToken } from './utils/auth'

describe('Warehouses routes', () => {
	beforeEach(async () => {
		await resetDb()
		await ensureRole('super_admin')
		await ensureTenant('t1')
	})

	it('should enforce auth and tenant scoping', async () => {
		const app = buildApp()
		const server = app.handle
		const token = await getAdminToken(server)

		const unauth = await server(new Request('http://localhost/api/v1/warehouses'))
		expect(unauth.status).toBe(401)

		const tid = await ensureTenant('t1')
		const create = await server(new Request('http://localhost/api/v1/warehouses', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'W1', description: 'D', tenant_id: tid }) }))
		expect(create.status).toBe(200)
		const createBody = await create.json()
		expect(createBody.status).toBe(201)

		const list = await server(new Request('http://localhost/api/v1/warehouses', { headers: { authorization: `Bearer ${token}` } }))
		expect(list.status).toBe(200)
	})
})


