# Licensing System Documentation

## Overview

The Circtek Licensing System implements a usage-based licensing model with two account types (Prepaid and Credit) and a 30-day retest window feature. This system ensures that every diagnostic test is properly authorized and tracked for billing purposes.

## Core Concepts

### 1. Account Types

**Prepaid Customers:**
- Must have a positive license balance to run tests
- Licenses are consumed when balance > 0
- Tests are blocked when balance ≤ 0
- Suitable for customers who pay upfront

**Credit Customers:**
- Can run tests even with negative balance
- Usage is tracked for monthly invoicing
- No upfront payment required
- Suitable for enterprise customers with billing agreements

### 2. 30-Day Retest Window

When a device is tested:
- A license is consumed (unless it's a retest)
- A 30-day retest window is created for that device + license type combination
- Any subsequent tests on the same device with the same license type within 30 days are **FREE**
- After 30 days, a new license is consumed

### 3. License Types

License types are defined by:
- **Product Category**: iPhone, MacBook, AirPods, Android
- **Test Type**: Diagnostic, Erasure, etc.
- **Price**: Unit price for billing

Example: "iPhone Diagnostic License" - $2.50 per test

## Database Schema

### Tables

#### `license_types`
Defines available license products.

```sql
- id: Primary key
- name: Display name (e.g., "iPhone Diagnostic License")
- product_category: Device category (iPhone, MacBook, etc.)
- test_type: Type of test (Diagnostic, Erasure)
- price: Unit price for billing
- description: Optional description
- status: Active/inactive flag
```

#### `license_ledger`
Audit trail of all license transactions.

```sql
- id: Primary key
- tenant_id: Customer ID
- license_type_id: Type of license
- amount: +N for purchase/refund, -1 for usage
- transaction_type: purchase | usage | refund | adjustment
- reference_type: Source of transaction (order, test_result, manual)
- reference_id: ID of related record
- device_identifier: IMEI/Serial for usage tracking
- notes: Additional information
- created_by: User who created the transaction
- created_at: Timestamp
```

#### `device_licenses`
Tracks 30-day retest windows per device.

```sql
- id: Primary key
- device_identifier: IMEI or Serial Number
- license_type_id: Type of license
- tenant_id: Customer ID
- license_activated_at: When first test occurred
- retest_valid_until: license_activated_at + 30 days
- ledger_entry_id: Reference to ledger entry
```

#### `tenants` (updated)
Added `account_type` field:

```sql
- account_type: ENUM('prepaid', 'credit') DEFAULT 'prepaid'
```

## API Endpoints

### Core Authorization

#### `POST /api/v1/licensing/authorize-test`
**Purpose:** Authorize a test and consume license if needed.

**Request Body:**
```json
{
  "device_identifier": "123456789012345",
  "license_type_id": 1,
  // OR use product_category + test_type
  "product_category": "iPhone",
  "test_type": "Diagnostic"
}
```

**Response (Success - Free Retest):**
```json
{
  "data": {
    "authorized": true,
    "reason": "free_retest",
    "license_type": { ... },
    "device_license": { ... }
  },
  "message": "Free retest authorized",
  "status": 200
}
```

**Response (Success - License Consumed):**
```json
{
  "data": {
    "authorized": true,
    "reason": "license_consumed",
    "license_type": { ... },
    "device_license": { ... },
    "ledger_entry": { ... },
    "balance_remaining": 99
  },
  "message": "License consumed",
  "status": 200
}
```

**Response (Failure - Insufficient Licenses):**
```json
{
  "data": {
    "authorized": false,
    "reason": "insufficient_licenses",
    "license_type": { ... },
    "balance_remaining": 0
  },
  "message": "Insufficient licenses",
  "status": 402
}
```

### License Management

#### `GET /api/v1/licensing/balances`
Get license balances for current tenant.

**Response:**
```json
{
  "data": [
    {
      "license_type_id": 1,
      "license_type_name": "iPhone Diagnostic License",
      "product_category": "iPhone",
      "test_type": "Diagnostic",
      "balance": 100,
      "price": "2.50"
    }
  ],
  "status": 200
}
```

#### `GET /api/v1/licensing/ledger`
Get transaction history for current tenant.

**Query Params:**
- `license_type_id` (optional): Filter by license type

#### `GET /api/v1/licensing/license-types`
List all available license types.

### Superadmin Only

#### `POST /api/v1/licensing/license-types`
Create a new license type.

**Request Body:**
```json
{
  "name": "Samsung Diagnostic License",
  "product_category": "Android",
  "test_type": "Diagnostic",
  "price": 2.00,
  "description": "License for Samsung device diagnostics"
}
```

#### `POST /api/v1/licensing/adjustments`
Manual license adjustment (add/remove licenses).

**Request Body:**
```json
{
  "tenant_id": 1,
  "license_type_id": 1,
  "amount": 50,
  "notes": "Refund for incorrect charge"
}
```

#### `GET /api/v1/licensing/reports/usage`
Generate usage report for credit customers.

**Query Params:**
- `start_date`: YYYY-MM-DD
- `end_date`: YYYY-MM-DD
- `tenant_id` (optional): Filter by tenant

**Response:**
```json
{
  "data": [
    {
      "tenant_id": 1,
      "tenant_name": "Acme Corp",
      "license_type_id": 1,
      "license_type_name": "iPhone Diagnostic License",
      "product_category": "iPhone",
      "test_type": "Diagnostic",
      "quantity_used": 150,
      "unit_price": "2.50",
      "total_price": "375.00"
    }
  ],
  "status": 200
}
```

#### `GET /api/v1/licensing/reports/usage/export`
Export usage report as CSV (same query params as above).

## Integration with Diagnostics

The licensing system is automatically integrated into the diagnostics upload flow:

1. When a test is uploaded via `POST /api/v1/diagnostics/tests/upload`
2. The system extracts the device identifier (IMEI, Serial, or GUID)
3. It determines the license type based on device type
4. It calls the authorization service
5. If authorized, the test proceeds; otherwise, it's rejected

**Error Response (Insufficient Licenses):**
```json
{
  "data": null,
  "message": "Insufficient licenses. Please purchase more licenses to continue testing.",
  "status": 402
}
```

## Business Logic Flow

### Test Authorization Flow

```
1. Test Request Received
   ↓
2. Extract device_identifier (IMEI/Serial/GUID)
   ↓
3. Determine license_type (by ID or category + test_type)
   ↓
4. Check for active device_license (30-day window)
   ├─ YES → Return "free_retest" ✓
   └─ NO → Continue to step 5
   ↓
5. Check tenant account_type
   ├─ CREDIT → Consume license (can go negative) → Create device_license → Return "license_consumed" ✓
   └─ PREPAID → Continue to step 6
   ↓
6. Check prepaid balance
   ├─ balance > 0 → Consume license → Create device_license → Return "license_consumed" ✓
   └─ balance ≤ 0 → Return "insufficient_licenses" ✗
```

## Setup Instructions

### 1. Run Database Migration

```bash
# Execute the migration SQL file
mysql -u [username] -p [database_name] < backend/src/licensing/migrations/001_create_licensing_tables.sql
```

### 2. Configure Tenant Account Types

Update existing tenants to set their account type:

```sql
-- Set specific tenant to credit
UPDATE tenants SET account_type = 'credit' WHERE id = 1;

-- Set all tenants to prepaid (default)
UPDATE tenants SET account_type = 'prepaid';
```

### 3. Grant Initial Licenses (Optional)

For prepaid customers, grant initial licenses:

```sql
INSERT INTO license_ledger (tenant_id, license_type_id, amount, transaction_type, notes)
VALUES (1, 1, 100, 'purchase', 'Initial license purchase');
```

### 4. Create Custom License Types (Optional)

Add license types for your specific needs:

```sql
INSERT INTO license_types (name, product_category, test_type, price, description)
VALUES ('Custom Device License', 'CustomCategory', 'Diagnostic', 5.00, 'Custom license type');
```

## Common Use Cases

### Use Case 1: Customer Purchases Licenses

```typescript
// Superadmin creates a manual adjustment
POST /api/v1/licensing/adjustments
{
  "tenant_id": 1,
  "license_type_id": 1,
  "amount": 500,
  "notes": "Order #12345 - 500 iPhone Diagnostic Licenses"
}
```

### Use Case 2: Testing a Device

```typescript
// Desktop app uploads test result
POST /api/v1/diagnostics/tests/upload
{
  "device": {
    "imei": "123456789012345",
    "device_type": "iPhone",
    ...
  },
  "test": { ... }
}

// System automatically:
// 1. Checks for 30-day retest window
// 2. Authorizes based on account type and balance
// 3. Consumes license if needed
// 4. Saves test result
```

### Use Case 3: Monthly Billing for Credit Customers

```typescript
// Superadmin generates monthly report
GET /api/v1/licensing/reports/usage?start_date=2025-01-01&end_date=2025-01-31

// Export as CSV for invoicing
GET /api/v1/licensing/reports/usage/export?start_date=2025-01-01&end_date=2025-01-31
```

### Use Case 4: Checking Balance

```typescript
// Customer checks their balance
GET /api/v1/licensing/balances

// Response shows balance for each license type
{
  "data": [
    {
      "license_type_name": "iPhone Diagnostic License",
      "balance": 250,
      "price": "2.50"
    }
  ]
}
```

## Idempotency

The authorization endpoint is designed to be idempotent:
- Multiple calls with the same device within the 30-day window will return "free_retest"
- No duplicate license consumption occurs
- Safe to retry on network errors

## Security Considerations

1. **Authentication Required**: All endpoints require valid JWT authentication
2. **Tenant Isolation**: Users can only access their own tenant's data
3. **Superadmin Restrictions**: License type creation and adjustments require superadmin role
4. **Audit Trail**: All transactions are logged in the license_ledger table

## Monitoring & Analytics

### Key Metrics to Track

1. **License Consumption Rate**: Licenses consumed per day/week/month
2. **Retest Ratio**: Percentage of tests that are free retests
3. **Balance Alerts**: Prepaid customers approaching zero balance
4. **Revenue Tracking**: Total license value consumed by credit customers

### Useful Queries

**Daily license consumption:**
```sql
SELECT 
  DATE(created_at) as date,
  license_type_id,
  ABS(SUM(amount)) as licenses_used
FROM license_ledger
WHERE transaction_type = 'usage'
GROUP BY DATE(created_at), license_type_id;
```

**Retest statistics:**
```sql
SELECT 
  COUNT(*) as total_device_licenses,
  COUNT(DISTINCT device_identifier) as unique_devices,
  AVG(DATEDIFF(retest_valid_until, license_activated_at)) as avg_window_days
FROM device_licenses;
```

**Low balance alerts:**
```sql
SELECT 
  t.id,
  t.name,
  lt.name as license_type,
  SUM(ll.amount) as balance
FROM tenants t
JOIN license_ledger ll ON t.id = ll.tenant_id
JOIN license_types lt ON ll.license_type_id = lt.id
WHERE t.account_type = 'prepaid'
GROUP BY t.id, t.name, lt.id, lt.name
HAVING balance < 10;
```

## Troubleshooting

### Issue: Tests being blocked with "insufficient licenses"

**Solution:**
1. Check tenant account type: `SELECT account_type FROM tenants WHERE id = ?`
2. Check balance: `GET /api/v1/licensing/balances`
3. For prepaid: Add licenses via manual adjustment
4. For credit: Verify license type exists for device category

### Issue: Licenses consumed on every test (no retest window)

**Solution:**
1. Check device_licenses table for active windows
2. Verify device_identifier is consistent (IMEI vs Serial)
3. Check system time is correct (retest_valid_until comparison)

### Issue: Wrong license type being used

**Solution:**
1. Verify license types exist for all device categories
2. Check product_category matches device_type exactly
3. Add missing license types via superadmin endpoint

## Future Enhancements

Potential features to consider:

1. **License Bundles**: Package deals for multiple license types
2. **Auto-renewal**: Automatic license purchases for prepaid customers
3. **Usage Alerts**: Notify customers when approaching limits
4. **Custom Retest Windows**: Configurable window duration per license type
5. **Multi-tier Pricing**: Volume discounts based on usage
6. **License Expiration**: Time-limited licenses that expire if unused
