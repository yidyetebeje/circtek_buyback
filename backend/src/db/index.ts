import 'dotenv/config';
import { drizzle } from "drizzle-orm/mysql2";
import mysql from 'mysql2/promise';

import * as catalogueSchema from './buyback_catalogue.schema';
import * as circtekSchema from './circtek.schema';
import * as emailTemplateSchema from './email_template.schema';
import * as faqSchema from './faq.schema';
import * as i18nSchema from './i18n.schema';
import * as orderSchema from './order.schema';
import * as shopCatalogSchema from './shop_catalog.schema';
import * as shopsSchema from './shops.schema';

const schema = {
    ...catalogueSchema,
    ...circtekSchema,
    ...emailTemplateSchema,
    ...faqSchema,
    ...i18nSchema,
    ...orderSchema,
    ...shopCatalogSchema,
    ...shopsSchema,
};

// Create a MySQL promise pool from the DATABASE_URL and pass it to Drizzle
const isTest = process.env.NODE_ENV === 'test'
const connectionUrl = isTest && process.env.DATABASE_URL_TEST ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL!
const pool = mysql.createPool(connectionUrl);
export const db = drizzle(pool, { schema, mode: 'default' });

