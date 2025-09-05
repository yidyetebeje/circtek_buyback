import { beforeEach, describe, expect, it } from 'bun:test'
import { buildApp } from '../src/app'
import { ensureRole, ensureTenant, resetDb } from './utils/db'

import { getToken } from './utils/auth'

describe('Grades routes', () => {
    beforeEach(async () => {
        await resetDb()
        await ensureRole('super_admin')
        await ensureRole('tester')
        await ensureTenant('t1')
        await ensureTenant('t2')
    })

    it('CRUD for grades scoped by tenant', async () => {
        const app = buildApp()
        const server = app.handle
        const { token } = await getToken(server, 'tester')

        const create = await server(new Request('http://localhost/api/v1/grades', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'A', color: '#00ff00', description: 'Top' }) }))
        expect(create.status).toBe(200)
        const createBody = await create.json()
        expect(createBody.status).toBe(201)
        const id = createBody.data.id as number

        const list = await server(new Request('http://localhost/api/v1/grades', { headers: { authorization: `Bearer ${token}` } }))
        expect(list.status).toBe(200)
        const listBody = await list.json()
        expect(listBody.data.find((x: any) => x.id === id)).toBeTruthy()

        const getOne = await server(new Request(`http://localhost/api/v1/grades/${id}`, { headers: { authorization: `Bearer ${token}` } }))
        expect(getOne.status).toBe(200)

        const update = await server(new Request(`http://localhost/api/v1/grades/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ color: '#ff0000' }) }))
        expect(update.status).toBe(200)

        const del = await server(new Request(`http://localhost/api/v1/grades/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }))
        expect(del.status).toBe(200)
    })

    it('super admin can list all and filter by tenant', async () => {
        const app = buildApp()
        const server = app.handle

        const { token: t1Token } = await getToken(server, 'tester', 't1')
        await server(new Request('http://localhost/api/v1/grades', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t1Token}` }, body: JSON.stringify({ name: 'A1', color: '#00ff00' }) }))

        const { token: t2Token, tenantId: t2Id } = await getToken(server, 'tester', 't2')
        await server(new Request('http://localhost/api/v1/grades', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t2Token}` }, body: JSON.stringify({ name: 'B1', color: '#0000ff' }) }))

        const { token: saToken } = await getToken(server, 'super_admin', 't1')

        const all = await server(new Request('http://localhost/api/v1/grades', { headers: { authorization: `Bearer ${saToken}` } }))
        const allBody = await all.json()
        expect(allBody.data.length >= 2).toBeTruthy()
        expect(allBody.data.some((x: any) => x.name === 'A1')).toBeTruthy()
        expect(allBody.data.some((x: any) => x.name === 'B1')).toBeTruthy()

        const filtered = await server(new Request(`http://localhost/api/v1/grades?tenant_id=${t2Id}`, { headers: { authorization: `Bearer ${saToken}` } }))
        const filteredBody = await filtered.json()
        expect(filteredBody.data.every((x: any) => x.tenant_id === t2Id)).toBeTruthy()
    })
})





