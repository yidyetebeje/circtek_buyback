# License Management Frontend

## Overview

The License Management frontend provides a comprehensive interface for managing testing licenses, viewing balances, tracking usage, and generating reports. Built with Angular 20+ using signals, standalone components, and modern control flow.

## Features

### 1. **License Balances** (`/licensing/balances`)
- View current license inventory
- See balance for each license type
- Color-coded status indicators:
  - 🔴 Red: Zero or negative balance
  - 🟡 Yellow: Low balance (< 10)
  - 🟢 Green: Healthy balance
- Summary cards showing:
  - Total licenses available
  - Total inventory value
  - Number of license types

### 2. **Transaction History** (`/licensing/history`)
- Complete audit trail of all license transactions
- Filter by:
  - License type
  - Transaction type (purchase, usage, refund, adjustment)
- View details:
  - Date and time
  - Transaction type (color-coded badges)
  - Amount (positive/negative)
  - Device identifier (for usage)
  - Notes
- **Superadmin Only**: Manual adjustment capability

### 3. **License Types** (`/licensing/types`)
- View all available license types
- See pricing and descriptions
- **Superadmin Only**: Create new license types
  - Define product category (iPhone, MacBook, AirPods, Android)
  - Set test type (Diagnostic, Erasure)
  - Configure pricing
  - Add descriptions

### 4. **Usage Reports** (`/licensing/reports`) - Superadmin Only
- Generate usage reports for billing
- Filter by date range
- View metrics:
  - Total tests performed
  - Total revenue
- Breakdown by:
  - Tenant
  - License type
  - Product category
  - Test type
- Export to CSV for invoicing

## Components

### Main Components

#### `LicensingComponent`
Main container with tab navigation.

**Features:**
- Tab-based navigation
- Role-based tab visibility
- Responsive design

#### `LicenseBalancesComponent`
Displays current license inventory.

**Key Features:**
- Real-time balance display
- Summary statistics
- Color-coded status indicators
- Search and filter capabilities

#### `LicenseLedgerComponent`
Transaction history and manual adjustments.

**Key Features:**
- Complete transaction history
- Filter by license type and transaction type
- Manual adjustment modal (superadmin)
- Tenant and license type selection
- Amount validation (positive/negative)

#### `LicenseTypesComponent`
License type management.

**Key Features:**
- List all license types
- Create new types (superadmin)
- Product category dropdown
- Test type selection
- Price configuration

#### `UsageReportsComponent`
Usage reports and CSV export.

**Key Features:**
- Date range filtering
- Revenue calculations
- CSV export functionality
- Tenant-specific reports

## Service

### `LicensingService`

**Methods:**
```typescript
// Get current tenant's balances
getBalances(): Observable<ApiResponse<LicenseBalance[]>>

// Get transaction history
getLedgerHistory(licenseTypeId?: number): Observable<ApiResponse<LicenseLedgerEntry[]>>

// List all license types
listLicenseTypes(): Observable<ApiResponse<LicenseType[]>>

// Create new license type (superadmin)
createLicenseType(input: CreateLicenseTypeInput): Observable<ApiResponse<LicenseType>>

// Manual adjustment (superadmin)
createAdjustment(input: ManualAdjustmentInput): Observable<ApiResponse<LicenseLedgerEntry>>

// Get usage report (superadmin)
getUsageReport(startDate: string, endDate: string, tenantId?: number): Observable<ApiResponse<UsageReportEntry[]>>

// Export usage report as CSV (superadmin)
exportUsageReport(startDate: string, endDate: string, tenantId?: number): Observable<Blob>
```

## Routing

Add to your main app routes:

```typescript
{
  path: 'licensing',
  loadChildren: () => import('./pages/licensing/licensing.routes').then(m => m.licensingRoutes),
  canActivate: [authGuard], // Add your auth guard
}
```

## Permissions

### Regular Users
- ✅ View license balances
- ✅ View transaction history
- ✅ View license types
- ❌ Create license types
- ❌ Manual adjustments
- ❌ Usage reports

### Superadmins
- ✅ All regular user permissions
- ✅ Create license types
- ✅ Manual adjustments (add/remove licenses)
- ✅ View usage reports
- ✅ Export reports to CSV

## UI Components Used

### Generic Components
- **GenericPageComponent**: Table display with search, filters, and pagination
- **GenericModalComponent**: Modal dialogs for forms
- **ReactiveFormsModule**: Form handling and validation

### Styling
- **DaisyUI**: Component styling
- **TailwindCSS**: Utility classes
- **Lucide Icons**: Modern icon set

## Data Flow

### License Balance Check
```
Component → LicensingService → API → Backend
                ↓
         Update Signal
                ↓
         Template Re-renders
```

### Manual Adjustment
```
User fills form → Validation → Submit
                                  ↓
                    LicensingService.createAdjustment()
                                  ↓
                            API Request
                                  ↓
                          Success/Error
                                  ↓
                    Reload ledger data
```

### CSV Export
```
User clicks Export → Date validation → API call
                                          ↓
                                    Blob response
                                          ↓
                              Create download link
                                          ↓
                                Trigger download
```

## Error Handling

All components implement comprehensive error handling:

1. **Network Errors**: Display user-friendly messages
2. **Validation Errors**: Show field-specific errors
3. **Permission Errors**: Alert when unauthorized
4. **Loading States**: Show spinners during operations

## Best Practices Followed

### Angular 20+ Features
- ✅ Signals for reactive state
- ✅ Standalone components
- ✅ Modern control flow (`@if`, `@for`)
- ✅ `input()` and `output()` functions
- ✅ `computed()` for derived state
- ✅ `ChangeDetectionStrategy.OnPush`

### Code Quality
- ✅ TypeScript strict mode
- ✅ Type-safe API responses
- ✅ Reactive forms with validation
- ✅ Proper error handling
- ✅ Loading states
- ✅ Responsive design

### UX/UI
- ✅ Consistent button styling
- ✅ Color-coded status indicators
- ✅ Helpful tooltips and labels
- ✅ Clear error messages
- ✅ Loading spinners
- ✅ Responsive tables

## Testing

### Manual Testing Checklist

**License Balances:**
- [ ] Balances load correctly
- [ ] Summary cards show accurate totals
- [ ] Color coding works (red/yellow/green)
- [ ] Search filters balances

**Transaction History:**
- [ ] All transactions display
- [ ] Filters work correctly
- [ ] Manual adjustment modal opens (superadmin)
- [ ] Adjustment creates new entry

**License Types:**
- [ ] All types display
- [ ] Create modal opens (superadmin)
- [ ] Form validation works
- [ ] New type appears in list

**Usage Reports:**
- [ ] Only visible to superadmins
- [ ] Date filters work
- [ ] Totals calculate correctly
- [ ] CSV export downloads

## Troubleshooting

### Issue: Balances not loading
**Solution:**
1. Check API endpoint is accessible
2. Verify authentication token
3. Check browser console for errors

### Issue: Manual adjustment fails
**Solution:**
1. Verify superadmin role
2. Check all required fields
3. Ensure tenant and license type exist

### Issue: CSV export not working
**Solution:**
1. Check date range is valid
2. Verify blob response type
3. Check browser download settings

## Future Enhancements

Potential improvements:

1. **Real-time Updates**: WebSocket for live balance updates
2. **Charts & Graphs**: Visual analytics for usage trends
3. **Bulk Operations**: Import/export license adjustments
4. **Notifications**: Alert when balance is low
5. **License Packages**: Bundle multiple license types
6. **Forecasting**: Predict future license needs
7. **Multi-currency**: Support for different currencies

## Integration with Diagnostics

The licensing system is automatically integrated with the diagnostics upload flow. When a test is uploaded:

1. System checks for 30-day retest window
2. If no retest window, checks license availability
3. For prepaid: Blocks if balance ≤ 0
4. For credit: Allows and tracks usage
5. Creates retest window on success

Users don't need to manually authorize tests - it happens automatically!

## Support

For issues or questions:
1. Check the backend API documentation
2. Review the console for error messages
3. Verify user permissions
4. Check network requests in DevTools
