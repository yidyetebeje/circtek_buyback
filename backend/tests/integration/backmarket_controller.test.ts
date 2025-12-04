import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { buildApp } from '../../src/app';
import { jwt } from '@elysiajs/jwt';
import { Elysia } from 'elysia';
import { pool } from '../../src/db';
import { config } from 'dotenv';

config();

describe('Back Market Controller Integration', () => {
    let app: ReturnType<typeof buildApp>;
    let adminToken: string;
    let userToken: string;

    beforeAll(async () => {
        app = buildApp();
        
        // Create tokens for testing
        const authApp = new Elysia()
            .use(jwt({
                name: 'jwt',
                secret: process.env.JWT_SECRET || 'dev_secret'
            }))
            .get('/sign-admin', async ({ jwt }) => {
                return await jwt.sign({
                    sub: '1',
                    role: 'super_admin',
                    tenant_id: 1
                });
            })
            .get('/sign-user', async ({ jwt }) => {
                return await jwt.sign({
                    sub: '2',
                    role: 'user',
                    tenant_id: 1
                });
            });
        
        const adminRes = await authApp.handle(new Request('http://localhost/sign-admin'));
        adminToken = await adminRes.text();

        const userRes = await authApp.handle(new Request('http://localhost/sign-user'));
        userToken = await userRes.text();
    });

    afterAll(async () => {
        // await pool.end();
    });

    const baseUrl = '/api/v1/buyback/backmarket';

    describe('Authentication & Authorization', () => {
        it('should reject unauthenticated requests', async () => {
            const res = await app.handle(new Request(`http://localhost${baseUrl}/orders`));
            expect(res.status).toBe(401);
        });

        it('should reject requests from non-admin users', async () => {
            const res = await app.handle(new Request(`http://localhost${baseUrl}/orders`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            }));
            expect(res.status).toBe(403);
        });

        it('should accept requests from admin users', async () => {
            const res = await app.handle(new Request(`http://localhost${baseUrl}/orders`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            }));
            expect(res.status).toBe(200);
        });
    });

    describe('Schema Validation', () => {
        it('POST /probe/:listingId - should validate body', async () => {
            const res = await app.handle(new Request(`http://localhost${baseUrl}/probe/123`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    // Missing currentPrice
                })
            }));
            expect(res.status).toBe(422); // Unprocessable Entity due to missing required field
        });

        it('POST /recover/:listingId - should validate body', async () => {
            const res = await app.handle(new Request(`http://localhost${baseUrl}/recover/123`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    targetPrice: "not-a-number" // Invalid type
                })
            }));
            expect(res.status).toBe(422);
        });

        it('POST /listings/:listingId - should validate body types', async () => {
            const res = await app.handle(new Request(`http://localhost${baseUrl}/listings/123`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    price: "invalid" // Should be number
                })
            }));
            expect(res.status).toBe(422);
        });
    });

    describe('Endpoint Functionality (Smoke Tests)', () => {
        // We use invalid IDs to avoid side effects, but verify the controller logic runs
        
        it('GET /orders/:orderId/live - should handle 404 from service', async () => {
            const res = await app.handle(new Request(`http://localhost${baseUrl}/orders/invalid-id-999/live`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            }));
            // The service returns 404 for invalid ID, controller passes it through
            expect(res.status).toBe(404);
            const body = await res.json();
            expect(body.success).toBe(false);
        });

        it('POST /listings/:listingId - should handle 404/400 from service', async () => {
            const res = await app.handle(new Request(`http://localhost${baseUrl}/listings/invalid-id-999`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    price: 100
                })
            }));
            // Service returns error for invalid ID
            expect(res.status).not.toBe(200);
            const body = await res.json();
            expect(body.success).toBe(false);
        });

        it('POST /sync/orders - should trigger sync', async () => {
            // We mock the service response or just check if the route accepts the request
            // Since this is an integration test hitting the real service, we might want to be careful.
            // However, for a controller test, we just want to ensure the route is wired up.
            // We can pass fullSync: false to minimize impact.
            const res = await app.handle(new Request(`http://localhost${baseUrl}/sync/orders`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fullSync: false })
            }));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
        });

        it('POST /sync/listings - should trigger sync', async () => {
            const res = await app.handle(new Request(`http://localhost${baseUrl}/sync/listings`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            }));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
        });

        it('GET /orders - should return paginated results', async () => {
            const res = await app.handle(new Request(`http://localhost${baseUrl}/orders?page=1&limit=5`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            }));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.results).toBeArray();
            expect(body.page).toBe(1);
            expect(body.limit).toBe(5);
        });

        it('GET /listings - should return paginated results', async () => {
            const res = await app.handle(new Request(`http://localhost${baseUrl}/listings?page=1&limit=5`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            }));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.results).toBeArray();
            expect(body.page).toBe(1);
            expect(body.limit).toBe(5);
        });
    });
});
