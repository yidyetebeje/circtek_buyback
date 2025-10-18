# Troubleshooting: Model Prices Not Submitting

## Issue
Form submission is not sending model-specific pricing information to the backend.

## Debugging Added

I've added extensive console logging to track the entire flow. Check your browser console for these logs:

### 1. Form Submission Start
```
Submitting form with model prices count: X
```
- Shows how many model price controls exist
- If this is 0, no model prices were added

### 2. Repair Reason Saved
```
Repair reason saved with ID: X
Will save model prices, count: Y
```
- Confirms the main repair reason was created/updated
- Shows the ID that will be used for model prices

### 3. Model Prices Processing
```
=== saveModelPrices called ===
Repair Reason ID: X
Total model prices controls: Y

Control 0:
  id: null
  isNew: true
  isDeleted: false
  modelName: "iPhone 14 Pro"
  fixedPrice: 150
  disabled: false

→ Creating new model price: {model_name: "iPhone 14 Pro", fixed_price: 150, status: true}

Total API requests to execute: Z
Executing model price API calls...
```

### 4. Completion
```
Model price operations completed: [results array]
Form submitted successfully
```

## Common Issues & Solutions

### Issue 1: No Model Prices Added
**Symptom:** `Submitting form with model prices count: 0`

**Solution:**
- Click the "+ Add Model Price" button
- Fill in model name and price
- Make sure the row isn't marked as deleted

### Issue 2: Validation Blocking Submission
**Symptom:** `Form validation failed:` in console

**Check:**
1. Model name field must not be empty
2. Fixed price must be >= 0
3. Look for red error messages in the form

**Solution:**
- Fill in all required fields
- Fix any validation errors shown

### Issue 3: Controls Being Skipped
**Symptom:** `→ Skipped (no action needed)` for all controls

**Possible Causes:**
- `_isNew` flag is false but no ID exists
- Control is disabled
- `isDeleted` is true

**Debug in console:**
```javascript
// Check FormArray state
const form = document.querySelector('app-repair-reasons-form');
// Look at the console logs for each control
```

### Issue 4: API Calls Failing Silently
**Symptom:** `Executing model price API calls...` but no completion message

**Check Network Tab:**
1. Open browser DevTools → Network tab
2. Filter by "repair-reasons"
3. Look for POST/PUT/DELETE requests to `/model-prices`
4. Check response status and error messages

**Common API Errors:**
- 404: Repair reason ID not found
- 400: Validation error (check request payload)
- 409: Duplicate model price exists
- 500: Server error

### Issue 5: FormArray Not Initialized
**Symptom:** No console logs at all

**Solution:**
- Check if FormArray is properly initialized in constructor
- Verify the template has `formArrayName="model_prices"`

## Step-by-Step Testing

### Test 1: Create New Repair Reason with Model Price

1. Navigate to "Create Repair Reason"
2. Open browser DevTools (F12) → Console tab
3. Fill in:
   - Name: "Test Repair"
   - Description: "Test"
   - Default Price: 100
4. Click "+ Add Model Price"
5. Fill in:
   - Model Name: "iPhone 14 Pro"
   - Fixed Price: 150
6. Click "Create Repair Reason"
7. **Check Console Logs:**
   ```
   Submitting form with model prices count: 1
   Repair reason saved with ID: 123
   Will save model prices, count: 1
   === saveModelPrices called ===
   Control 0: {id: null, isNew: true, isDeleted: false, ...}
   → Creating new model price: {...}
   Total API requests to execute: 1
   Executing model price API calls...
   Model price operations completed: [...]
   Form submitted successfully
   ```

8. **Check Network Tab:**
   - POST `/api/stock/repair-reasons` → Status 201
   - POST `/api/stock/repair-reasons/123/model-prices` → Status 201

### Test 2: Edit Repair Reason and Add Model Price

1. Navigate to edit existing repair reason
2. Open browser DevTools → Console
3. Click "+ Add Model Price"
4. Fill in model name and price
5. Click "Update Repair Reason"
6. **Check Console Logs** (same as above)

### Test 3: Delete Model Price

1. Edit repair reason with existing model prices
2. Click trash icon on a model price row
3. Click "Update Repair Reason"
4. **Check Console Logs:**
   ```
   Control 0: {id: 456, isNew: false, isDeleted: true, ...}
   → Deleting model price ID: 456
   ```
5. **Check Network Tab:**
   - DELETE `/api/stock/repair-reasons/model-prices/456` → Status 200

## Manual Console Debugging

If issues persist, run these in browser console:

```javascript
// Get the component instance (Angular DevTools needed)
// Or check the form state directly

// Check FormArray length
console.log('FormArray length:', document.querySelector('app-repair-reasons-form'));

// Check if model prices section is visible
console.log('Model prices visible:', 
  document.querySelectorAll('.bg-base-200').length);

// Check input values
document.querySelectorAll('input[formControlName="model_name"]')
  .forEach((input, i) => {
    console.log(`Model ${i}:`, input.value);
  });
```

## Backend Verification

Check if backend is receiving the requests:

```bash
# Check backend logs
tail -f backend/logs/app.log

# Look for these entries:
POST /api/stock/repair-reasons/123/model-prices
Request body: {"model_name":"iPhone 14 Pro","fixed_price":150,"status":true}
```

## Quick Fix Checklist

- [ ] Browser console is open and showing logs
- [ ] No JavaScript errors in console
- [ ] Model price row is visible in the form
- [ ] Model name field has a value
- [ ] Fixed price field has a value (>= 0)
- [ ] Row is not disabled (not grayed out)
- [ ] Submit button is clicked (not just Enter key)
- [ ] Network tab shows the API calls
- [ ] Backend is running and accessible

## Expected Console Output (Success)

```
Submitting form with model prices count: 1
Repair reason saved with ID: 123
Will save model prices, count: 1
=== saveModelPrices called ===
Repair Reason ID: 123
Total model prices controls: 1
Control 0: {
  id: null,
  isNew: true,
  isDeleted: false,
  modelName: "iPhone 14 Pro",
  fixedPrice: 150,
  disabled: false
}
→ Creating new model price: {
  model_name: "iPhone 14 Pro",
  fixed_price: 150,
  status: true
}
Total API requests to execute: 1
Executing model price API calls...
Model price operations completed: [{data: {...}, status: 201, ...}]
Form submitted successfully
```

## If Still Not Working

1. **Check API Service:**
   - Verify `createModelPrice()` method exists in `api.service.ts`
   - Check the endpoint URL is correct
   - Verify HTTP method is POST

2. **Check Backend:**
   - Database migration applied?
   - Backend routes registered?
   - Controller methods implemented?
   - Check backend logs for errors

3. **Check Form State:**
   - Add breakpoint in `saveModelPrices()` method
   - Inspect `this.modelPrices.controls` array
   - Check each control's `_isNew` and `_isDeleted` flags

4. **Network Issues:**
   - Check CORS settings
   - Verify authentication token
   - Check API base URL

## Contact Points for Debugging

Share these details if issue persists:

1. **Console Output:** Copy all console logs
2. **Network Requests:** Screenshot of Network tab
3. **Form State:** What fields were filled in
4. **Backend Logs:** Any errors from backend
5. **Browser/OS:** What browser and version
