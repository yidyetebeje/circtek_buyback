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
  console.log('=== Analyzing Failed Components ===\n');
  
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

  console.log(`Found ${results.length} test results with failed components in the last ${daysBack} days.\n`);

  if (results.length === 0) {
    console.log('No test results with failed components found.');
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

  console.log('=== Unique Failed Components Found ===');
  const sortedComponents = Array.from(componentCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  sortedComponents.forEach(([component, count]) => {
    const isProblematic = COMPONENTS_TO_REMOVE.some(
      removeComp => component.toLowerCase() === removeComp.toLowerCase()
    );
    const marker = isProblematic ? '⚠️  [WILL BE REMOVED]' : '';
    console.log(`  ${component} (${count} occurrences) ${marker}`);
  });

  console.log('\n=== Sample Test Results ===');
  results.slice(0, 5).forEach(result => {
    console.log(`[ID: ${result.id}] ${result.created_at.toISOString()}`);
    console.log(`  Device: IMEI=${result.imei || 'N/A'}, Serial=${result.serial_number || 'N/A'}`);
    console.log(`  Failed: ${result.failed_components}\n`);
  });

  return { results, uniqueComponents };
}

async function fixFailedComponents(daysBack: number, dryRun: boolean = false) {
  try {
    console.log('Starting failed components cleanup...');
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be applied)'}\n`);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    console.log(`Date range: Last ${daysBack} days (from ${startDate.toISOString()})\n`);

    // First analyze
    const { results } = await analyzeFailedComponents(daysBack);

    if (results.length === 0) {
      console.log('\nNo test results to process. Exiting.');
      return;
    }

    console.log('\n=== Processing Updates ===\n');

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

      console.log(`${dryRun ? '[DRY RUN] ' : ''}[ID: ${id}] ${dryRun ? 'Would be updated' : 'Updated successfully'}`);
      console.log(`  Date: ${created_at.toISOString()}`);
      console.log(`  Device: IMEI=${imei || 'N/A'}, Serial=${serial_number || 'N/A'}`);
      console.log(`  Removed: ${removedComponents.join(', ')}`);
      console.log(`  Before: "${failed_components}"`);
      console.log(`  After:  "${newFailedComponents || '(empty)'}"\n`);

      updatedCount++;
    }

    console.log('\n=== Summary ===');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Date range: Last ${daysBack} days`);
    console.log(`Total test results with failed components: ${results.length}`);
    console.log(`${dryRun ? 'Would be updated' : 'Updated'}: ${updatedCount}`);
    console.log(`Skipped (no problematic components): ${skippedCount}`);
    
    if (updatedRecords.length > 0) {
      console.log('\n=== Affected Records ===');
      updatedRecords.forEach(record => {
        console.log(`ID ${record.id} (${record.date.toISOString().split('T')[0]}): Removed ${record.removed.join(', ')}`);
      });
    }
    
    if (dryRun && updatedCount > 0) {
      console.log('\n⚠️  This was a DRY RUN. To apply changes, run: npx tsx src/scripts/analyze-and-fix-failed-components.ts <days> apply');
    } else if (updatedCount > 0) {
      console.log('\n✓ Changes have been applied to the database!');
    }
    
    console.log('\nCleanup completed successfully!');

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
    console.log('\n✓ Script execution completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script execution failed:', error);
    process.exit(1);
  });
