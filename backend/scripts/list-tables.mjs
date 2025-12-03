import 'dotenv/config';
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set. Check backend/.env or your environment.');
  process.exit(1);
}

(async () => {
  const pool = mysql.createPool(url);
  try {
    console.log('Using DATABASE_URL (redacted):', url.replace(/(:).*(@)/, ':******@'));
    const [rows] = await pool.query('SHOW TABLES');
    console.log('Tables in configured database:');
    console.table(rows);
  } catch (err) {
    console.error('Error while listing tables:');
    console.error(err);
    process.exitCode = 2;
  } finally {
    await pool.end();
  }
})();
