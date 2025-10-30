import { db } from '../db';
import { test_results } from '../db/circtek.schema';
import { sql, desc } from 'drizzle-orm';

/**
 * This script removes problematic test components from the failed_components field
 * in test_results table for a specified date range.
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

async function showRecentTestResults() {
 
  
  const recentResults = await db
    .select({
      id: test_results.id,
      created_at: test_results.created_at,
      imei: test_results.imei,
      serial_number: test_results.serial_number,
      failed_components: test_results.failed_components
    })
    .from(test_results)
    .orderBy(desc(test_results.created_at))
    .limit(10);

  if (recentResults.length === 0) {
   
    return;
  }

 
  recentResults.forEach(result => {
    const hasProblematicComponents = result.failed_components 
      ? COMPONENTS_TO_REMOVE.some(comp => 
          result.failed_components!.toLowerCase().includes(comp.toLowerCase())
        )
      : false;
    
   
   
   
    if (hasProblematicComponents) {
     
    }
   
  });
}

async function fixFailedComponents(daysBack: number = 7) {
  try {
   

    // Get test results from the last N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

   
   

    // Show recent results first
    await showRecentTestResults();

    // Fetch test results from the specified period
    const results = await db
      .select()
      .from(test_results)
      .where(sql`${test_results.created_at} >= ${startDate}`);

   

    if (results.length === 0) {
     
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;
    const updatedRecords: any[] = [];

    for (const result of results) {
      const { id, failed_components, imei, serial_number, created_at } = result;
      
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

      const updateInfo = {
        id,
        date: created_at,
        imei: imei || 'N/A',
        serial: serial_number || 'N/A',
        removed: removedComponents,
        beforeCount: components.length,
        afterCount: cleanedComponents.length,
        newValue: newFailedComponents || '(empty)'
      };

      updatedRecords.push(updateInfo);

     
     
     
     
     
     
     

      updatedCount++;
    }

   
   
   
   
   
    
    if (updatedRecords.length > 0) {
     
      updatedRecords.forEach(record => {
       
      });
    }
    
   

  } catch (error) {
    console.error('Error fixing failed components:', error);
    throw error;
  }
}

// Get days back from command line argument or default to 7 days
const daysBack = process.argv[2] ? parseInt(process.argv[2]) : 7;

if (isNaN(daysBack) || daysBack < 1) {
  console.error('Invalid number of days. Please provide a positive integer.');
  process.exit(1);
}

// Run the script
fixFailedComponents(daysBack)
  .then(() => {
   
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script execution failed:', error);
    process.exit(1);
  });
