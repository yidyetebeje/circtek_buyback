# Stock Management System

A comprehensive stock management system with multiple submodules handling different aspects of inventory management.

## Core Architecture

The system is built around two key tables:

- **stock**: Real-time snapshot of current quantities per SKU per warehouse
- **stock_movements**: Immutable ledger of all inventory changes

## Core Principle

Every inventory change follows this flow:
**Event Occurs → Create stock_movements Record → Update stock Table Quantity**

## Submodules

### 1. Stock (`/stock/stock`)

- View current stock levels by warehouse and SKU
- List stock with filtering and pagination
- Stock level alerts and low stock reporting
- Summary statistics

**Key Endpoints:**

- `GET /stock/stock` - List all stock records
- `GET /stock/stock/summary` - Get stock summary
- `GET /stock/stock/low-stock` - Get low stock items
- `GET /stock/stock/sku/:sku/warehouse/:warehouseId` - Get stock for specific SKU/warehouse

### 2. Movements (`/stock/movements`)

- View complete audit trail of stock changes
- Filter movements by date, reason, warehouse, SKU
- Generate stock movement reports
- Audit trail for specific SKUs

**Key Endpoints:**

- `GET /stock/movements` - List all movements
- `GET /stock/movements/summary` - Get movement analytics
- `GET /stock/movements/audit/:sku/warehouse/:warehouseId` - Get audit trail
- `POST /stock/movements` - Create manual movement

### 3. Purchases (`/stock/purchases`)

- Create purchase orders
- Record received items
- Trigger stock updates when items are received
- Handle partial deliveries

**Key Endpoints:**

- `GET /stock/purchases` - List purchase orders
- `POST /stock/purchases/with-items` - Create purchase with items
- `POST /stock/purchases/:id/receive` - Receive items (key operation)
- `GET /stock/purchases/:id/status` - Get receiving status

### 4. Transfers (`/stock/transfers`)

- Initiate transfers between warehouses
- Confirm transfer completion
- Create dual movements (out from source, in to destination)
- Track transfer status

**Key Endpoints:**

- `GET /stock/transfers` - List transfers
- `POST /stock/transfers/with-items` - Create transfer with items
- `POST /stock/transfers/:id/complete` - Complete transfer (key operation)
- `GET /stock/transfers/pending` - Get pending transfers

### 5. Adjustments (`/stock/adjustments`)

- Handle dead IMEI write-offs
- Manual stock corrections
- Inventory loss recording
- Create corresponding device events

**Key Endpoints:**

- `GET /stock/adjustments` - Get adjustment history
- `POST /stock/adjustments` - Create manual adjustment
- `POST /stock/adjustments/dead-imei` - Write off dead IMEI
- `POST /stock/adjustments/bulk` - Bulk adjustments

### 6. Consumption (`/stock/consumption`)

- Record parts used in repairs
- Link to repair records
- Automatic stock deduction
- Track repair part usage

**Key Endpoints:**

- `GET /stock/consumption` - Get consumption history
- `GET /stock/consumption/repair/:repairId` - Get consumption for specific repair
- `POST /stock/consumption` - Record part consumption
- `POST /stock/consumption/bulk` - Bulk consumption for repair

## Key Scenarios Implemented

### Scenario 1: Receiving New Stock (Purchase)

1. Create purchase order with items
2. When items arrive, use `/stock/purchases/:id/receive`
3. System creates movement with reason 'purchase' and updates stock

### Scenario 2: Transferring Stock Between Warehouses

1. Create transfer with `/stock/transfers/with-items`
2. Complete transfer with `/stock/transfers/:id/complete`
3. System creates dual movements (transfer_out + transfer_in) and updates both warehouses

### Scenario 3: Consuming Stock for Repair

1. Use `/stock/consumption` to record part usage
2. System creates movement with reason 'repair' and decrements stock

### Scenario 4: Handling Dead IMEI / Write-Off

1. Use `/stock/adjustments/dead-imei` for device write-offs
2. System creates movement with reason 'dead_imei' and device event

## Global Endpoints

- `GET /stock/dashboard` - Comprehensive dashboard with all module summaries
- `GET /stock/health` - System health check

## Database Integration

- Works with existing schema tables: `stock`, `stock_movements`, `purchases`, `transfers`, etc.
- Maintains referential integrity with foreign keys
- All operations are tenant-scoped for multi-tenancy
- Transactional operations ensure data consistency

## Security & Access Control

- All endpoints require authentication via `requireRole([])`
- Tenant isolation enforced at controller level
- Super admin can access cross-tenant data
- Regular users restricted to their tenant data

## Future Enhancements

- Device events integration (placeholder implemented)
- Advanced reporting and analytics
- Automated reorder points and alerts
- Integration with external systems
- Real-time stock level notifications
