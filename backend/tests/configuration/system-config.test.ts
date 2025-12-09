import { describe, it, expect, beforeEach } from 'bun:test'
import { buildApp } from '../../src/app'
import { ensureRole, ensureTenant, resetDb } from '../utils/db'
import { getAdminToken } from '../utils/auth'
import { db } from '../../src/db'
import { system_config } from '../../src/db/circtek.schema'
import { eq } from 'drizzle-orm'

describe('System Config Routes', () => {
    beforeEach(async () => {
        // await resetDb() // Skipping full reset to avoid timeout
        await ensureRole('super_admin')
        await ensureTenant('t1')
    })

    it('should get default rate limits when no config exists', async () => {
        // Clean up any existing config first
        await db.delete(system_config).where(eq(system_config.key, 'backmarket_rate_limits'))

        const app = buildApp()
        const server = app.handle
        const token = await getAdminToken(server)

        const response = await server(new Request('http://localhost/api/v1/configuration/system-config/rate-limits', {
            headers: { authorization: `Bearer ${token}` }
        }))

        expect(response.status).toBe(200)
        const body = await response.json()
        
        // Should match defaults
        expect(body.global).toBeDefined()
        expect(body.global.maxRequests).toBe(150)
        expect(body.catalog.maxRequests).toBe(15)
    }, 30000)

    it('should update rate limits and persist to DB', async () => {
        const app = buildApp()
        const server = app.handle
        const token = await getAdminToken(server)

        const newConfig = {
            global: { intervalMs: 5000, maxRequests: 100 },
            catalog: { intervalMs: 5000, maxRequests: 10 },
            competitor: { intervalMs: 1000, maxRequests: 1 },
            care: { intervalMs: 60000, maxRequests: 200 }
        }

        // Update config
        const updateResponse = await server(new Request('http://localhost/api/v1/configuration/system-config/rate-limits', {
            method: 'PUT',
            headers: { 
                'content-type': 'application/json',
                authorization: `Bearer ${token}` 
            },
            body: JSON.stringify(newConfig)
        }))

        expect(updateResponse.status).toBe(200)
        const updateBody = await updateResponse.json()
        expect(updateBody.success).toBe(true)

        // Verify DB persistence
        const dbRecord = await db.select().from(system_config).where(eq(system_config.key, 'backmarket_rate_limits'))
        expect(dbRecord.length).toBe(1)
        expect(dbRecord[0].value).toEqual(newConfig)

        // Verify GET returns new config
        const getResponse = await server(new Request('http://localhost/api/v1/configuration/system-config/rate-limits', {
            headers: { authorization: `Bearer ${token}` }
        }))
        
        const getBody = await getResponse.json()
        expect(getBody).toEqual(newConfig)
    }, 30000)
})
