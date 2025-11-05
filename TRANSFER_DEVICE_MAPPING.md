# Transfer Device Mapping Integration

## Overview
Updated the transfer system to use the `stock_device_ids` table for tracking device-to-stock relationships during warehouse transfers.

## Changes Made

### 1. Schema
The `stock_device_ids` table (already in schema) maps devices to specific stock records:
```typescript
stock_device_ids {
  id: serial
  stock_id: bigint -> stock.id
  device_id: bigint -> devices.id
  tenant_id: bigint -> tenants.id
  created_at: timestamp
  updated_at: timestamp
}
```

### 2. Repository Updates (`backend/src/stock/transfers/repository.ts`)

#### New Methods:

**`validateDeviceStockMapping(tx, device_id, sku, warehouse_id, tenant_id)`**
- Validates that a device is properly mapped to stock in the source warehouse
- Called during transfer creation to ensure device exists in source warehouse
- Throws error if device is not mapped to the stock record

**`moveDeviceStockMapping(device_id, sku, from_warehouse_id, to_warehouse_id, tenant_id)`**
- Moves device mapping from source warehouse stock to destination warehouse stock
- Executed in a transaction:
  1. Deletes mapping from source warehouse stock
  2. Creates new mapping to destination warehouse stock
  3. Updates `devices.warehouse_id` to reflect new location
- Called during transfer completion

#### Updated Methods:

**`createTransferWithItemsTransaction()`**
- Added device stock mapping validation for non-part items
- Validates device is mapped to source warehouse stock before allowing transfer

### 3. Controller Updates (`backend/src/stock/transfers/controller.ts`)

**`completeTransfer()`**
- Added device stock mapping movement after successful stock movements
- For each non-part item with a device_id:
  - Calls `moveDeviceStockMapping()` to update device location
  - Wrapped in try-catch to prevent transfer failure if mapping fails
  - Logs errors but continues transfer process

### 4. Type Updates (`backend/src/stock/transfers/types.ts`)

**`TransferItemCreate`**
- Made `device_id` optional: `t.Optional(t.Number())`
- Allows transfer creation with just IMEI/SKU

**`TransferItemRecord`**
- Changed `device_id` type to `number | null`
- Supports items without device mapping (parts)

## Transfer Flow

### Creating a Transfer:
1. Frontend sends IMEI or SKU in the `sku` field
2. Backend resolves IMEI to device and gets actual SKU
3. Validates device is mapped to source warehouse stock via `stock_device_ids`
4. Creates transfer record

### Completing a Transfer:
1. Creates stock movements (out/in)
2. For devices (non-parts):
   - Deletes `stock_device_ids` entry from source warehouse
   - Creates `stock_device_ids` entry in destination warehouse
   - Updates `devices.warehouse_id` to destination
3. Creates device events (TRANSFER_OUT, TRANSFER_IN)
4. Marks transfer as completed

## Benefits

1. **Accurate Device Tracking**: Each device is always mapped to exactly one stock record
2. **Warehouse Location**: `devices.warehouse_id` stays in sync with stock location
3. **Stock Integrity**: Prevents transferring devices not present in source warehouse
4. **Audit Trail**: Device events track all transfer movements
5. **Flexible Input**: Frontend can send IMEI directly without pre-fetching device info

## Error Handling

- **Missing Device Mapping**: Transfer creation fails if device not mapped to source stock
- **Invalid Stock**: Transfer creation fails if stock doesn't exist in warehouse
- **Mapping Movement Failure**: Transfer continues but logs error (graceful degradation)

## Database Queries Impact

### Transfer Creation:
- Additional queries to validate `stock_device_ids` mapping
- Runs in transaction to ensure consistency

### Transfer Completion:
- Additional DELETE and INSERT on `stock_device_ids`
- UPDATE on `devices.warehouse_id`
- All within existing transaction for atomicity

## Testing Recommendations

1. Test transfer with device that has stock mapping
2. Test transfer with device missing stock mapping (should fail)
3. Test transfer completion updates device location
4. Test multiple devices in single transfer
5. Test mixed transfer (parts + devices)
6. Verify `stock_device_ids` records are moved correctly
7. Verify `devices.warehouse_id` is updated
