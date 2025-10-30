import { eq, and } from 'drizzle-orm';
import { db } from '../src/db';
import { device_events, test_results, devices, warehouses, users } from '../src/db/circtek.schema';

/**
 * Script to clean up and repopulate TEST_COMPLETED device events
 * 
 * This script:
 * 1. Deletes all existing TEST_COMPLETED device events (excluding stock_in actions)
 * 2. Repopulates them from the test_results table with complete data including:
 *    - failed_components
 *    - passed_components  
 *    - battery_info
 *    - warehouse_name
 *    - tester_username
 *    - device information
 */

async function repopulateTestEvents() {
  console.log('🔄 Starting TEST_COMPLETED device events repopulation...\n');

  try {
    // Step 1: Delete existing TEST_COMPLETED events (excluding stock_in)
    console.log('🗑️  Step 1: Deleting existing TEST_COMPLETED device events...');
    
    // Get all TEST_COMPLETED events
    const existingEvents = await db
      .select()
      .from(device_events)
      .where(eq(device_events.event_type, 'TEST_COMPLETED'));

    console.log(`   Found ${existingEvents.length} TEST_COMPLETED events`);

    // Filter out stock_in events
    const eventsToDelete = existingEvents.filter(event => {
      const details = event.details as any;
      return details?.action !== 'stock_in';
    });

    console.log(`   Will delete ${eventsToDelete.length} events (preserving ${existingEvents.length - eventsToDelete.length} stock_in events)`);

    // Delete the events
    for (const event of eventsToDelete) {
      await db
        .delete(device_events)
        .where(eq(device_events.id, event.id));
    }

    console.log(`   ✓ Deleted ${eventsToDelete.length} events\n`);

    // Step 2: Fetch all test results with related data
    console.log('📊 Step 2: Fetching test results from database...');
    
    const testResultsData = await db
      .select({
        test_id: test_results.id,
        device_id: test_results.device_id,
        tenant_id: test_results.tenant_id,
        tester_id: test_results.tester_id,
        warehouse_id: test_results.warehouse_id,
        failed_components: test_results.failed_components,
        passed_components: test_results.passed_components,
        battery_info: test_results.battery_info,
        lpn: test_results.lpn,
        serial_number: test_results.serial_number,
        imei: test_results.imei,
        created_at: test_results.created_at,
        // Device info
        device_make: devices.make,
        device_model_name: devices.model_name,
        device_serial: devices.serial,
        device_imei: devices.imei,
        // Warehouse info
        warehouse_name: warehouses.name,
        // Tester info
        tester_username: users.user_name,
      })
      .from(test_results)
      .leftJoin(devices, eq(test_results.device_id, devices.id))
      .leftJoin(warehouses, eq(test_results.warehouse_id, warehouses.id))
      .leftJoin(users, eq(test_results.tester_id, users.id))
      .where(eq(test_results.status, true));

    console.log(`   ✓ Found ${testResultsData.length} test results\n`);

    // Step 3: Create new device events
    console.log('✨ Step 3: Creating new device events with complete data...');
    
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ test_id: number; error: string }> = [];

    for (const result of testResultsData) {
      try {
        await db.insert(device_events).values({
          device_id: result.device_id,
          actor_id: result.tester_id,
          event_type: 'TEST_COMPLETED',
          details: {
            test_result_id: result.test_id,
            make: result.device_make,
            model_name: result.device_model_name,
            serial_number: result.serial_number || result.device_serial,
            imei: result.imei || result.device_imei,
            lpn: result.lpn,
            warehouse_name: result.warehouse_name,
            tester_username: result.tester_username,
            failed_components: result.failed_components,
            passed_components: result.passed_components,
            battery_info: result.battery_info,
          },
          tenant_id: result.tenant_id,
          status: true,
          created_at: result.created_at,
        });
        
        successCount++;
        
        // Progress indicator
        if (successCount % 100 === 0) {
          console.log(`   Progress: ${successCount}/${testResultsData.length} events created`);
        }
      } catch (error) {
        errorCount++;
        errors.push({
          test_id: result.test_id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(`   ✓ Created ${successCount} new device events\n`);

    // Step 4: Summary
    console.log('📋 Summary:');
    console.log(`   ✓ Deleted: ${eventsToDelete.length} old events`);
    console.log(`   ✓ Created: ${successCount} new events`);
    console.log(`   ✓ Preserved: ${existingEvents.length - eventsToDelete.length} stock_in events`);
    
    if (errorCount > 0) {
      console.log(`   ⚠️  Errors: ${errorCount} events failed`);
      console.log('\n❌ Failed events:');
      errors.forEach(({ test_id, error }) => {
        console.log(`   Test ID ${test_id}: ${error}`);
      });
    }

    console.log('\n✅ Repopulation complete!');
    
  } catch (error) {
    console.error('\n❌ Fatal error during repopulation:', error);
    throw error;
  }
}

// Run the script
repopulateTestEvents()
  .then(() => {
    console.log('\n🎉 Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
