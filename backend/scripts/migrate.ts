import { migrate } from 'drizzle-orm/mysql2/migrator';
import { db, pool } from '../src/db';

async function main() {
  console.log('Running migrations...');
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
