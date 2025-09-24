import { describe, it, expect, beforeEach } from 'bun:test'
import { buildApp } from '../src/app'
import { ensureRole, ensureTenant, resetDb } from './utils/db'
import { getToken } from './utils/auth'

describe('Users routes', () => {
	beforeEach(async () => {
		await resetDb()
		await ensureRole('super_admin')
		await ensureRole('tester')
		await ensureTenant('t1')
	})

	it('should require auth for list and allow tenant-scoped list', async () => {
		const app = buildApp()
		const server = app.handle

		const unauth = await server(new Request('http://localhost/api/v1/users'))
		expect(unauth.status).toBe(401)

		const { token } = await getToken(server, 'tester')
		const list = await server(new Request('http://localhost/api/v1/users', { headers: { authorization: `Bearer ${token}` } }))
		expect(list.status).toBe(200)
	})

	it('should create, get, update and delete user', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'tester')
		const roleId = await ensureRole('super_admin')
		const tenantId = await ensureTenant('t1')

		const create = await server(new Request('http://localhost/api/v1/users', {
			method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'A B', user_name: 'u2', password: 'secret', role_id: roleId, tenant_id: tenantId })
		}))
		expect(create.status).toBe(200)
		const createBody = await create.json()
		expect(createBody.status).toBe(201)

		const list = await server(new Request('http://localhost/api/v1/users', { headers: { authorization: `Bearer ${token}` } }))
		expect(list.status).toBe(200)
		const { data } = await list.json()
		const userId = data.find((x: any) => x.user_name === 'u2')?.id as number

		const getOne = await server(new Request(`http://localhost/api/v1/users/${userId}`, { headers: { authorization: `Bearer ${token}` } }))
		expect(getOne.status).toBe(200)

		const update = await server(new Request(`http://localhost/api/v1/users/${userId}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'AA B' }) }))
		expect(update.status).toBe(200)
		const updateBody = await update.json()
		expect(updateBody.status).toBe(200)

		const del = await server(new Request(`http://localhost/api/v1/users/${userId}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }))
		expect(del.status).toBe(200)
		const delBody = await del.json()
		expect(delBody.status).toBe(200)
	})

	it('should forbid cross-tenant access for non super_admin', async () => {
		const app = buildApp()
		const server = app.handle
		const { token } = await getToken(server, 'tester')
		const roleId = await ensureRole('super_admin')
		const tenantId = await ensureTenant('t2')

		await server(new Request('http://localhost/api/v1/users', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'X Y', user_name: 'u3', password: 'secret', role_id: roleId, tenant_id: tenantId }) }))
		const list = await server(new Request('http://localhost/api/v1/users', { headers: { authorization: `Bearer ${token}` } }))
		const { data } = await list.json()
		expect(data.find((x: any) => x.user_name === 'u3')).toBeUndefined()
	})
})


