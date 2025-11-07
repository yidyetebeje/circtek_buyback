# SKU Mappings Backend Implementation

## Overview

The SKU Mappings backend provides a RESTful API for managing dynamic mapping rules that assign SKU codes based on device properties. This implementation follows the existing patterns in the codebase and integrates with the existing grades system.

## Architecture

### Files Structure
```
backend/src/stock/sku-mappings/
├── controller.ts      # Business logic and API handlers
├── repository.ts      # Database operations
├── types.ts          # TypeScript type definitions
├── utils.ts          # Validation and utility functions
├── index.ts          # Route definitions
├── migration.sql     # Database migration script
└── README.md         # This documentation
```

### Database Schema

The implementation adds a new table `sku_mappings` to the existing database:

```sql
CREATE TABLE sku_mappings (
    id VARCHAR(36) PRIMARY KEY,              -- UUID
    sku VARCHAR(255) NOT NULL,               -- Resulting SKU code
    conditions JSON NOT NULL,                -- Dynamic conditions as JSON
    canonical_key VARCHAR(512) NOT NULL,     -- Normalized key for uniqueness
    tenant_id BIGINT UNSIGNED NOT NULL,      -- Tenant scoping
    created_at TIMESTAMP DEFAULT NOW(),      -- Creation timestamp
    updated_at TIMESTAMP DEFAULT NOW()       -- Update timestamp
);
```

**Key Features:**
- **Tenant Scoping**: All operations are tenant-aware
- **Canonical Key**: Prevents duplicate rules regardless of condition order
- **JSON Storage**: Flexible condition storage for future extensibility
- **UUID Primary Key**: Globally unique identifiers

### API Endpoints

All endpoints are prefixed with `/stock/sku-mappings`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List SKU mappings with pagination and search |
| GET | `/:id` | Get single SKU mapping by ID |
| POST | `/` | Create new SKU mapping |
| PUT | `/:id` | Update existing SKU mapping |
| DELETE | `/:id` | Delete SKU mapping |
| POST | `/resolve` | Resolve SKU from conditions (utility endpoint) |

### Key Features

#### 1. Canonical Key Generation
The system generates a canonical key for each mapping to prevent duplicates:
- Normalizes property keys (lowercase, trim whitespace)
- Sorts conditions alphabetically by key
- Joins as "key=value" pairs with "|" delimiter
- Example: `grade=agra|make=apple|storage=128gb`

#### 2. Validation System
Comprehensive validation includes:
- **SKU validation**: Required, non-empty, max 255 characters
- **Property keys**: Must be from allowed list (make, model_name, storage, color, grade)
- **Property values**: Validated against static lists or dynamic grade API
- **Duplicate prevention**: No duplicate properties in single mapping
- **Unique rules**: No duplicate mappings across the system

#### 3. Integration with Grades System
- Dynamically fetches available grades from the configuration/grades API
- Falls back to static list if grades API is unavailable
- Validates grade values against current grade list

#### 4. Error Handling
Proper HTTP status codes and error messages:
- `400`: Validation errors with detailed field-level messages
- `404`: Resource not found
- `409`: Duplicate mapping attempt
- `500`: Server errors

#### 5. Tenant Scoping
All operations are automatically scoped to the user's tenant:
- Super admins can access all tenants
- Regular users are restricted to their own tenant
- Database queries include tenant filtering

## Usage Examples

### Creating a Mapping
```bash
POST /stock/sku-mappings
Content-Type: application/json

{
  "sku": "APPLE-128-A",
  "conditions": {
    "make": "Apple",
    "storage": "128GB",
    "grade": "AGRA"
  }
}
```

### Listing Mappings
```bash
GET /stock/sku-mappings?page=1&limit=10&search=apple
```

### Resolving SKU from Conditions
```bash
POST /stock/sku-mappings/resolve
Content-Type: application/json

{
  "conditions": {
    "make": "Apple",
    "storage": "128GB",
    "grade": "AGRA"
  }
}
```

## Configuration

### Allowed Property Values
Static property values are defined in `utils.ts`:
- **make**: Apple, Samsung, Google, etc.
- **model_name**: iPhone 11, Galaxy S22, etc.
- **storage**: 32GB, 64GB, 128GB, etc.
- **color**: Black, White, Silver, etc.

These can be modified in the `ALLOWED_PROPERTY_VALUES` constant.

### Grade Integration
The system automatically fetches grades from `/configuration/grades` API. If this fails, it falls back to a static list: `['AGRA', 'BGRA', 'CGRA', 'DGRA']`.

## Database Migration

Run the migration script to create the necessary table and indexes:

```sql
-- See migration.sql for complete script
source backend/src/stock/sku-mappings/migration.sql
```

## Testing

### Unit Tests
The implementation includes:
- Canonical key generation tests
- Validation logic tests
- Error handling tests

### Integration Tests
- CRUD operations
- Duplicate detection
- Tenant scoping
- Grade validation

### Sample Data
The migration includes sample data for testing:
- Apple device mapping: `APPLE-128-A`
- Samsung device mapping: `SAMSUNG-256-B`

## Performance Considerations

### Database Indexes
- Unique index on `(canonical_key, tenant_id)`
- Regular indexes on `sku`, `tenant_id`, and `created_at`
- Consider adding composite indexes for frequent query patterns

### Caching
Future optimization opportunities:
- Cache grade lists to reduce API calls
- Cache validation rules for better performance
- Consider Redis for frequently accessed mappings

### Pagination
All list operations support pagination to handle large datasets efficiently.

## Security

### Authentication
All endpoints require valid authentication via the existing auth system.

### Authorization
- Tenant isolation ensures users can only access their own mappings
- Super admin role can access all tenants
- No special permissions required beyond standard authentication

### Input Validation
- All inputs are validated using Elysia schema validation
- SQL injection protection via parameterized queries
- XSS prevention through proper data handling

## Error Handling

### Validation Errors (400)
```json
{
  "data": null,
  "message": "Validation failed",
  "status": 400,
  "error": [
    {
      "field": "conditions.make",
      "message": "Invalid make value. Allowed values: Apple, Samsung, ...",
      "value": "InvalidMake"
    }
  ]
}
```

### Duplicate Mapping (409)
```json
{
  "data": null,
  "message": "A mapping with these conditions already exists",
  "status": 409,
  "error": "Duplicate mapping rule"
}
```

## Future Enhancements

1. **Batch Operations**: Support for creating/updating multiple mappings
2. **Import/Export**: CSV or JSON bulk operations
3. **Rule Templates**: Pre-defined mapping templates
4. **Advanced Matching**: Regex or pattern-based conditions
5. **Audit Trail**: Track changes to mapping rules
6. **Performance Monitoring**: Add metrics and monitoring

## Troubleshooting

### Common Issues

1. **Migration Fails**: Ensure proper database permissions and existing tenant table
2. **Validation Errors**: Check that property values match allowed lists
3. **Duplicate Errors**: Canonical key collision - verify conditions are truly different
4. **Grade Not Found**: Ensure grades API is accessible and returns valid data

### Debug Tips

1. Enable database query logging to debug repository issues
2. Check tenant_id in all operations for scoping problems
3. Verify canonical key generation with debug logs
4. Test grade API integration separately

## Support

For issues or questions about the SKU Mappings backend:
1. Review this documentation and inline code comments
2. Check the migration script for database setup
3. Test with provided sample data
4. Verify integration with grades system