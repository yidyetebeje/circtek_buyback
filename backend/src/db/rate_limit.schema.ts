import { mysqlTable, int, varchar, timestamp, serial, index } from 'drizzle-orm/mysql-core';

export const rate_limit_logs = mysqlTable('rate_limit_logs', {
  id: serial('id').primaryKey(),
  endpoint: varchar('endpoint', { length: 500 }).notNull(),
  priority: int('priority').notNull(), // 0=CRITICAL, 1=HIGH, 2=NORMAL, 3=LOW
  status: varchar('status', { length: 50 }).notNull(), // 'QUEUED', 'EXECUTED', '429_HIT', 'ERROR'
  response_status: int('response_status'), // HTTP status code
  duration: int('duration'), // Request duration in milliseconds
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => [
  index('idx_rate_limit_logs_timestamp').on(table.timestamp),
  index('idx_rate_limit_logs_priority').on(table.priority),
  index('idx_rate_limit_logs_status').on(table.status),
]);
