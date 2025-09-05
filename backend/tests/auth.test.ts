import { describe, it, expect, beforeEach } from 'bun:test'
import { buildApp } from '../src/app'
import { ensureRole, ensureTenant, resetDb } from './utils/db'

describe('Auth routes', () => {
	beforeEach(async () => {
		await resetDb()
		await ensureRole('super_admin')
	})

	it('should register, login, and get profile', async () => {
		const app = buildApp()
		const server = app.handle
		const roleId = await ensureRole('super_admin')
		const tenantId = await ensureTenant('t1')

		const reg = await server(new Request('http://localhost/api/v1/auth/register', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				name: 'Test User', user_name: 'test_user', password: 'pass1234', email: 'test@example.com', role_id: roleId, tenant_id: tenantId
			})
		}))
		
		if (reg.status !== 200) {
			const body = await reg.text()
			
		}
		expect(reg.status).toBe(200)
		const regBody = await reg.json()
		expect(regBody.status).toBe(201)

		const login = await server(new Request('http://localhost/api/v1/auth/login', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ identifier: 'test_user', password: 'pass1234' })
		}))
		expect(login.status).toBe(200)
		const loginBody = await login.json()
		expect(loginBody.data.token).toBeTruthy()

		const me = await server(new Request('http://localhost/api/v1/auth/me', {
			headers: { authorization: `Bearer ${loginBody.data.token}` }
		}))
		expect(me.status).toBe(200)
	})

	it('should reject duplicate username/email on register', async () => {
		const app = buildApp()
		const server = app.handle
		const roleId = await ensureRole('super_admin')
		const tenantId = await ensureTenant('t1')
		const body = { name: 'A B', user_name: 'dup', password: 'x', email: 'dup@example.com', role_id: roleId, tenant_id: tenantId }
		await server(new Request('http://localhost/api/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }))
		const dupUser = await server(new Request('http://localhost/api/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, email: 'dup2@example.com' }) }))
		expect(dupUser.status).toBe(200)
		const dupUserBody = await dupUser.json()
		expect(dupUserBody.status).toBe(409)
		const dupEmail = await server(new Request('http://localhost/api/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, user_name: 'another' }) }))
		expect(dupEmail.status).toBe(200)
		const dupEmailBody = await dupEmail.json()
		expect(dupEmailBody.status).toBe(409)
	})

	it('should deny invalid credentials', async () => {
		const app = buildApp()
		const server = app.handle
		const roleId = await ensureRole('super_admin')
		const tenantId = await ensureTenant('t1')
		await server(new Request('http://localhost/api/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'A B', user_name: 'x', password: 'right', email: 'x@example.com', role_id: roleId, tenant_id: tenantId }) }))
		const bad = await server(new Request('http://localhost/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: 'x', password: 'wrong' }) }))
		expect(bad.status).toBe(200)
		const badBody = await bad.json()
		expect(badBody.status).toBe(401)
	})
})


