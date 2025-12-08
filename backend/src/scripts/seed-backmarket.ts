import { db } from '../db';
import { backmarket_listings, backmarket_price_history, backmarket_orders } from '../db/backmarket.schema';
import { faker } from '@faker-js/faker';

async function seedBackMarket() {
  console.log('🌱 Seeding Back Market data...');

  // 1. Seed Listings
  const listings = [];
  const listingIds = [];
  
  for (let i = 0; i < 20; i++) {
    const listingId = faker.string.uuid();
    listingIds.push(listingId);
    
    listings.push({
      listing_id: listingId,
      product_id: faker.string.numeric(10),
      sku: `IPHONE-${faker.number.int({ min: 11, max: 15 })}-${faker.helpers.arrayElement(['64', '128', '256'])}-${faker.helpers.arrayElement(['BLK', 'WHT', 'RED'])}`,
      title: `iPhone ${faker.number.int({ min: 11, max: 15 })} ${faker.helpers.arrayElement(['64GB', '128GB', '256GB'])} - Unlocked`,
      price: faker.commerce.price({ min: 200, max: 800 }),
      base_price: faker.commerce.price({ min: 150, max: 700 }),
      currency: 'EUR',
      quantity: faker.number.int({ min: 0, max: 50 }),
      state: 1, // Refurbished
      grade: faker.number.int({ min: 1, max: 3 }),
      publication_state: 2, // Active
      last_dip_at: faker.date.recent({ days: 1 }),
      synced_at: new Date()
    });
  }

  await db.insert(backmarket_listings).values(listings);
  console.log(`✅ Seeded ${listings.length} listings`);

  // 2. Seed Price History
  const history = [];
  for (const listingId of listingIds) {
    // Generate 5-10 history points for each listing
    const points = faker.number.int({ min: 5, max: 10 });
    let currentPrice = parseFloat(listings.find(l => l.listing_id === listingId)?.price as string || "300");

    for (let j = 0; j < points; j++) {
      const isWinner = faker.datatype.boolean();
      const priceChange = faker.number.float({ min: -10, max: 10, fractionDigits: 2 });
      currentPrice += priceChange;

      history.push({
        listing_id: listingId,
        price: currentPrice.toFixed(2),
        currency: 'EUR',
        is_winner: isWinner,
        timestamp: faker.date.recent({ days: 7 }),
        competitor_id: undefined
      });
    }
  }

  await db.insert(backmarket_price_history).values(history);
  console.log(`✅ Seeded ${history.length} price history entries`);

  console.log('🎉 Back Market seeding completed!');
  process.exit(0);
}

seedBackMarket().catch(console.error);
