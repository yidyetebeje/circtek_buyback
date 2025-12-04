
import { buildApp } from '../src/app';
import { BackMarketService } from '../src/buyback/services/backMarketService';
import { jwt } from '@elysiajs/jwt';
import { Elysia } from 'elysia';

async function main() {
    console.log('🚀 Testing Back Market HTTP Routes...');

    // 1. Setup App and Auth
    const app = buildApp();
    const jwtSecret = process.env.JWT_SECRET || 'dev_secret';
    
    // Create a temporary JWT signer to generate a token
    const authApp = new Elysia()
        .use(jwt({
            name: 'jwt',
            secret: jwtSecret
        }))
        .get('/sign', async ({ jwt }) => {
            return await jwt.sign({
                sub: '1',
                role: 'super_admin',
                tenant_id: 1
            });
        });
    
    const tokenRes = await authApp.handle(new Request('http://localhost/sign'));
    const token = await tokenRes.text();

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 2. Get valid IDs to test with using the Service directly
    console.log('🔍 Fetching valid IDs for testing...');
    const service = new BackMarketService();
    
    let orderId = '0';
    let listingId = '0';

    try {
        const ordersRes = await service.getBuyBackOrders({ limit: 1 });
        if (ordersRes.ok) {
            const data = await ordersRes.json();
            if (data.results?.[0]) {
                orderId = data.results[0].order_id;
                console.log(`   ✅ Found Order ID: ${orderId}`);
            }
        }

        const listingsRes = await service.getListings({ limit: 1 });
        if (listingsRes.ok) {
            const data = await listingsRes.json();
            if (data.results?.[0]) {
                listingId = data.results[0].listing_id;
                console.log(`   ✅ Found Listing ID: ${listingId}`);
            }
        }
    } catch (e) {
        console.error('   ⚠️ Failed to fetch real IDs, using placeholders (tests might 404)');
    }

    // 3. Test GET /orders/:orderId/live
    if (orderId !== '0') {
        console.log(`\nTesting GET /api/v1/buyback/backmarket/orders/${orderId}/live ...`);
        const req = new Request(`http://localhost/api/v1/buyback/backmarket/orders/${orderId}/live`, {
            headers
        });
        const res = await app.handle(req);
        const body = await res.json();
        
        console.log(`   Status: ${res.status}`);
        console.log(`   Success: ${body.success}`);
        if (body.success) {
            console.log(`   Data: Order ${body.data.order_id} fetched successfully`);
        } else {
            console.log(`   Error: ${JSON.stringify(body)}`);
        }
    }

    // 4. Test POST /listings/:listingId
    // We will send a dummy update that shouldn't break anything (e.g. same price or just testing the endpoint reachability)
    // Actually, to be safe, we might just want to see if we get a 400 or 200. 
    // Let's try to update with the SAME price if we can find it, or just skip the actual update to avoid messing with live data.
    // But the user asked to "run these routes".
    // I'll send a request with a clearly invalid body to check validation, or a safe update if possible.
    // The controller passes body directly: `const updateData = body as any;`
    // I'll skip the actual POST to avoid changing data on the user's account unless I'm sure.
    // But I can try to update a non-existent listing to see the 404 from the API, which proves the route works.
    
    console.log(`\nTesting POST /api/v1/buyback/backmarket/listings/INVALID_ID ...`);
    const reqPost = new Request(`http://localhost/api/v1/buyback/backmarket/listings/INVALID_ID_TEST`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ price: 100 })
    });
    const resPost = await app.handle(reqPost);
    const bodyPost = await resPost.json();
    
    console.log(`   Status: ${resPost.status}`);
    // We expect success: false because the ID is invalid, but the route should be hit.
    console.log(`   Response: ${JSON.stringify(bodyPost)}`);
    
    console.log('\nDone.');
    process.exit(0);
}

main();
