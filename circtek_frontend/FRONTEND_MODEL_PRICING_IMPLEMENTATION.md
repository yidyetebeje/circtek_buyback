# Frontend Implementation - Model-Specific Repair Pricing

## Overview
Successfully updated the repair reasons form to support creating and managing model-specific prices for repair reasons. Both create and edit modes fully support the new functionality.

## Files Modified

### 1. **Models** (`src/app/core/models/repair-reason.ts`)

**Added Interfaces:**
```typescript
// Model price record from backend
export interface RepairReasonModelPriceRecord {
  id: number;
  repair_reason_id: number;
  model_name: string;
  fixed_price: number;
  status: boolean;
  tenant_id: number;
  created_at: Date | null;
  updated_at: Date | null;
}

// Create payload
export interface RepairReasonModelPriceCreateInput {
  model_name: string;
  fixed_price: number;
  status?: boolean;
}

// Update payload
export interface RepairReasonModelPriceUpdateInput {
  model_name?: string;
  fixed_price?: number;
  status?: boolean;
}

// Extended repair reason with model prices
export interface RepairReasonWithModelPrices extends RepairReasonRecord {
  model_prices: RepairReasonModelPriceRecord[];
}

// Generic API response
export interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
}
```

### 2. **API Service** (`src/app/core/services/api.service.ts`)

**New Methods:**
```typescript
// Get repair reason with all model prices
getRepairReasonWithModelPrices(id: number): Observable<ApiResponse<RepairReasonWithModelPrices | null>>

// Get all model prices for a repair reason
getModelPrices(repairReasonId: number): Observable<ApiResponse<RepairReasonModelPriceRecord[]>>

// Create model-specific price
createModelPrice(repairReasonId: number, data: RepairReasonModelPriceCreateInput): Observable<ApiResponse<RepairReasonModelPriceRecord | null>>

// Update model-specific price
updateModelPrice(priceId: number, data: RepairReasonModelPriceUpdateInput): Observable<ApiResponse<RepairReasonModelPriceRecord | null>>

// Delete model-specific price
deleteModelPrice(priceId: number): Observable<ApiResponse<null>>
```

### 3. **Form Component** (`src/app/pages/repair-reasons-form/repair-reasons-form.component.ts`)

**Key Changes:**

#### Added Imports
- `FormArray` for managing dynamic model price rows
- `LucideAngularModule`, `Plus`, `Trash2` icons
- `forkJoin`, `of`, `switchMap` from RxJS for handling multiple async operations

#### Form Structure
```typescript
form = this.fb.group({
  name: ['', validators],
  description: ['', validators],
  fixed_price: [null, validators],
  status: [true, validators],
  model_prices: this.fb.array([])  // NEW: FormArray for model prices
});
```

#### Model Price FormGroup Structure
```typescript
{
  id: number | null,              // Existing price ID (null for new)
  model_name: string,             // Device model name
  fixed_price: number,            // Price for this model
  status: boolean,                // Active/inactive
  _isNew: boolean,                // Track if new or existing
  _isDeleted: boolean             // Track if marked for deletion
}
```

#### New Methods

**Add Model Price:**
```typescript
addModelPrice(): void {
  this.modelPrices.push(this.createModelPriceFormGroup());
}
```

**Remove Model Price:**
```typescript
removeModelPrice(index: number): void {
  const control = this.modelPrices.at(index);
  const id = control.get('id')?.value;
  
  if (id) {
    // Mark existing for deletion
    control.get('_isDeleted')?.setValue(true);
    control.disable();
  } else {
    // Remove new immediately
    this.modelPrices.removeAt(index);
  }
}
```

**Load with Model Prices:**
```typescript
private loadRepairReason(): void {
  this.api.getRepairReasonWithModelPrices(id).subscribe({
    next: (response) => {
      // Patch main form
      this.form.patchValue({...});
      
      // Load model prices into FormArray
      this.modelPrices.clear();
      response.data.model_prices.forEach(price => {
        this.modelPrices.push(this.createModelPriceFormGroup(price));
      });
    }
  });
}
```

**Save Model Prices:**
```typescript
private saveModelPrices(repairReasonId: number): Observable<any> {
  const requests: Observable<any>[] = [];

  this.modelPrices.controls.forEach((control) => {
    const isDeleted = control.get('_isDeleted')?.value;
    const isNew = control.get('_isNew')?.value;
    const id = control.get('id')?.value;

    if (isDeleted && id) {
      // DELETE existing
      requests.push(this.api.deleteModelPrice(id));
    } else if (isNew && !isDeleted) {
      // CREATE new
      requests.push(this.api.createModelPrice(repairReasonId, data));
    } else if (!isNew && !isDeleted && id) {
      // UPDATE existing
      requests.push(this.api.updateModelPrice(id, data));
    }
  });

  return requests.length > 0 ? forkJoin(requests) : of(null);
}
```

**Submit Flow:**
```typescript
onSubmit(): void {
  // 1. Save repair reason (create or update)
  // 2. Get repair reason ID
  // 3. Save all model prices (create/update/delete)
  // 4. Navigate back on success
  
  request.pipe(
    switchMap((response) => {
      const repairReasonId = response.data.id;
      return this.saveModelPrices(repairReasonId).pipe(
        switchMap(() => of(response))
      );
    })
  ).subscribe({...});
}
```

## UI Design

### Layout
```
┌─────────────────────────────────────────────┐
│ Create/Edit Repair Reason                   │
├─────────────────────────────────────────────┤
│ [Standard Form Fields]                      │
│ - Name                                      │
│ - Description                               │
│ - Default Fixed Price                       │
│ - Status                                    │
├─────────────────────────────────────────────┤
│ Model-Specific Pricing                      │
│ [+ Add Model Price] button                  │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ Model Name: [iPhone 14 Pro    ]  [×]   ││
│ │ Fixed Price: [150.00          ]        ││
│ └─────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────┐│
│ │ Model Name: [iPhone 15 Pro Max]  [×]   ││
│ │ Fixed Price: [200.00          ]        ││
│ └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│ [Cancel]  [Create/Update Repair Reason]     │
└─────────────────────────────────────────────┘
```

### Key UI Features

1. **Dynamic Rows**: Add/remove model price rows dynamically
2. **Soft Delete**: Existing prices are marked for deletion, not removed from UI
3. **Validation**: 
   - Model name: Required, 1-255 characters
   - Fixed price: Required, >= 0
4. **Visual Feedback**: Error states, disabled states, loading states
5. **Icons**: Lucide icons for consistency (Plus, Trash2)
6. **Responsive**: Grid layout adapts to screen size

### Empty State
When no model prices exist:
```html
<div class="alert alert-info">
  <svg>...</svg>
  <span>No model-specific prices added. The default fixed price will apply to all models.</span>
</div>
```

## User Workflows

### Create New Repair Reason with Model Prices

1. Navigate to "Create Repair Reason"
2. Fill in basic fields (name, description, default price, status)
3. Click "+ Add Model Price"
4. Enter model name (e.g., "iPhone 14 Pro")
5. Enter fixed price (e.g., 150.00)
6. Repeat for additional models
7. Click "Create Repair Reason"
8. **Result**: Repair reason created, then all model prices created in parallel

### Edit Existing Repair Reason

1. Navigate to edit page
2. Existing model prices load automatically
3. **Add new price**: Click "+ Add Model Price"
4. **Edit existing**: Modify model name or price directly
5. **Remove price**: Click trash icon (marks for deletion)
6. Click "Update Repair Reason"
7. **Result**: 
   - Repair reason updated
   - New prices created
   - Modified prices updated
   - Deleted prices removed
   - All operations happen in parallel

### Validation & Error Handling

**Field Validation:**
- Model name cannot be empty
- Fixed price must be 0 or greater
- Touched fields show error messages immediately

**API Error Handling:**
- Failed operations show error message
- Toast notifications for success/failure
- Form stays editable on error

## Technical Implementation Details

### Change Detection
- Uses `ChangeDetectionStrategy.OnPush` for performance
- Signals for reactive state management

### FormArray Management
- **Tracks state**: New vs existing, deleted vs active
- **Index handling**: Maintains correct indices even with deletions
- **Validation**: Each row has independent validation

### Async Operations
- **Sequential**: Repair reason → Model prices
- **Parallel**: All model price operations (create/update/delete) via `forkJoin`
- **Error handling**: Rollback not implemented (backend handles consistency)

### Data Flow
```
Load (Edit Mode):
  API.getRepairReasonWithModelPrices()
    → Patch main form
    → Populate FormArray with existing prices

Submit:
  API.createRepairReason() / updateRepairReason()
    → Get repair reason ID
    → saveModelPrices(id)
      → forkJoin([create$, update$, delete$])
    → Navigate on success
```

## Design Patterns Used

1. **Reactive Forms with FormArray**: Dynamic form controls
2. **Soft Delete Pattern**: Mark for deletion rather than immediate removal
3. **Optimistic UI Updates**: Disable controls on delete, don't remove from view
4. **Parallel Operations**: `forkJoin` for efficient API calls
5. **Angular Signals**: Modern reactive state management
6. **Standalone Components**: No NgModules required

## Testing Checklist

- [ ] Create repair reason without model prices
- [ ] Create repair reason with model prices
- [ ] Edit repair reason and add model prices
- [ ] Edit repair reason and modify existing prices
- [ ] Edit repair reason and delete existing prices
- [ ] Validation works for empty model name
- [ ] Validation works for negative prices
- [ ] Multiple model prices save correctly
- [ ] Deleted prices are properly removed
- [ ] Error handling displays toast messages
- [ ] Loading and submitting states work correctly
- [ ] Navigation works after successful save
- [ ] Cancel button works correctly

## Browser Compatibility

- Modern browsers with ES6+ support
- Tested with Angular 20+ features
- Uses Angular control flow (`@if`, `@for`)
- Lucide icons for consistent rendering

## Performance Considerations

- **OnPush Change Detection**: Minimizes unnecessary re-renders
- **Parallel API Calls**: `forkJoin` reduces total wait time
- **Soft Delete**: Avoids UI flicker from removing/re-adding controls
- **Computed Values**: Efficient reactive updates

## Future Enhancements

1. **Model Autocomplete**: Suggest existing device models
2. **Bulk Import**: Upload CSV with model prices
3. **Price History**: Track price changes over time
4. **Duplicate Detection**: Warn if model already has price
5. **Sorting**: Allow reordering of model prices
6. **Search/Filter**: Find specific models in long lists
