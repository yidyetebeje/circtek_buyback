# Backend Scripts

This directory contains maintenance and data migration scripts for the Circtek backend.

## Available Scripts

### Repopulate Test Events

**Script:** `repopulate-test-events.ts`

**Purpose:** Clean up and repopulate TEST_COMPLETED device events from the test_results table with complete data including failed_components, passed_components, and battery_info.

**When to use:**
- After fixing device event creation logic
- When historical test events are missing failed_components data
- When you need to ensure all test events have consistent data structure

**What it does:**
1. Deletes all existing TEST_COMPLETED device events (preserving stock_in events)
2. Fetches all test results with complete data from test_results table
3. Creates new device events with:
   - test_result_id (for future enrichment)
   - failed_components
   - passed_components
   - battery_info
   - warehouse_name
   - tester_username
   - device information (make, model, IMEI, serial, LPN)
4. Maintains original created_at timestamps

**How to run:**

```bash
# From the backend directory
npm run repopulate:test-events

# Or with bun directly
bun run scripts/repopulate-test-events.ts
```

**Expected output:**
```
🔄 Starting TEST_COMPLETED device events repopulation...

🗑️  Step 1: Deleting existing TEST_COMPLETED device events...
   Found 150 TEST_COMPLETED events
   Will delete 145 events (preserving 5 stock_in events)
   ✓ Deleted 145 events

📊 Step 2: Fetching test results from database...
   ✓ Found 150 test results

✨ Step 3: Creating new device events with complete data...
   Progress: 100/150 events created
   ✓ Created 150 new device events

📋 Summary:
   ✓ Deleted: 145 old events
   ✓ Created: 150 new events
   ✓ Preserved: 5 stock_in events

✅ Repopulation complete!

🎉 Script finished successfully
```

**Important notes:**
- ⚠️ This script modifies production data. Back up your database before running.
- ✅ Stock_in events are preserved (not deleted)
- ✅ Original timestamps are maintained
- ✅ The script is idempotent - safe to run multiple times

**Verification:**

After running the script, verify in the frontend:
1. Navigate to Device History
2. Search for a device that has test results
3. Check that TEST_COMPLETED events now show:
   - Failed components (if any)
   - Test results
   - Complete device information

## Other Scripts

### Import Scripts
- `import:repair-reasons` - Import repair reasons from CSV
- `import:devices` - Import devices from repair records
- `import:users` - Import users from repair records
- `import:repairs` - Import repair records from CSV
- `import:purchases` - Import purchase records from CSV

### Utility Scripts
- `check:stock` - Check repair parts stock levels
- `list:purchase-items` - List all purchase items

## Adding New Scripts

When creating new scripts:

1. Create the script file in `/backend/scripts/`
2. Add proper TypeScript imports
3. Include error handling and logging
4. Add a npm script in `package.json`
5. Document it in this README
6. Test thoroughly before running on production data

Example template:

```typescript
import { db } from '../src/db';
import { your_table } from '../src/db/circtek.schema';

async function yourScriptFunction() {
 
  
  try {
    // Your logic here
   
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

yourScriptFunction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
```
