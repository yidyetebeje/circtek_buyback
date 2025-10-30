import { db } from '../db';
import { test_results } from '../db/circtek.schema';
import { sql } from 'drizzle-orm';

/**
 * This script removes problematic test components from the failed_components field
 * in test_results table for this week's entries.
 * 
 * Components to remove (caused by software issue):
 * - LCD
 * - Loud speaker
 * - Ear speaker
 * - Front microphone
 * - Rear microphone
 * - Bottom microphone
 * - Flashlight
 * - Simcard
 * - Network connectivity
 * - NFC
 */

// List of components to remove (case-insensitive matching)
const COMPONENTS_TO_REMOVE = [
  'LCD',
  'Loud speaker',
  'Ear speaker',
  'Front microphone',
  'Rear microphone',
  'Bottom microphone',
  'Flashlight',
  'Simcard',
  'Network connectivity',
  'NFC'
];

async function fixFailedComponents() {
  try {
   

    // Get the start of this week (Sunday 00:00:00)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

   

    // Fetch test results from this week
    const results = await db
      .select()
      .from(test_results)
      .where(sql`${test_results.created_at} >= ${weekStart}`);

   

    if (results.length === 0) {
     
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;

    for (const result of results) {
      const { id, failed_components, imei, serial_number } = result;
      
      if (!failed_components || failed_components.trim() === '') {
       
        skippedCount++;
        continue;
      }

      // Parse comma-separated failed components
      const components = failed_components
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      // Filter out the problematic components (case-insensitive)
      const cleanedComponents = components.filter(component => {
        const shouldRemove = COMPONENTS_TO_REMOVE.some(
          removeComp => component.toLowerCase() === removeComp.toLowerCase()
        );
        return !shouldRemove;
      });

      // Check if anything changed
      if (cleanedComponents.length === components.length) {
       
        skippedCount++;
        continue;
      }

      const removedComponents = components.filter(
        c => !cleanedComponents.includes(c)
      );

      // Update the record with cleaned components
      const newFailedComponents = cleanedComponents.join(', ');
      
      await db
        .update(test_results)
        .set({ 
          failed_components: newFailedComponents || null,
          updated_at: new Date()
        })
        .where(sql`${test_results.id} = ${id}`);

     
     
     
     
     
     

      updatedCount++;
    }

   
   
   
   
   

  } catch (error) {
    console.error('Error fixing failed components:', error);
    throw error;
  }
}

// Run the script
fixFailedComponents()
  .then(() => {
   
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script execution failed:', error);
    process.exit(1);
  });
