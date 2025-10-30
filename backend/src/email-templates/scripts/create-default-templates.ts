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
   
    const allShops = await db.select().from(shops);
    
    if (!allShops || allShops.length === 0) {
     
      return;
    }
    
   
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const shop of allShops) {
      try {
       
        const templates = await emailTemplateService.createSampleTemplates(shop.id);
       
        successCount++;
      } catch (error) {
        console.error(`Error creating templates for shop ${shop.name} (ID: ${shop.id}):`, error);
        errorCount++;
      }
    }
    
   
   
   
   
   
    
  } catch (error) {
    console.error('Error running script:', error);
  } finally {
    process.exit(0);
  }
}

// Run the main function
main();
