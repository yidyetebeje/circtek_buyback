import { db } from '../db';
import { test_results } from '../db/circtek.schema';
import { sql, desc, isNotNull } from 'drizzle-orm';

/**
 * This script analyzes and fixes problematic test components in the failed_components field
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

async function analyzeFailedComponents(daysBack: number) {
 
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  startDate.setHours(0, 0, 0, 0);

  // Get all test results with failed components
  const results = await db
    .select({
      id: test_results.id,
      created_at: test_results.created_at,
      imei: test_results.imei,
      serial_number: test_results.serial_number,
      failed_components: test_results.failed_components
    })
    .from(test_results)
    .where(sql`${test_results.created_at} >= ${startDate} AND ${test_results.failed_components} IS NOT NULL AND ${test_results.failed_components} != ''`)
    .orderBy(desc(test_results.created_at));

 

  if (results.length === 0) {
   
    return { results: [], uniqueComponents: new Set() };
  }

  // Collect all unique components
  const uniqueComponents = new Set<string>();
  const componentCounts = new Map<string, number>();

  results.forEach(result => {
    if (result.failed_components) {
      const components = result.failed_components
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);
      
      components.forEach(comp => {
        uniqueComponents.add(comp);
        componentCounts.set(comp, (componentCounts.get(comp) || 0) + 1);
      });
    }
  });

 
  const sortedComponents = Array.from(componentCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  sortedComponents.forEach(([component, count]) => {
    const isProblematic = COMPONENTS_TO_REMOVE.some(
      removeComp => component.toLowerCase() === removeComp.toLowerCase()
    );
    const marker = isProblematic ? '⚠️  [WILL BE REMOVED]' : '';
   
  });

 
  results.slice(0, 5).forEach(result => {
   
   
   
  });

  return { results, uniqueComponents };
}

async function fixFailedComponents(daysBack: number, dryRun: boolean = false) {
  try {
   
   

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

   

    // First analyze
    const { results } = await analyzeFailedComponents(daysBack);

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
      
      if (!dryRun) {
        await db
          .update(test_results)
          .set({ 
            failed_components: newFailedComponents || null,
            updated_at: new Date()
          })
          .where(sql`${test_results.id} = ${id}`);
      }

      const updateInfo = {
        id,
        date: created_at,
        imei: imei || 'N/A',
        serial: serial_number || 'N/A',
        removed: removedComponents,
        beforeCount: components.length,
        afterCount: cleanedComponents.length,
        newValue: newFailedComponents || '(empty)',
        before: failed_components,
        after: newFailedComponents
      };

      updatedRecords.push(updateInfo);

     
     
     
     
     
     

      updatedCount++;
    }

   
   
   
   
   
   
    
    if (updatedRecords.length > 0) {
     
      updatedRecords.forEach(record => {
       
      });
    }
    
    if (dryRun && updatedCount > 0) {
     
    } else if (updatedCount > 0) {
     
    }
    
   

  } catch (error) {
    console.error('Error fixing failed components:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const daysBack = args[0] ? parseInt(args[0]) : 30;
const applyMode = args[1] === 'apply';
const dryRun = !applyMode;

if (isNaN(daysBack) || daysBack < 1) {
  console.error('Usage: npx tsx src/scripts/analyze-and-fix-failed-components.ts <days> [apply]');
  console.error('  <days>  - Number of days to look back (default: 30)');
  console.error('  apply   - Apply changes (default: dry-run mode)');
  console.error('\nExamples:');
  console.error('  npx tsx src/scripts/analyze-and-fix-failed-components.ts 7         # Dry run for last 7 days');
  console.error('  npx tsx src/scripts/analyze-and-fix-failed-components.ts 30 apply  # Apply changes for last 30 days');
  process.exit(1);
}

// Run the script
fixFailedComponents(daysBack, dryRun)
  .then(() => {
   
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script execution failed:', error);
    process.exit(1);
  });
