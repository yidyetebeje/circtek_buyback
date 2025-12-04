import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { buildApp } from '../../src/app';
import { jwt } from '@elysiajs/jwt';
import { Elysia } from 'elysia';
import { pool } from '../../src/db';
import { config } from 'dotenv';
import { backmarket_listings, backmarket_orders } from '../../src/db/backmarket.schema';
import { drizzle } from 'drizzle-orm/mysql2';

config();

const db = drizzle(pool);

describe('Back Market Full Flow Demo', () => {
    let app: Elysia;
    let adminToken: string;
    let testListingId: string | null = null;
    let testOrderId: string | null = null;

    beforeAll(async () => {
        app = buildApp();
        
        // Create admin token
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
            });
        
        const adminRes = await authApp.handle(new Request('http://localhost/sign-admin'));
        adminToken = await adminRes.text();
    });

    afterAll(async () => {
        // Optional: Cleanup mock data
        // await pool.end(); 
    });

    const baseUrl = '/api/v1/buyback/backmarket';

    it('1. Sync Orders (Populate DB)', async () => {
        console.log('\n🔄 Step 1: Syncing Orders...');
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
        console.log(`   ✅ Synced ${body.totalSynced} orders.`);
    });

    it('2. Sync Listings (Populate DB)', async () => {
        console.log('\n🔄 Step 2: Syncing Listings...');
        const res = await app.handle(new Request(`http://localhost${baseUrl}/sync/listings`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        }));
        expect(res.status).toBe(200);
        const body = await res.json();
        console.log(`   ✅ Synced ${body.totalSynced} listings.`);
    });

    it('3. Ensure Order Exists (Create Mock if needed)', async () => {
        console.log('\n🔍 Step 3: Checking for orders...');
        
        const res = await app.handle(new Request(`http://localhost${baseUrl}/orders?limit=1`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        }));
        const body = await res.json();
        
        if (body.results && body.results.length > 0) {
            testOrderId = body.results[0].order_id;
            console.log(`   ✅ Found existing order: ${testOrderId}`);
        } else {
            console.log('   ⚠️ No orders found. Creating a local MOCK order...');
            testOrderId = 'MOCK-ORDER-999';
            
            await db.insert(backmarket_orders).values({
                order_id: 999, // Must be number for DB schema
                creation_date: new Date(),
                modification_date: new Date(),
                status: 'PENDING',
                currency: 'EUR',
                synced_at: new Date()
            }).onDuplicateKeyUpdate({ set: { synced_at: new Date() } });
            
            console.log(`   ✅ Created mock order: ${testOrderId}`);
        }
    });

    it('4. Ensure Listing Exists (Create Mock if needed)', async () => {
        console.log('\n🔍 Step 4: Checking for listings...');
        
        const res = await app.handle(new Request(`http://localhost${baseUrl}/listings?limit=1`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        }));
        const body = await res.json();
        
        if (body.results && body.results.length > 0) {
            testListingId = body.results[0].listing_id;
            console.log(`   ✅ Found existing listing: ${testListingId}`);
        } else {
            console.log('   ⚠️ No listings found. Creating a local MOCK listing...');
            testListingId = 'MOCK-LISTING-888';
            
            await db.insert(backmarket_listings).values({
                listing_id: testListingId,
                product_id: 'MOCK-PROD-1',
                sku: 'MOCK-SKU-1',
                title: 'Mock iPhone 12',
                price: '500.00',
                currency: 'EUR',
                quantity: 1,
                state: 1,
                synced_at: new Date()
            }).onDuplicateKeyUpdate({ set: { synced_at: new Date() } });
            
            console.log(`   ✅ Created mock listing: ${testListingId}`);
        }
    });

    it('5. Get Live Order Details', async () => {
        if (!testOrderId) throw new Error('No order ID available');
        console.log(`\n📡 Step 5: Fetching live details for order ${testOrderId}...`);

        const res = await app.handle(new Request(`http://localhost${baseUrl}/orders/${testOrderId}/live`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        }));
        
        if (String(testOrderId).startsWith('MOCK-') || testOrderId === '999') {
            // Expect 404 or 403 from real API (403 if ID exists but not ours, 404 if invalid)
            expect([404, 403]).toContain(res.status);
            console.log(`   ✅ Mock order correctly returned ${res.status} from real API.`);
        } else {
            // Expect success
            expect(res.status).toBe(200);
            const body = await res.json();
            console.log(`   ✅ Live details fetched for order ${body.data.order_id}`);
        }
    });

    it('6. Update Listing (Price/Quantity)', async () => {
        if (!testListingId) throw new Error('No listing ID available');
        console.log(`\n✏️ Step 6: Updating listing ${testListingId}...`);

        const res = await app.handle(new Request(`http://localhost${baseUrl}/listings/${testListingId}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                price: 500.00
            })
        }));

        if (String(testListingId).startsWith('MOCK-')) {
            // Expect 404 or 400 from real API
            expect(res.status).not.toBe(200); 
            console.log('   ✅ Mock listing update correctly failed at API level.');
        } else {
            // Expect success
            expect(res.status).toBe(200);
            console.log('   ✅ Real listing updated successfully.');
        }
    });
});
