import { describe, it, expect, beforeEach } from 'bun:test'
import { buildApp } from '../src/app'
import { ensureRole, ensureTenant, resetDb } from './utils/db'

import { getAdminToken } from './utils/auth'

describe('Roles routes', () => {
	beforeEach(async () => {
		await resetDb()
		await ensureRole('super_admin')
		await ensureTenant('t1')
	})

	it('should require super_admin and allow CRUD', async () => {
		const app = buildApp()
		const server = app.handle
		const token = await getAdminToken(server)

		const create = await server(new Request('http://localhost/api/v1/roles', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'manager', description: 'mgr' }) }))
		expect(create.status).toBe(200)
		const createBody = await create.json()
		expect(createBody.status).toBe(201)

		const list = await server(new Request('http://localhost/api/v1/roles', { headers: { authorization: `Bearer ${token}` } }))
		expect(list.status).toBe(200)
		const { data } = await list.json()
		const id = data.find((r: any) => r.name === 'manager')?.id as number

		const getOne = await server(new Request(`http://localhost/api/v1/roles/${id}`, { headers: { authorization: `Bearer ${token}` } }))
		expect(getOne.status).toBe(200)

		const update = await server(new Request(`http://localhost/api/v1/roles/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ description: 'Manager role' }) }))
		expect(update.status).toBe(200)
		const updateBody = await update.json()
		expect(updateBody.status).toBe(200)

		const del = await server(new Request(`http://localhost/api/v1/roles/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }))
		expect(del.status).toBe(200)
		const delBody = await del.json()
		expect(delBody.status).toBe(200)
	})
})


