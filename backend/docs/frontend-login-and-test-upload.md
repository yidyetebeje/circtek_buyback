

## Overview
- **API Base URL:** `/api/v1`
- All responses follow the shared envelope `{ status, message, data, meta?, error? }`.
- Most authenticated routes rely on the JWT issued by the login endpoint. Include it as `Authorization: Bearer <token>` in subsequent requests.

---

## Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Description:** Exchanges user credentials for a JWT and the lightweight user profile needed to initialize the session on the frontend.
- **Authentication:** None (credentials-based).
- **Headers:**
  - `Content-Type: application/json`

### Request Body
```
{
  "identifier": "<USERNAME>",
  "password": "<PASSWORD>"
}
```
- `identifier` maps to the `user_name` field in the database.
- Password is compared against the stored bcrypt hash.

### Success Response (200)
```
{
  "status": 200,
  "message": "OK",
  "data": {
    "token": "<JWT>",
    "user": {
      "id": 42,
      "name": "Ada Lovelace",
      "user_name": "ada",
      "created_at": "2025-10-09T12:34:56.000Z",
      "status": true,
      "role_id": 3,
      "tenant_id": 7,
      "warehouse_id": 12,
      "managed_shop_id": null
    }
  }
}
```


### Error Responses
- **401** `Invalid credentials` – user name not found or password mismatch.
- **403** `User inactive` – the account exists but `status` flag is false.
- Any unexpected server failure returns **500** with `message: "Failed to register"` (logged server-side).



## Diagnostics Test Upload
- **Endpoint:** `POST /api/v1/diagnostics/tests/upload`
- **Description:** Submits a completed diagnostic test, including device metadata, component results, and optional questionnaire answers.
- **Authentication:** Required. Include the JWT obtained from the login flow.
- **Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

### Required Context
The backend enriches the request with:
- `currentUserId` (from the JWT `sub` claim)
- `currentTenantId` and `warehouseId` (from JWT claims or session middleware)
No additional query parameters are required as long as the JWT contains valid tenant/warehouse data.

### Request Body Structure
```
{
  "device": {
    "make": "Apple",
    "model_no": "A2649",
    "model_name": "iPhone 15",
    "device_type": "iphone", // android, airpod
    "serial": "C39Q123XYZ",
    "imei": "356789123456789",
    "imei2": "356789123456770",
    "lpn": "LPN12345",
    "sku": "IPH15-BLK-128",
    "storage": "128GB",
    "memory": "6GB",
    "color": "Black",
    "edited_color": "Midnight",
    "description": "Returned iPhone 15",
    "guid": "f3d0f0d3-62f2-4c95-a026-91f01234abcd"
  },
  "test": {
    "battery_info": { "cycle_count": 210, "health_percentage": 0.86 },
    "passed_components": "screen,camera,battery",
    "failed_components": "face_id",
    "pending_components": "speaker",
    "oem_status": "original",
    "oem_info": null,
    "lpn": "LPN12345",
    "os_version": "iOS 17.4",
    "device_lock": "off",
    "carrier_lock": null,
    "sim_lock": null,
    "ESN": "AA12345",
    "iCloud": { "locked": false },
    "eSIM": true,
    "eSIM_erasure": true,
    "serial_number": "C39Q123XYZ",
    "imei": "356789123456789",
    "rooted": false,
    "erased": true,
    "grade": "A"
  },
  
}
```



### Success Response (201)
Returns the stored diagnostic record plus joined device, warehouse, and tester metadata.
```
{
  "status": 201,
  "message": "Uploaded",
  "data": {
    "id": 5123,
    "created_at": "2025-11-01T15:04:05.000Z",
    "updated_at": "2025-11-01T15:30:00.000Z",
    "tenant_id": 7,
    "warehouse_id": 12,
    "tester_id": 42,
    "device_id": 9981,
    "lpn": "LPN12345",
    "serial_number": "C39Q123XYZ",
    "imei": "356789123456789",
    "passed_components": "screen,camera,battery",
    "failed_components": "face_id",
    "pending_components": "speaker",
    "oem_status": "original",
    "battery_info": { "cycle_count": 210, "health": 0.86 },
    "oem_info": null,
    "label_printed": null,
    "status": true,
    "os_version": "iOS 17.4",
    "device_lock": "none",
    "carrier_lock": { "locked": false },
    "sim_lock": null,
    "ESN": "AA12345",
    "iCloud": { "locked": false },
    "eSIM": true,
    "eSIM_erasure": true,
    "make": "apple",
    "model_no": "A2649",
    "model_name": "iPhone 15",
    "device_type": "smartphone",
    "device_serial": "C39Q123XYZ",
    "device_imei": "356789123456789",
    "device_lpn": "LPN12345",
    "device_sku": "IPH15-BLK-128",
    "device_imei2": "356789123456770",
    "device_guid": "f3d0f0d3-62f2-4c95-a026-91f01234abcd",
    "device_description": "Returned iPhone 15",
    "device_storage": "128GB",
    "device_memory": "6GB",
    "device_color": "Midnight",
    "device_created_at": "2025-11-01T15:04:05.000Z",
    "device_status": true,
    "warehouse_name": "Main Warehouse",
    "tester_username": "ada",
    
    "rooted": false,
    "erased": true,
    "grade": "A"
  }
}
```

### Error Responses
- **400** when no device identifier is supplied.
- **403** if the user is authenticated but lacks permissions (e.g., inactive status or role mismatch) – enforced by upstream middleware.
- **500** on unexpected failures; the message returned is `Failed to upload` and the server logs the underlying error for diagnostics.



