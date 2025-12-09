import { mysqlTable, serial, varchar, json, text, timestamp, bigint } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { users } from './circtek.schema';

export const system_config = mysqlTable('system_config', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: json('value').notNull(),
  description: text('description'),
  updated_at: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
  updated_by: bigint('updated_by', { mode: 'number', unsigned: true }).references(() => users.id),
});
