# Admin Buy Device Feature

## Overview

This feature allows administrators to purchase devices from users through the admin panel. The admin can search for tested devices, select matching products, answer condition questions, and create purchase orders directly.

## Implementation Flow

### 1. Serial Search (`DeviceSerialSearch.tsx`)

- **Purpose**: Admin enters device serial number to find tested devices
- **API**: Uses `/api/diagnostics/tested-devices` endpoint
- **Features**:
  - Auto-search as admin types
  - Displays device details (make, model, serial, IMEI, test status)
  - Shows test results (passed/failed)
  - Allows selection of tested device

### 2. Device Information Display (`DeviceInfoDisplay.tsx`)

- **Purpose**: Shows detailed information about the selected tested device
- **Features**:
  - Device specifications (storage, color, etc.)
  - Diagnostic test results
  - Overall device status
  - Link to full device report
  - Continue to product selection

### 3. Product Selector (`ProductSelector.tsx`)

- **Purpose**: Admin selects published product that matches the tested device
- **API**: Uses shop service for published products
- **Features**:
  - Search products by name
  - Filter by category and brand
  - Pagination support
  - Product cards with images and base prices
  - Select matching product

### 4. Question Flow (`QuestionFlow.tsx`)

- **Purpose**: Reuses existing question logic for condition assessment
- **Features**:
  - Uses same question stepper component as customer flow
  - Supports all question types (multiple choice, slider, text)
  - Auto-advances through questions
  - Calculates price based on condition modifiers
  - Option to skip questions and use base price

### 5. Price Confirmation (`PriceConfirmation.tsx`)

- **Purpose**: Shows estimated price and allows admin adjustment
- **Features**:
  - Displays calculated estimated price
  - Shows condition assessment answers
  - Allows admin to edit final price
  - Warns for significant price changes (>20%)
  - Confirms final purchase price

### 6. Order Creation (`OrderCreation.tsx`)

- **Purpose**: Creates purchase order with customer details
- **API**: Uses `/api/orders` endpoint
- **Features**:
  - Customer information form
  - Address details
  - Order notes
  - Creates order with "PAID" status
  - Links to tested device transaction

## File Structure

```
buyback/
├── app/[locale]/admin/buy-device/
│   └── page.tsx                          # Main buy device page
├── components/admin/buy-device/
│   ├── BuyDevicePageClient.tsx           # Main orchestrator component
│   ├── DeviceSerialSearch.tsx            # Step 1: Search tested devices
│   ├── DeviceInfoDisplay.tsx             # Step 2: Show device details
│   ├── ProductSelector.tsx               # Step 3: Select product
│   ├── QuestionFlow.tsx                  # Step 4: Answer questions
│   ├── PriceConfirmation.tsx             # Step 5: Confirm price
│   └── OrderCreation.tsx                 # Step 6: Create order
└── components/admin/admin-sidebar.tsx     # Added buy device navigation
```

## Key Features

### ✅ Implemented

1. **Device Search**: Search tested devices by serial number
2. **Device Information**: Display detailed device and test information
3. **Product Selection**: Browse and filter published products
4. **Question Flow**: Reuse existing condition assessment logic
5. **Price Calculation**: Automatic price calculation with manual override
6. **Order Creation**: Create paid orders with customer details
7. **Admin Navigation**: Added to admin sidebar
8. **Progress Tracking**: Step-by-step progress indicator

### 🔄 Integration Points

- **Diagnostics Service**: For tested device lookup
- **Shop Service**: For published product retrieval
- **Question Components**: Reuses existing question stepper
- **Order Service**: For order creation
- **Admin Sidebar**: Added new navigation item

### 📋 Order Data Structure

Orders created through this flow include:

- Device snapshot with product details
- Testing information (serial, IMEI, test results)
- Condition answers from question flow
- Customer contact and address information
- Admin notes with device serial/IMEI
- Automatic "PAID" status

## Usage

1. **Access**: Navigate to Admin → Buy Device
2. **Search**: Enter device serial number to find tested devices
3. **Review**: Check device information and test results
4. **Select**: Choose matching published product
5. **Assess**: Answer condition questions or use base price
6. **Confirm**: Review and adjust final price if needed
7. **Create**: Enter customer details and create order

## API Dependencies

- `/api/diagnostics/tested-devices` - Device search
- `/api/catalog/shops/{shopId}/published-*` - Product retrieval
- `/api/orders` - Order creation

## Future Enhancements

1. **Bulk Operations**: Support multiple device purchases
2. **Import/Export**: Batch import from testing system
3. **Price History**: Track pricing decisions
4. **Approval Workflow**: Multi-step approval process
5. **Reporting**: Analytics on admin purchases
