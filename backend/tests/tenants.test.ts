import { describe, it, expect, beforeEach } from 'bun:test'
import { buildApp } from '../src/app'
import { ensureRole, ensureTenant, resetDb } from './utils/db'

import { getAdminToken } from './utils/auth'

describe('Tenants routes', () => {
	beforeEach(async () => {
		await resetDb()
		await ensureRole('super_admin')
	})

	it('super_admin can create/update/delete tenant', async () => {
		const app = buildApp()
		const server = app.handle
		const token = await getAdminToken(server)

		const create = await server(new Request('http://localhost/api/v1/tenants', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 't-main', description: 'Main tenant' }) }))
		expect(create.status).toBe(200)
		const { data } = await create.json()
		const id = data?.id as number

		const update = await server(new Request(`http://localhost/api/v1/tenants/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ description: 'Updated' }) }))
		expect(update.status).toBe(200)

		const del = await server(new Request(`http://localhost/api/v1/tenants/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }))
		expect(del.status).toBe(200)
	})
})


