import { sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

export async function up(db: MySql2Database<any>) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`backmarket_pricing_parameters\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`sku\` varchar(255) NOT NULL,
      \`grade\` int NOT NULL,
      \`country_code\` varchar(5) NOT NULL,
      \`c_refurb\` decimal(10,2) DEFAULT '0.00',
      \`c_op\` decimal(10,2) DEFAULT '0.00',
      \`c_risk\` decimal(10,2) DEFAULT '0.00',
      \`m_target\` decimal(5,4) DEFAULT '0.1500',
      \`f_bm\` decimal(5,4) DEFAULT '0.1000',
      \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_pricing_sku_grade_country\` (\`sku\`,\`grade\`,\`country_code\`),
      KEY \`idx_pricing_sku\` (\`sku\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export async function down(db: MySql2Database<any>) {
  await db.execute(sql`DROP TABLE IF EXISTS \`backmarket_pricing_parameters\``);
}
