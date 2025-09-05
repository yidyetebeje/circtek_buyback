import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: ['./src/db/*.schema.ts'],
  dialect: 'mysql',
  dbCredentials: {
    url: (process.env.NODE_ENV === 'test' && process.env.DATABASE_URL_TEST)
      ? process.env.DATABASE_URL_TEST!
      : process.env.DATABASE_URL!,
  },
});
