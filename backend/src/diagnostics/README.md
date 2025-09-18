# Diagnostics API Documentation

## Upload Test Result

### Endpoint
```
POST /diagnostics/tests/upload
```

### Description
Uploads test results from a desktop application. This endpoint allows testers to submit diagnostic test results for devices, including device information and test component results.

### Authentication
- Requires authentication (user must be logged in)
- User must have appropriate role permissions

### Request Body

The request body follows the `DiagnosticUploadBody` schema and contains two main sections:

#### Device Information (`device` object)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `make` | string | Yes | Device manufacturer (e.g., "Apple", "Samsung") |
| `model_no` | string | Yes | Device model number |
| `model_name` | string | Yes | Device model name |
| `device_type` | string | Yes | Type of device (e.g., "smartphone", "tablet") |
| `serial` | string | Yes | Device serial number |
| `imei` | string | No | Primary IMEI number |
| `imei2` | string | No | Secondary IMEI number (for dual-SIM devices) |
| `lpn` | string | No | License Plate Number |
| `sku` | string | No | Stock Keeping Unit |
| `storage` | string | No | Device storage capacity |
| `memory` | string | No | Device RAM/memory |
| `color` | string | No | Device color |
| `description` | string | No | Additional device description |
| `guid` | string | No | Device GUID |

#### Test Information (`test` object)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `warehouse_id` | number | Yes | ID of the warehouse where testing occurred |
| `battery_info` | any | No | Battery test results and information |
| `passed_components` | string | No | Comma-separated list of components that passed testing |
| `failed_components` | string | No | Comma-separated list of components that failed testing |
| `pending_components` | string | No | Comma-separated list of components with pending test results |
| `oem_status` | string | No | Original Equipment Manufacturer status |
| `oem_info` | any | No | Additional OEM information |
| `lpn` | string | No | License Plate Number for the test |
| `os_version` | string | No | Operating system version |
| `device_lock` | string | No | Device lock status |
| `carrier_lock` | any | No | Carrier lock information |
| `sim_lock` | any | No | SIM lock information |
| `ESN` | string | No | Electronic Serial Number |
| `iCloud` | any | No | iCloud lock status and information |
| `eSIM` | boolean | No | eSIM support status |
| `eSIM_erasure` | boolean | No | eSIM erasure capability |
| `serial_number` | string | No | Serial number for the test |
| `imei` | string | No | IMEI for the test |

### Request Example
```json
{
  "device": {
    "make": "Apple",
    "model_no": "A2487",
    "model_name": "iPhone 13",
    "device_type": "smartphone",
    "serial": "F2LQ123456789",
    "imei": "123456789012345",
    "imei2": "123456789012346",
    "lpn": "LPN001",
    "sku": "SKU-IPH13-128GB-BLUE",
    "storage": "128GB",
    "memory": "4GB",
    "color": "Blue",
    "description": "iPhone 13 128GB Blue",
    "guid": "guid-12345"
  },
  "test": {
    "warehouse_id": 1,
    "battery_info": {
      "health": "Good",
      "capacity": "95%",
      "cycles": 150
    },
    "passed_components": "display,camera,audio,connectivity",
    "failed_components": "battery",
    "pending_components": "",
    "oem_status": "Original",
    "oem_info": {
      "warranty_status": "Expired",
      "repair_history": "None"
    },
    "lpn": "LPN001",
    "os_version": "iOS 16.1",
    "device_lock": "Unlocked",
    "carrier_lock": {
      "locked": false,
      "carrier": null
    },
    "sim_lock": {
      "locked": false,
      "carrier": null
    },
    "ESN": "ESN123456789",
    "iCloud": {
      "locked": false,
      "account": null
    },
    "eSIM": true,
    "eSIM_erasure": true,
    "serial_number": "F2LQ123456789",
    "imei": "123456789012345"
  }
}
```

### Response

#### Success Response (201 Created)
```json
{
  "data": {
    "id": 123,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "tenant_id": 1,
    "tenant_name": "Company Name",
    "tenant_logo_url": "https://example.com/logo.png",
    "warehouse_id": 1,
    "tester_id": 5,
    "device_id": 456,
    "lpn": "LPN001",
    "serial_number": "F2LQ123456789",
    "imei": "123456789012345",
    "passed_components": "display,camera,audio,connectivity",
    "failed_components": "battery",
    "pending_components": null,
    "oem_status": "Original",
    "battery_info": {
      "health": "Good",
      "capacity": "95%",
      "cycles": 150
    },
    "oem_info": {
      "warranty_status": "Expired",
      "repair_history": "None"
    },
    "label_printed": false,
    "status": true,
    "os_version": "iOS 16.1",
    "device_lock": "Unlocked",
    "carrier_lock": {
      "locked": false,
      "carrier": null
    },
    "sim_lock": {
      "locked": false,
      "carrier": null
    },
    "ESN": "ESN123456789",
    "iCloud": {
      "locked": false,
      "account": null
    },
    "eSIM": true,
    "eSIM_erasure": true,
    "make": "Apple",
    "model_no": "A2487",
    "model_name": "iPhone 13",
    "device_type": "smartphone",
    "device_serial": "F2LQ123456789",
    "device_imei": "123456789012345",
    "device_lpn": "LPN001",
    "device_sku": "SKU-IPH13-128GB-BLUE",
    "device_imei2": "123456789012346",
    "device_guid": "guid-12345",
    "device_description": "iPhone 13 128GB Blue",
    "device_storage": "128GB",
    "device_memory": "4GB",
    "device_color": "Blue",
    "device_created_at": "2024-01-15T10:30:00.000Z",
    "device_status": true,
    "warehouse_name": "Main Warehouse",
    "tester_username": "john.doe"
  },
  "message": "Uploaded",
  "status": 201
}
```

#### Error Responses

**400 Bad Request** - Invalid request body
```json
{
  "data": null,
  "message": "Validation error",
  "status": 400,
  "error": "Invalid request body format"
}
```

**401 Unauthorized** - Authentication required
```json
{
  "data": null,
  "message": "Unauthorized",
  "status": 401,
  "error": "Authentication required"
}
```

**403 Forbidden** - Insufficient permissions
```json
{
  "data": null,
  "message": "Forbidden",
  "status": 403,
  "error": "Insufficient permissions"
}
```

**500 Internal Server Error** - Server error
```json
{
  "data": null,
  "message": "Internal server error",
  "status": 500,
  "error": "An unexpected error occurred"
}
```

### Response Fields

The response data contains a `DiagnosticPublic` object with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique identifier for the test result |
| `created_at` | Date | Timestamp when the test was created |
| `updated_at` | Date | Timestamp when the test was last updated |
| `tenant_id` | number | ID of the tenant organization |
| `tenant_name` | string | Name of the tenant organization |
| `tenant_logo_url` | string | URL to the tenant's logo |
| `warehouse_id` | number | ID of the warehouse |
| `tester_id` | number | ID of the user who performed the test |
| `device_id` | number | ID of the associated device |
| `lpn` | string | License Plate Number |
| `serial_number` | string | Device serial number |
| `imei` | string | Device IMEI |
| `passed_components` | string | Components that passed testing |
| `failed_components` | string | Components that failed testing |
| `pending_components` | string | Components with pending results |
| `oem_status` | string | OEM status |
| `battery_info` | any | Battery test information |
| `oem_info` | any | OEM information |
| `label_printed` | boolean | Whether label was printed |
| `status` | boolean | Overall test status |
| `os_version` | string | Operating system version |
| `device_lock` | string | Device lock status |
| `carrier_lock` | any | Carrier lock information |
| `sim_lock` | any | SIM lock information |
| `ESN` | string | Electronic Serial Number |
| `iCloud` | any | iCloud lock information |
| `eSIM` | boolean | eSIM support |
| `eSIM_erasure` | boolean | eSIM erasure capability |
| `make` | string | Device manufacturer |
| `model_no` | string | Device model number |
| `model_name` | string | Device model name |
| `device_type` | string | Device type |
| `device_serial` | string | Device serial number |
| `device_imei` | string | Device IMEI |
| `device_lpn` | string | Device LPN |
| `device_sku` | string | Device SKU |
| `device_imei2` | string | Device secondary IMEI |
| `device_guid` | string | Device GUID |
| `device_description` | string | Device description |
| `device_storage` | string | Device storage |
| `device_memory` | string | Device memory |
| `device_color` | string | Device color |
| `device_created_at` | Date | Device creation timestamp |
| `device_status` | boolean | Device status |
| `warehouse_name` | string | Warehouse name |
| `tester_username` | string | Tester username |

### Side Effects

When a test result is successfully uploaded:

1. **Device Event Creation**: A `TEST_COMPLETED` device event is automatically created in the system, tracking the test completion with relevant device details.

2. **Device Association**: If a device is associated with the test, the system links the test result to the device record.

### Notes

- The endpoint automatically extracts the current user ID and tenant ID from the authentication context
- All timestamps are returned in ISO 8601 format
- The `battery_info`, `oem_info`, `carrier_lock`, `sim_lock`, and `iCloud` fields can contain complex objects and are stored as JSON
- The system validates that the warehouse exists and the user has access to it
- Failed device event creation (if it occurs) is logged but doesn't affect the test upload success
