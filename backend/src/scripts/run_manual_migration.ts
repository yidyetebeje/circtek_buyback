import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Running manual migration...');

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`backmarket_competitors\` (
        \`id\` bigint AUTO_INCREMENT NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`backmarket_seller_id\` varchar(100),
        \`created_at\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`backmarket_competitors_pk\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`uq_competitor_name\` UNIQUE(\`name\`)
      );
    `);
    console.log('Created backmarket_competitors');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`backmarket_price_history\` (
        \`id\` bigint AUTO_INCREMENT NOT NULL,
        \`listing_id\` varchar(50) NOT NULL,
        \`competitor_id\` bigint,
        \`price\` decimal(10,2) NOT NULL,
        \`currency\` varchar(3) NOT NULL,
        \`timestamp\` timestamp NOT NULL DEFAULT (now()),
        \`is_winner\` boolean DEFAULT false,
        CONSTRAINT \`backmarket_price_history_pk\` PRIMARY KEY(\`id\`)
      );
    `);
    console.log('Created backmarket_price_history');

    try {
      await db.execute(sql`
        CREATE INDEX \`idx_history_listing\` ON \`backmarket_price_history\` (\`listing_id\`);
      `);
    } catch (e: any) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('Index idx_history_listing already exists');
      } else {
        console.log('Error creating index idx_history_listing:', e.message);
      }
    }

    try {
      await db.execute(sql`
        CREATE INDEX \`idx_history_timestamp\` ON \`backmarket_price_history\` (\`timestamp\`);
      `);
    } catch (e: any) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('Index idx_history_timestamp already exists');
      } else {
        console.log('Error creating index idx_history_timestamp:', e.message);
      }
    }
    console.log('Created indexes');

    // Check if column exists before adding
    try {
      await db.execute(sql`
        ALTER TABLE \`backmarket_listings\` ADD \`base_price\` decimal(10,2);
      `);
      console.log('Added base_price column');
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('base_price column already exists');
      } else {
        throw e;
      }
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
}

main();
