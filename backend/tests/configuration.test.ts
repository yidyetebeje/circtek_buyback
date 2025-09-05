import { beforeEach, describe, expect, it } from 'bun:test'
import { buildApp } from '../src/app'
import { ensureRole, ensureTenant, resetDb } from './utils/db'
import { getToken } from './utils/auth'

describe('Configuration routes', () => {
    beforeEach(async () => {
        await resetDb()
        await ensureRole('super_admin')
        await ensureRole('tester')
        await ensureTenant('t1')
        await ensureTenant('t2')
    })

    it('CRUD for wifi_profiles scoped by tenant', async () => {
        const app = buildApp()
        const server = app.handle
        const { token } = await getToken(server, 'tester')

        const create = await server(new Request('http://localhost/api/v1/configuration/wifi-profiles', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'WIFI1', ssid: 'S1', password: 'P1' }) }))
        expect(create.status).toBe(200)
        const createBody = await create.json()
        expect(createBody.status).toBe(201)
        const id = createBody.data.id as number

        const list = await server(new Request('http://localhost/api/v1/configuration/wifi-profiles', { headers: { authorization: `Bearer ${token}` } }))
        expect(list.status).toBe(200)
        const listBody = await list.json()
        expect(listBody.data.find((x: any) => x.id === id)).toBeTruthy()

        const getOne = await server(new Request(`http://localhost/api/v1/configuration/wifi-profiles/${id}`, { headers: { authorization: `Bearer ${token}` } }))
        expect(getOne.status).toBe(200)

        const update = await server(new Request(`http://localhost/api/v1/configuration/wifi-profiles/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ password: 'P2' }) }))
        expect(update.status).toBe(200)

        const del = await server(new Request(`http://localhost/api/v1/configuration/wifi-profiles/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }))
        expect(del.status).toBe(200)
    })

    it('assign/unassign wifi profile with tenant checks and list testers', async () => {
        const app = buildApp()
        const server = app.handle
        const { token, userId } = await getToken(server, 'tester')

        const wifiCreate = await server(new Request('http://localhost/api/v1/configuration/wifi-profiles', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'WIFI2', ssid: 'S2', password: 'P2' }) }))
        const wifiId = (await wifiCreate.json()).data.id as number

        const assignWifi = await server(new Request(`http://localhost/api/v1/configuration/wifi-profiles/${wifiId}/assign/${userId}`, { method: 'POST', headers: { authorization: `Bearer ${token}` } }))
        expect(assignWifi.status).toBe(200)

        const testers = await server(new Request(`http://localhost/api/v1/configuration/wifi-profiles/${wifiId}/testers`, { headers: { authorization: `Bearer ${token}` } }))
        expect(testers.status).toBe(200)
        const testersList = await testers.json()
        expect(testersList.data.find((x: any) => x.id === userId)).toBeTruthy()

        const unassignWifi = await server(new Request(`http://localhost/api/v1/configuration/wifi-profiles/${wifiId}/unassign/${userId}`, { method: 'POST', headers: { authorization: `Bearer ${token}` } }))
        expect(unassignWifi.status).toBe(200)
    })

    it('super admin can list all and filter by tenant for configuration entities', async () => {
        const app = buildApp()
        const server = app.handle

        // Create tester in tenant t1 and create resources
        const { token: t1Token } = await getToken(server, 'tester', 't1')
        const lt1 = await server(new Request('http://localhost/api/v1/configuration/label-templates', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t1Token}` }, body: JSON.stringify({ name: 'LT_t1', canvas_state: { a: 1 } }) }))
        const wf1 = await server(new Request('http://localhost/api/v1/configuration/workflows', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t1Token}` }, body: JSON.stringify({ name: 'WF_t1', canvas_state: { a: 1 } }) }))
        const wi1 = await server(new Request('http://localhost/api/v1/configuration/wifi-profiles', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t1Token}` }, body: JSON.stringify({ name: 'WIFI_t1', ssid: 'S1', password: 'P1' }) }))
        expect((await lt1.json()).status).toBe(201)
        expect((await wf1.json()).status).toBe(201)
        expect((await wi1.json()).status).toBe(201)

        // Create tester in tenant t2 and create resources
        const { token: t2Token, tenantId: t2Id } = await getToken(server, 'tester', 't2')
        const lt2 = await server(new Request('http://localhost/api/v1/configuration/label-templates', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t2Token}` }, body: JSON.stringify({ name: 'LT_t2', canvas_state: { a: 2 } }) }))
        const wf2 = await server(new Request('http://localhost/api/v1/configuration/workflows', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t2Token}` }, body: JSON.stringify({ name: 'WF_t2', canvas_state: { a: 2 } }) }))
        const wi2 = await server(new Request('http://localhost/api/v1/configuration/wifi-profiles', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t2Token}` }, body: JSON.stringify({ name: 'WIFI_t2', ssid: 'S2', password: 'P2' }) }))
        expect((await lt2.json()).status).toBe(201)
        expect((await wf2.json()).status).toBe(201)
        expect((await wi2.json()).status).toBe(201)

        // Super admin token (tenant doesn't matter for listing all)
        const { token: saToken } = await getToken(server, 'super_admin', 't1')

        // List all without tenant filter
        const allLT = await server(new Request('http://localhost/api/v1/configuration/label-templates', { headers: { authorization: `Bearer ${saToken}` } }))
        const allLTBody = await allLT.json()
        expect(allLTBody.data.length >= 2).toBeTruthy()
        expect(allLTBody.data.some((x: any) => x.name === 'LT_t1')).toBeTruthy()
        expect(allLTBody.data.some((x: any) => x.name === 'LT_t2')).toBeTruthy()

        const allWF = await server(new Request('http://localhost/api/v1/configuration/workflows', { headers: { authorization: `Bearer ${saToken}` } }))
        const allWFBody = await allWF.json()
        expect(allWFBody.data.length >= 2).toBeTruthy()
        expect(allWFBody.data.some((x: any) => x.name === 'WF_t1')).toBeTruthy()
        expect(allWFBody.data.some((x: any) => x.name === 'WF_t2')).toBeTruthy()

        const allWI = await server(new Request('http://localhost/api/v1/configuration/wifi-profiles', { headers: { authorization: `Bearer ${saToken}` } }))
        const allWIBody = await allWI.json()
        expect(allWIBody.data.length >= 2).toBeTruthy()
        expect(allWIBody.data.some((x: any) => x.name === 'WIFI_t1')).toBeTruthy()
        expect(allWIBody.data.some((x: any) => x.name === 'WIFI_t2')).toBeTruthy()

        // Filter by tenant_id
        const filteredLT = await server(new Request(`http://localhost/api/v1/configuration/label-templates?tenant_id=${t2Id}`, { headers: { authorization: `Bearer ${saToken}` } }))
        const filteredLTBody = await filteredLT.json()
        expect(filteredLTBody.data.every((x: any) => x.tenant_id === t2Id)).toBeTruthy()

        const filteredWF = await server(new Request(`http://localhost/api/v1/configuration/workflows?tenant_id=${t2Id}`, { headers: { authorization: `Bearer ${saToken}` } }))
        const filteredWFBody = await filteredWF.json()
        expect(filteredWFBody.data.every((x: any) => x.tenant_id === t2Id)).toBeTruthy()

        const filteredWI = await server(new Request(`http://localhost/api/v1/configuration/wifi-profiles?tenant_id=${t2Id}`, { headers: { authorization: `Bearer ${saToken}` } }))
        const filteredWIBody = await filteredWI.json()
        expect(filteredWIBody.data.every((x: any) => x.tenant_id === t2Id)).toBeTruthy()
    })
    it('CRUD for label_templates scoped by tenant', async () => {
        const app = buildApp()
        const server = app.handle
        const { token } = await getToken(server, 'tester')

        const create = await server(new Request('http://localhost/api/v1/configuration/label-templates', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'LT1', description: 'd', canvas_state: { a: 1 } }) }))
        expect(create.status).toBe(200)
        const createBody = await create.json()
        expect(createBody.status).toBe(201)
        const id = createBody.data.id as number

        const list = await server(new Request('http://localhost/api/v1/configuration/label-templates', { headers: { authorization: `Bearer ${token}` } }))
        expect(list.status).toBe(200)
        const listBody = await list.json()
        expect(listBody.data.find((x: any) => x.id === id)).toBeTruthy()

        const getOne = await server(new Request(`http://localhost/api/v1/configuration/label-templates/${id}`, { headers: { authorization: `Bearer ${token}` } }))
        expect(getOne.status).toBe(200)

        const update = await server(new Request(`http://localhost/api/v1/configuration/label-templates/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ description: 'dd' }) }))
        expect(update.status).toBe(200)

        const del = await server(new Request(`http://localhost/api/v1/configuration/label-templates/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }))
        expect(del.status).toBe(200)
    })

    it('CRUD for workflows scoped by tenant', async () => {
        const app = buildApp()
        const server = app.handle
        const { token } = await getToken(server, 'tester')

        const create = await server(new Request('http://localhost/api/v1/configuration/workflows', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'WF1', description: 'd', canvas_state: { a: 1 } }) }))
        expect(create.status).toBe(200)
        const createBody = await create.json()
        expect(createBody.status).toBe(201)
        const id = createBody.data.id as number

        const list = await server(new Request('http://localhost/api/v1/configuration/workflows', { headers: { authorization: `Bearer ${token}` } }))
        expect(list.status).toBe(200)
        const listBody = await list.json()
        expect(listBody.data.find((x: any) => x.id === id)).toBeTruthy()

        const getOne = await server(new Request(`http://localhost/api/v1/configuration/workflows/${id}`, { headers: { authorization: `Bearer ${token}` } }))
        expect(getOne.status).toBe(200)

        const update = await server(new Request(`http://localhost/api/v1/configuration/workflows/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ description: 'dd' }) }))
        expect(update.status).toBe(200)

        const del = await server(new Request(`http://localhost/api/v1/configuration/workflows/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }))
        expect(del.status).toBe(200)
    })

    it('assign/unassign workflow and label template with tenant checks', async () => {
        const app = buildApp()
        const server = app.handle
        const { token, userId } = await getToken(server, 'tester')

        const wfCreate = await server(new Request('http://localhost/api/v1/configuration/workflows', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'WF1', description: 'd', canvas_state: { a: 1 } }) }))
        const wfId = (await wfCreate.json()).data.id as number

        const ltCreate = await server(new Request('http://localhost/api/v1/configuration/label-templates', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'LT1', description: 'd', canvas_state: { a: 1 } }) }))
        const ltId = (await ltCreate.json()).data.id as number

        const assignWf = await server(new Request(`http://localhost/api/v1/configuration/workflows/${wfId}/assign/${userId}`, { method: 'POST', headers: { authorization: `Bearer ${token}` } }))
        expect(assignWf.status).toBe(200)

        const unassignWf = await server(new Request(`http://localhost/api/v1/configuration/workflows/${wfId}/unassign/${userId}`, { method: 'POST', headers: { authorization: `Bearer ${token}` } }))
        expect(unassignWf.status).toBe(200)

        const assignLt = await server(new Request(`http://localhost/api/v1/configuration/label-templates/${ltId}/assign/${userId}`, { method: 'POST', headers: { authorization: `Bearer ${token}` } }))
        expect(assignLt.status).toBe(200)

        const unassignLt = await server(new Request(`http://localhost/api/v1/configuration/label-templates/${ltId}/unassign/${userId}`, { method: 'POST', headers: { authorization: `Bearer ${token}` } }))
        expect(unassignLt.status).toBe(200)
    })

    it('list testers assigned to workflow and label template', async () => {
        const app = buildApp()
        const server = app.handle
        const { token, userId } = await getToken(server, 'tester')

        // Create resources
        const wfCreate = await server(new Request('http://localhost/api/v1/configuration/workflows', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'WF2', description: 'd', canvas_state: { a: 2 } }) }))
        const wfId = (await wfCreate.json()).data.id as number
        const ltCreate = await server(new Request('http://localhost/api/v1/configuration/label-templates', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'LT2', description: 'd', canvas_state: { a: 2 } }) }))
        const ltId = (await ltCreate.json()).data.id as number

        // Assign
        await server(new Request(`http://localhost/api/v1/configuration/workflows/${wfId}/assign/${userId}`, { method: 'POST', headers: { authorization: `Bearer ${token}` } }))
        await server(new Request(`http://localhost/api/v1/configuration/label-templates/${ltId}/assign/${userId}`, { method: 'POST', headers: { authorization: `Bearer ${token}` } }))

        // List testers for workflow
        const wfTesters = await server(new Request(`http://localhost/api/v1/configuration/workflows/${wfId}/testers`, { headers: { authorization: `Bearer ${token}` } }))
        expect(wfTesters.status).toBe(200)
        const wfList = await wfTesters.json()
        expect(wfList.data.find((x: any) => x.id === userId)).toBeTruthy()

        // List testers for label template
        const ltTesters = await server(new Request(`http://localhost/api/v1/configuration/label-templates/${ltId}/testers`, { headers: { authorization: `Bearer ${token}` } }))
        expect(ltTesters.status).toBe(200)
        const ltList = await ltTesters.json()
        expect(ltList.data.find((x: any) => x.id === userId)).toBeTruthy()
    })
})


