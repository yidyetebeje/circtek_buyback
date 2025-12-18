import 'dotenv/config';
import { db } from '../db';
import { backmarket_competitors, backmarket_listings, backmarket_price_history } from '../db/backmarket.schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Starting Back Market data population...');

  // 1. Create Competitors
  const competitors = [
    { name: 'Competitor A', backmarket_seller_id: 'SELLER_A' },
    { name: 'Competitor B', backmarket_seller_id: 'SELLER_B' },
    { name: 'Competitor C', backmarket_seller_id: 'SELLER_C' },
  ];

  for (const comp of competitors) {
    try {
      await db.insert(backmarket_competitors).values(comp);
      console.log(`Created competitor: ${comp.name}`);
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') {
        console.log(`Competitor ${comp.name} already exists.`);
      } else {
        console.error(`Error creating competitor ${comp.name}:`, e);
      }
    }
  }

  // 2. Update Base Price for Listings (Example)
  // Fetch some listings
  const listings = await db.select().from(backmarket_listings).limit(5);
  
  if (listings.length === 0) {
    console.log('No listings found. Creating a dummy listing...');
    const dummyListing = {
      listing_id: '123456',
      sku: 'IPHONE12-64-BLK-A',
      title: 'iPhone 12 64GB Black Grade A',
      price: '400.00',
      base_price: '350.00',
      currency: 'EUR',
      quantity: 10,
      state: 1,
      grade: 1,
      publication_state: 1
    };
    await db.insert(backmarket_listings).values(dummyListing);
    listings.push(dummyListing as any);
  }

  for (const listing of listings) {
    if (!listing.base_price) {
      const newBasePrice = (parseFloat(listing.price as string) * 0.9).toFixed(2);
      await db.update(backmarket_listings)
        .set({ base_price: newBasePrice })
        .where(eq(backmarket_listings.listing_id, listing.listing_id));
      console.log(`Updated base price for listing ${listing.listing_id} to ${newBasePrice}`);
    }
  }

  // 3. Create Price History
  // For each listing, create some history entries
  const comps = await db.select().from(backmarket_competitors);
  
  for (const listing of listings) {
    // Our price history
    await db.insert(backmarket_price_history).values({
      listing_id: listing.listing_id,
      price: listing.price as string,
      currency: listing.currency || 'EUR',
      is_winner: true,
      timestamp: new Date()
    });

    // Competitor prices
    for (const comp of comps) {
      const randomPrice = (parseFloat(listing.price as string) * (0.9 + Math.random() * 0.2)).toFixed(2);
      await db.insert(backmarket_price_history).values({
        listing_id: listing.listing_id,
        competitor_id: comp.id,
        price: randomPrice,
        currency: listing.currency || 'EUR',
        timestamp: new Date(),
        is_winner: false
      });
    }
    console.log(`Created price history for listing ${listing.listing_id}`);
  }

  console.log('Done!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
