import { emailTemplateService } from '../services/email-template-service';
import { EMAIL_TEMPLATE_TYPE } from '../types';
import { db } from '../../db';
import { shops } from '../../db/shops.schema';
/**
 * This script creates default email templates for each shop
 * Run it with: 
 *    bun run src/email-templates/scripts/create-default-templates.ts
 */

async function main() {
  try {
    console.log('Fetching all shops...');
    const allShops = await db.select().from(shops);

    if (!allShops || allShops.length === 0) {
      console.log('No shops found. Please create a shop first.');
      return;
    }

    console.log(`Found ${allShops.length} shops. Creating default templates...`);

    let successCount = 0;
    let errorCount = 0;

    for (const shop of allShops) {
      try {
        console.log(`Creating sample templates for shop: ${shop.name} (ID: ${shop.id})...`);
        const templates = await emailTemplateService.createSampleTemplates(shop.id, Number(shop.tenant_id));
        console.log(`Created ${templates.length} sample templates for shop: ${shop.name}`);
        successCount++;
      } catch (error) {
        console.error(`Error creating templates for shop ${shop.name} (ID: ${shop.id}):`, error);
        errorCount++;
      }
    }

    console.log('============== SUMMARY ==============');
    console.log(`Total shops processed: ${allShops.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log('====================================');

  } catch (error) {
    console.error('Error running script:', error);
  } finally {
    process.exit(0);
  }
}

// Run the main function
main();
