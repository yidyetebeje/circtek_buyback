import { db } from './src/db';
import { backmarket_listings } from './src/db/backmarket.schema';
import { count } from 'drizzle-orm';

async function checkListings() {
  const result = await db.select({ count: count() }).from(backmarket_listings);
  console.log('Total listings in DB:', result[0].count);
}

checkListings();
