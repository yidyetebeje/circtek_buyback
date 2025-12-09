import 'dotenv/config';
import { drizzle } from "drizzle-orm/mysql2";
import mysql from 'mysql2/promise';

// Create a MySQL promise pool from the DATABASE_URL and pass it to Drizzle
const isTest = process.env.NODE_ENV === 'test';
const connectionUrl = isTest && process.env.DATABASE_URL_TEST ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;

if (!connectionUrl) {
  throw new Error(`DATABASE_URL is not defined. NODE_ENV=${process.env.NODE_ENV}`);
}

export const pool = mysql.createPool(connectionUrl);
export const db = drizzle(pool);
